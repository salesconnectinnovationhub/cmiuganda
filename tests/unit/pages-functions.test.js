import assert from "node:assert/strict";
import test from "node:test";
import { onRequestPost as saveCmsItem, onRequestPut as updateCmsItem } from "../../functions/api/cms.js";
import { onRequestPost as restoreCmsRevision } from "../../functions/api/cms-revisions.js";
import { onRequestGet as getCmsMedia, onRequestPost as uploadCmsMedia } from "../../functions/api/cms-media.js";
import { onRequestPost as submitContact } from "../../functions/api/contact.js";
import { onRequestPost as submitReviewReply } from "../../functions/api/reviews/reply.js";
import { onRequestGet as getAnalytics, onRequestPost as recordAnalytics } from "../../functions/api/analytics.js";
import {
    ACCESS_ENV,
    CMS_AUDIENCE,
    REVIEWS_AUDIENCE,
    createAccessToken,
    mockAccessKeys,
} from "./helpers/cloudflare-access.js";

function makeDatabase({ first = async () => null, all = async () => ({ results: [] }), run = async () => ({ meta: { changes: 1 } }) } = {}) {
    const batches = [];
    const statements = [];
    return {
        batches,
        statements,
        prepare(sql) {
            return {
                bind(...values) {
                    const statement = {
                        sql,
                        values,
                        first: () => first(sql, values),
                        all: () => all(sql, values),
                        run: () => run(sql, values),
                    };
                    statements.push(statement);
                    return statement;
                },
            };
        },
        async batch(batchStatements) {
            batches.push(batchStatements);
            return [];
        },
    };
}

function cmsItemRequest(method, item, email, id, type = "service") {
    return new Request("https://cmi.example/api/cms", {
        method,
        headers: {
            Origin: "https://cmi.example",
            Authorization: `Bearer ${createAccessToken(email, CMS_AUDIENCE)}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ type, item, ...(id ? { id } : {}) }),
    });
}

function serviceItem(publicationStatus) {
    return {
        slug: "test-service",
        title: "Test service",
        summary: "A service used to test CMS permissions.",
        publicationStatus,
    };
}

test("CMS editors cannot publish, while approvers can publish", async (t) => {
    mockAccessKeys(t);
    const editorDb = makeDatabase({ first: async () => ({ status: "draft" }) });
    const editorEnv = { ...ACCESS_ENV, DB: editorDb };

    const editorCreate = await saveCmsItem({
        request: cmsItemRequest("POST", serviceItem("published"), "editor@example.com"),
        env: editorEnv,
    });
    assert.equal(editorCreate.status, 403);

    const editorPublishDraft = await updateCmsItem({
        request: cmsItemRequest("PUT", serviceItem("published"), "editor@example.com", "service-1"),
        env: editorEnv,
    });
    assert.equal(editorPublishDraft.status, 403);
    assert.equal(editorDb.batches.length, 0);

    const approverDb = makeDatabase();
    const approverCreate = await saveCmsItem({
        request: cmsItemRequest("POST", serviceItem("published"), "approver@example.com"),
        env: { ...ACCESS_ENV, DB: approverDb },
    });
    assert.equal(approverCreate.status, 201);
    assert.equal(approverDb.batches.length, 1);
    assert.equal(approverDb.batches[0].length, 3);
});

test("CMS revision restore restricts published content to approvers and records restoration", async (t) => {
    mockAccessKeys(t);
    const item = { id: "service-1", content_type: "service", slug: "new-slug", title: "Current", payload_json: "{}", status: "draft" };
    const revision = { item_id: "service-1", content_type: "service", slug: "old-slug", title: "Previous", payload_json: '{"summary":"previous copy"}', status: "published" };
    const db = makeDatabase({ first: async (sql) => sql.includes("FROM cms_items") ? item : revision });
    const requestFor = (email) => new Request("https://cmi.example/api/cms-revisions", {
        method: "POST",
        headers: {
            Origin: "https://cmi.example",
            Authorization: `Bearer ${createAccessToken(email, CMS_AUDIENCE)}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ itemId: "service-1", revisionId: 7 }),
    });

    const editorResponse = await restoreCmsRevision({ request: requestFor("editor@example.com"), env: { ...ACCESS_ENV, DB: db } });
    assert.equal(editorResponse.status, 403);
    assert.equal(db.batches.length, 0);

    const approverResponse = await restoreCmsRevision({ request: requestFor("approver@example.com"), env: { ...ACCESS_ENV, DB: db } });
    assert.equal(approverResponse.status, 200);
    assert.deepEqual(await approverResponse.json(), { ok: true, publicationStatus: "published" });
    assert.equal(db.batches.length, 1);
    assert.equal(db.batches[0].length, 3);
    assert.match(db.batches[0][2].sql, /'restore'/);
});

