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

test("published homepage CMS content updates hero and project highlights", async ({ page }) => {
    await page.route(/\/api\/cms\?type=page$/, async (route) => {
        await route.fulfill({
            contentType: "application/json",
            body: JSON.stringify({
                items: [{
                    slug: "homepage",
                    title: "Homepage content",
                    publicationStatus: "published",
                    heroTitle: "CMS-managed Uganda build headline",
                    heroDescription: "Approved homepage introduction for visitors.",
                    primaryCtaText: "Talk to CMI",
                    primaryCtaUrl: "contact.html#express",
                    project1Title: "CMS project highlight",
                    project1Location: "Fort Portal",
                    project1Summary: "Approved project caption.",
                    project1Image: "images/enhanced-new/IMG-20261031-WA0045.jpg",
                    project1ImageAlt: "School exterior in Fort Portal",
                }],
            }),
        });
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.locator("#home-hero-title")).toHaveText("CMS-managed Uganda build headline");
    await expect(page.locator("#home-primary-cta")).toHaveText("Talk to CMI");
    await expect(page.locator("#home-primary-cta")).toHaveAttribute("href", "contact.html#express");
    const firstSlide = page.locator('.home-project-slide:not(.slick-cloned)[data-slick-index="0"]');
    await expect(firstSlide.locator("img")).toHaveAttribute("alt", "School exterior in Fort Portal");
    await expect(firstSlide.locator("h3")).toHaveText("CMS project highlight");
});

test("contact conversion is recorded only after the API accepts the form", async ({ page }) => {
    const analyticsEvents = [];
    await page.route("**/api/contact", async (route) => {
        await route.fulfill({ status: 200, contentType: "text/plain", body: "Message accepted." });
    });
    await page.route("**/api/analytics", async (route) => {
        analyticsEvents.push(route.request().postDataJSON());
        await route.fulfill({ status: 204, body: "" });
    });
    await page.goto("/contact.html", { waitUntil: "domcontentloaded" });
    await page.locator("#contact-first-name").fill("Test");
    await page.locator("#contact-last-name").fill("Visitor");
    await page.locator("#contact-email").fill("visitor@example.com");
    await page.locator("#contact-phone").fill("+256700000000");
    await page.locator("#contact-message").fill("I would like to discuss a building project.");
    await page.getByRole("button", { name: "Send message" }).click();

    await expect(page.locator("#contact-form .form-submit-status")).toHaveText("Message accepted.");
    await expect.poll(() => analyticsEvents.some((event) => event.event === "contact_submit" && event.path === "/contact.html")).toBe(true);
});

test("homepage CMS preview renders text as content rather than markup", async ({ page }) => {
    await mockCmsApi(page, () => "approver");
    await page.route(/\/api\/cms\?type=page$/, async (route) => {
        await route.fulfill({
            contentType: "application/json",
            body: JSON.stringify({ items: [], isAdmin: true, role: "approver" }),
        });
    });
    await page.goto("/admin/", { waitUntil: "domcontentloaded" });
    await page.locator("#content-type").selectOption("page");
    await page.getByRole("button", { name: "Create new" }).click();
    await page.getByLabel("Main headline").fill("<img src=x onerror=alert(1)>");

    await expect(page.locator("#content-preview h2")).toHaveText("<img src=x onerror=alert(1)>");
    await expect(page.locator("#content-preview img")).toHaveCount(0);
    await page.getByRole("button", { name: "Preview", exact: true }).click();
    await expect(page.locator("#preview-dialog")).toBeVisible();
    await expect(page.locator("#preview-dialog-content h2")).toHaveText("<img src=x onerror=alert(1)>");
});