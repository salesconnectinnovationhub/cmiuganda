import assert from "node:assert/strict";
import test from "node:test";
import { onRequestGet as loadVisitorChat, onRequestPost as saveVisitorChat } from "../../functions/api/chat.js";
import { onRequestGet as loadStaffInbox } from "../../functions/api/chat/admin.js";
import {
    ACCESS_ENV,
    CMS_AUDIENCE,
    createAccessToken,
    mockAccessKeys,
} from "./helpers/cloudflare-access.js";

function makeDatabase({ first = async () => null, all = async () => ({ results: [] }) } = {}) {
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
                    };
                    statements.push(statement);
                    return statement;
                },
            };
        },
        async batch(statementsToRun) {
            batches.push(statementsToRun);
            return [];
        },
    };
}

function visitorRequest(body, origin = "https://cmi.example") {
    return new Request("https://cmi.example/api/chat", {
        method: "POST",
        headers: {
            Origin: origin,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
}

test("chat creates a conversation with a random visitor token and stores only its hash", async (t) => {
    t.mock.method(console, "error", () => {});
    const db = makeDatabase();
    const response = await saveVisitorChat({
        request: visitorRequest({
            name: "Test Visitor",
            email: "visitor@example.com",
            message: "I would like to discuss a home build.",
        }),
        env: { DB: db },
    });

    assert.equal(response.status, 201);
    const result = await response.json();
    assert.match(result.conversation.id, /^[0-9a-f-]{36}$/i);
    assert.match(result.token, /^[A-Za-z0-9_-]{40,64}$/);
    assert.equal(result.staffNotified, false);
    assert.equal(db.batches.length, 1);
    assert.equal(db.batches[0].length, 2);
    assert.equal(db.batches[0][0].values[3].length, 64);
    assert.notEqual(db.batches[0][0].values[3], result.token);
    assert.equal(db.batches[0][1].values[2], "I would like to discuss a home build.");
});

test("chat rejects cross-origin requests and invalid visitor details before writing", async () => {
    const db = makeDatabase();
    const env = { DB: db };
    const crossOrigin = await saveVisitorChat({
        request: visitorRequest({ name: "Visitor", email: "visitor@example.com", message: "Hello" }, "https://other.example"),
        env,
    });
    const invalidEmail = await saveVisitorChat({
        request: visitorRequest({ name: "Visitor", email: "not-an-email", message: "Hello" }),
        env,
    });
    const emptyMessage = await saveVisitorChat({
        request: visitorRequest({ name: "Visitor", email: "visitor@example.com", message: "  " }),
        env,
    });

    assert.equal(crossOrigin.status, 403);
    assert.equal(invalidEmail.status, 400);
    assert.equal(emptyMessage.status, 400);
    assert.equal(db.batches.length, 0);
});

test("visitor conversation reads require the matching bearer token", async () => {
    const db = makeDatabase();
    const response = await loadVisitorChat({
        request: new Request(
            "https://cmi.example/api/chat?conversationId=123e4567-e89b-12d3-a456-426614174000",
            { headers: { Authorization: `Bearer ${"a".repeat(43)}` } },
        ),
        env: { DB: db },
    });

    assert.equal(response.status, 404);
    assert.equal(db.statements.length, 1);
    assert.match(db.statements[0].sql, /visitor_token_hash = \?/);
});

test("chat admin inbox requires an approved Cloudflare Access identity", async (t) => {
    mockAccessKeys(t);
    const db = makeDatabase({
        all: async () => ({ results: [{ id: "123e4567-e89b-12d3-a456-426614174000", status: "open" }] }),
    });
    const denied = await loadStaffInbox({
        request: new Request("https://cmi.example/api/chat/admin"),
        env: { ...ACCESS_ENV, DB: db },
    });
    const allowed = await loadStaffInbox({
        request: new Request("https://cmi.example/api/chat/admin", {
            headers: { Authorization: `Bearer ${createAccessToken("editor@example.com", CMS_AUDIENCE)}` },
        }),
        env: { ...ACCESS_ENV, DB: db },
    });

    assert.equal(denied.status, 403);
    assert.equal(allowed.status, 200);
    assert.equal((await allowed.json()).conversations.length, 1);
});