test("public CMS media requests cannot retrieve unpublished files", async () => {
    let bucketReads = 0;
    const db = makeDatabase({ first: async () => null });
    const response = await getCmsMedia({
        request: new Request("https://cmi.example/api/cms-media?key=cms-media/service/123e4567-e89b-12d3-a456-426614174000.jpg"),
        env: {
            ...ACCESS_ENV,
            DB: db,
            CMS_MEDIA_BUCKET: { get: async () => { bucketReads += 1; return null; } },
        },
    });

    assert.equal(response.status, 404);
    assert.equal(bucketReads, 0);
});

test("public CMS media requests can retrieve published files", async () => {
    const db = makeDatabase({ first: async () => ({ visible: 1 }) });
    const response = await getCmsMedia({
        request: new Request("https://cmi.example/api/cms-media?key=cms-media/service/123e4567-e89b-12d3-a456-426614174000.jpg"),
        env: {
            ...ACCESS_ENV,
            DB: db,
            CMS_MEDIA_BUCKET: {
                get: async () => ({ body: new Response("image bytes").body, httpMetadata: { contentType: "image/jpeg" } }),
            },
        },
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/jpeg");
    assert.equal(await response.text(), "image bytes");
});

test("CMS upload rejects an image whose bytes do not match its declared type", async (t) => {
    mockAccessKeys(t);
    const formData = new FormData();
    formData.set("collection", "service");
    formData.set("image", new File([Uint8Array.of(1, 2, 3, 4)], "invalid.png", { type: "image/png" }));
    let storedFiles = 0;
    const response = await uploadCmsMedia({
        request: new Request("https://cmi.example/api/cms-media", {
            method: "POST",
            headers: {
                Origin: "https://cmi.example",
                Authorization: `Bearer ${createAccessToken("editor@example.com", CMS_AUDIENCE)}`,
            },
            body: formData,
        }),
        env: {
            ...ACCESS_ENV,
            CMS_MEDIA_BUCKET: { put: async () => { storedFiles += 1; } },
        },
    });

    assert.equal(response.status, 415);
    assert.equal(storedFiles, 0);
});

function contactRequest() {
    const body = new URLSearchParams({
        firstName: "Test",
        lastName: "Visitor",
        email: "visitor@example.com",
        phone: "+256700000000",
        message: "Please contact me about a project.",
    });
    return new Request("https://cmi.example/api/contact", {
        method: "POST",
        headers: {
            Origin: "https://cmi.example",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
    });
}

test("contact handler returns a safe error when Resend rejects delivery", async (t) => {
    t.mock.method(console, "error", () => {});
    t.mock.method(globalThis, "fetch", async () => new Response("provider failure details", { status: 503 }));
    const response = await submitContact({
        request: contactRequest(),
        env: { RESEND_API_KEY: "test-key", CMI_FROM_EMAIL: "website@example.com" },
    });
    const body = await response.text();

    assert.equal(response.status, 502);
    assert.match(body, /could not send your message/i);
    assert.doesNotMatch(body, /provider failure details/);
});

test("contact handler returns a safe error when Resend is unreachable", async (t) => {
    t.mock.method(console, "error", () => {});
    t.mock.method(globalThis, "fetch", async () => { throw new Error("network details"); });
    const response = await submitContact({
        request: contactRequest(),
        env: { RESEND_API_KEY: "test-key", CMI_FROM_EMAIL: "website@example.com" },
    });

    assert.equal(response.status, 502);
    assert.match(await response.text(), /could not send your message/i);
});

test("only the authorized review administrator can submit a public reply", async (t) => {
    mockAccessKeys(t);
    let writes = 0;
    const db = makeDatabase({ run: async () => { writes += 1; return { meta: { changes: 1 } }; } });
    const requestFor = (email) => new Request("https://cmi.example/api/reviews/reply", {
        method: "POST",
        headers: {
            Origin: "https://cmi.example",
            Authorization: `Bearer ${createAccessToken(email, REVIEWS_AUDIENCE)}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ reviewId: 4, reply: "Thank you for sharing your feedback." }),
    });

    const denied = await submitReviewReply({
        request: requestFor("not-approved@example.com"),
        env: { ...ACCESS_ENV, DB: db },
    });
    assert.equal(denied.status, 403);
    assert.equal(writes, 0);

    const allowed = await submitReviewReply({
        request: requestFor("cmigroupuganda@gmail.com"),
        env: { ...ACCESS_ENV, DB: db },
    });
    assert.equal(allowed.status, 200);
    assert.equal(writes, 1);
});

test("analytics stores only allowlisted aggregate events and public paths", async () => {
    const statements = [];
    const db = {
        prepare(sql) {
            return {
                bind(...values) {
                    statements.push({ sql, values });
                    return { run: async () => ({ success: true }) };
                },
            };
        },
    };
    const response = await recordAnalytics({
        request: new Request("https://cmi.example/api/analytics", {
            method: "POST",
            headers: { Origin: "https://cmi.example", "Content-Type": "application/json" },
            body: JSON.stringify({ event: "contact_submit", path: "/contact.html", email: "must-not-be-stored@example.com" }),
        }),
        env: { DB: db },
    });

    assert.equal(response.status, 204);
    assert.match(statements[0].sql, /ON CONFLICT\(day, event, path\) DO UPDATE SET count = count \+ 1/);
    assert.equal(statements[0].values[1], "contact_submit");
    assert.equal(statements[0].values[2], "/contact.html");
    assert.equal(statements[0].values.length, 3);
});

test("analytics rejects cross-origin, unknown, and query-bearing events", async () => {
    const db = makeDatabase();
    const requestFor = (origin, body) => new Request("https://cmi.example/api/analytics", {
        method: "POST",
        headers: { ...(origin ? { Origin: origin } : {}), "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const env = { DB: db };

    assert.equal((await recordAnalytics({ request: requestFor("https://other.example", { event: "phone_click", path: "/contact.html" }), env })).status, 403);
    assert.equal((await recordAnalytics({ request: requestFor("https://cmi.example", { event: "email_capture", path: "/contact.html" }), env })).status, 400);
    assert.equal((await recordAnalytics({ request: requestFor("https://cmi.example", { event: "phone_click", path: "/contact.html?email=private" }), env })).status, 400);
});

test("only approvers can read analytics and the range is constrained", async (t) => {
    mockAccessKeys(t);
    let queryValues;
    const db = makeDatabase({
        all: async (sql, values) => {
            queryValues = values;
            return { results: [{ day: "2026-11-05", event: "contact_submit", path: "/contact.html", count: 2 }] };
        },
    });
    const requestFor = (email, days) => new Request(`https://cmi.example/api/analytics?days=${days}`, {
        headers: { Authorization: `Bearer ${createAccessToken(email, CMS_AUDIENCE)}` },
    });
    const env = { ...ACCESS_ENV, DB: db };

    assert.equal((await getAnalytics({ request: requestFor("editor@example.com", 7), env })).status, 403);
    const response = await getAnalytics({ request: requestFor("approver@example.com", 999), env });
    assert.equal(response.status, 200);
    assert.deepEqual(queryValues, ["-29 days"]);
    assert.equal((await response.json()).events[0].count, 2);
});

test("homepage CMS content validates local actions and complete project highlights", async (t) => {
    mockAccessKeys(t);
    const homepage = {
        slug: "homepage",
        title: "Homepage content",
        publicationStatus: "published",
        heroTitle: "Build in Uganda",
        heroDescription: "Construction support for diaspora homeowners.",
        primaryCtaText: "Request a consultation",
        primaryCtaUrl: "contact.html#express",
        project1Title: "School exterior",
        project1Location: "Western Uganda",
        project1Summary: "Exterior construction and finishing work.",
        project1Image: "images/enhanced-new/IMG-20261031-WA0045.jpg",
        project1ImageAlt: "Completed school exterior",
    };
    const db = makeDatabase();
    const saved = await saveCmsItem({
        request: cmsItemRequest("POST", homepage, "approver@example.com", undefined, "page"),
        env: { ...ACCESS_ENV, DB: db },
    });
    assert.equal(saved.status, 201);
    assert.equal(db.batches.length, 1);

    const unsafeDb = makeDatabase();
    const unsafe = await saveCmsItem({
        request: cmsItemRequest("POST", { ...homepage, primaryCtaUrl: "javascript:alert(1)" }, "approver@example.com", undefined, "page"),
        env: { ...ACCESS_ENV, DB: unsafeDb },
    });
    assert.equal(unsafe.status, 400);
    assert.equal(unsafeDb.batches.length, 0);

    const partialDb = makeDatabase();
    const partial = await saveCmsItem({
        request: cmsItemRequest("POST", { ...homepage, project1Image: "" }, "approver@example.com", undefined, "page"),
        env: { ...ACCESS_ENV, DB: partialDb },
    });
    assert.equal(partial.status, 400);
    assert.equal(partialDb.batches.length, 0);
});