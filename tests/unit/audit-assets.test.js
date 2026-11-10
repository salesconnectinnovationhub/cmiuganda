import assert from "node:assert/strict";
import test from "node:test";
import { extractAssetReferences } from "../../scripts/audit-assets.js";

test("asset audit recognizes root-relative media references", () => {
    const references = extractAssetReferences(
        '<img src="images/project.jpg"><img src="/teamimages/person.png">',
        "index.html",
    );

    assert.deepEqual([...references].sort(), ["images/project.jpg", "teamimages/person.png"]);
});

test("asset audit resolves references relative to nested source files", () => {
    const references = extractAssetReferences(
        '<link href="../assets/img/logo/logo.png">',
        "admin/index.html",
    );

    assert.deepEqual([...references], ["assets/img/logo/logo.png"]);
});

test("asset audit recognizes CSS URLs and srcset entries", () => {
    const references = extractAssetReferences(
        'background-image: url("../../images/bg.webp"); srcset="images/small.jpg 1x, images/large.jpg 2x"',
        "assets/css/site.css",
    );

    assert.deepEqual(
        [...references].sort(),
        ["images/bg.webp", "images/large.jpg", "images/small.jpg"],
    );
});
