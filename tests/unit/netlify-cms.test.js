import assert from "node:assert/strict";
import test from "node:test";

test("Netlify public CMS endpoint returns an empty list for supported content types", async () => {
  const { default: cms } = await import("../../netlify/functions/cms.mjs");
  for (const type of ["settings", "promotion", "service"]) {
    const response = await cms(new Request(`https://example.test/api/cms?type=${type}`));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { items: [] });
  }
});

test("Netlify public CMS endpoint rejects unsupported types and write requests", async () => {
  const { default: cms } = await import("../../netlify/functions/cms.mjs");
  const unsupported = await cms(new Request("https://example.test/api/cms?type=unknown"));
  const write = await cms(new Request("https://example.test/api/cms?type=settings", { method: "POST" }));

  assert.equal(unsupported.status, 400);
  assert.equal(write.status, 405);
});
