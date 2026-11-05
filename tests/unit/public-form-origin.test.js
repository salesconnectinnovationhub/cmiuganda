import assert from "node:assert/strict";
import test from "node:test";
import { readFormData } from "../../functions/_shared/email.js";

function makeRequest(origin) {
    const headers = { "content-type": "application/x-www-form-urlencoded" };
    if (origin !== undefined) headers.origin = origin;
    return new Request("https://cmi.example/api/contact", {
        method: "POST",
        headers,
        body: "firstName=Test&lastName=Visitor",
    });
}

test("rejects form posts without an Origin header", async () => {
    const result = await readFormData(makeRequest(undefined));

    assert.equal(result.error.status, 403);
});

test("rejects form posts from a different origin", async () => {
    const result = await readFormData(makeRequest("https://attacker.example"));

    assert.equal(result.error.status, 403);
});

test("accepts same-origin form posts", async () => {
    const result = await readFormData(makeRequest("https://cmi.example"));

    assert.equal(result.error, undefined);
    assert.equal(result.formData.get("firstName"), "Test");
});