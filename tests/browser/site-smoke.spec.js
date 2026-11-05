import { expect, test } from "@playwright/test";

const publishedProperty = {
    id: "property-1",
    type: "property",
    slug: "sample-property",
    title: "Sample property",
    publicationStatus: "published",
    location: "Kampala",
    price: "UGX 100,000,000",
    status: "Available",
    summary: "A sample listing for the browser smoke test.",
    features: [],
    images: [],
};

async function mockCmsApi(page, getRole) {
    await page.route(/\/api\/cms\?type=property$/, async (route) => {
        await route.fulfill({
            contentType: "application/json",
            body: JSON.stringify({ items: [publishedProperty], isAdmin: true, role: getRole() }),
        });
    });
    await page.route("**/api/cms-revisions**", async (route) => {
        await route.fulfill({
            contentType: "application/json",
            body: JSON.stringify({ revisions: [] }),
        });
    });
}

test("estimate quote handoff prefills the contact message", async ({ page }) => {
    await page.goto("/block-estimator.html", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Wall length (m)").fill("5");
    await page.getByLabel("Wall height (m)").fill("3");
    await page.getByRole("button", { name: /Add opening/ }).click();
    await page.getByLabel("Width (m)").fill("0.9");
    await page.getByRole("spinbutton", { name: "Height (m)", exact: true }).fill("2");
    await page.getByLabel("Number of same-size openings").fill("1");
    await page.getByRole("button", { name: /Calculate quantity/ }).click();

    await expect(page.locator("#result-units")).toContainText("161");
    await page.locator("#quote-request-link").click();
    await expect(page).toHaveURL(/contact\.html#contact-form$/);
    await expect(page.locator("#estimate-prefill-status")).toContainText("estimate has been added");
    await expect(page.locator("#message")).toHaveValue(/Estimated quantity: 161 concrete blocks/);
    await expect(page.locator("#message")).toHaveValue(/Net wall area after openings: 13\.2 m2/);
});

test("CMS editor and approver controls match their assigned roles", async ({ page }) => {
    let role = "editor";
    await mockCmsApi(page, () => role);
    await page.goto("/admin/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#cms-status")).toContainText("Editor access verified");
    await expect(page.getByRole("button", { name: /Sample property/ })).toBeDisabled();

    await page.getByRole("button", { name: "Create new" }).dispatchEvent("click");
    await expect(page.locator("#save-draft")).toBeVisible();
    await expect(page.locator("#publish-content")).toBeHidden();
    await expect(page.locator("#archive-item")).toBeHidden();
    await expect(page.locator("#editor-help")).toContainText("Editors can save drafts only");

    role = "approver";
    await page.goto("/admin/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#cms-status")).toContainText("Approver access verified");
    await page.getByRole("button", { name: /Sample property/ }).dispatchEvent("click");

    await expect(page.locator("#publish-content")).toBeVisible();
    await expect(page.locator("#archive-item")).toBeVisible();
    await expect(page.locator("#save-draft")).toBeVisible();
});