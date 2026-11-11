import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

test("contact form explains why local-file submissions cannot be sent", async ({ page }) => {
    let contactRequests = 0;
    page.on("request", (request) => {
        if (/\/api\/(contact|interest)$/.test(request.url())) contactRequests += 1;
    });

    await page.goto(pathToFileURL(resolve("contact.html")).href);
    await page.locator("#contact-first-name").fill("Test");
    await page.locator("#contact-last-name").fill("Visitor");
    await page.locator("#contact-email").fill("visitor@example.com");
    await page.locator("#contact-phone").fill("+256700000000");
    await page.locator("#contact-message").fill("I would like to discuss a project.");
    await page.getByRole("button", { name: "Send message" }).click();

    await expect(page.locator("#contact-form .form-submit-status"))
        .toContainText("unavailable when this page is opened as a local file");
    expect(contactRequests).toBe(0);
});

test("project enquiry form explains why local-file submissions cannot be sent", async ({ page }) => {
    let contactRequests = 0;
    page.on("request", (request) => {
        if (/\/api\/contact$/.test(request.url())) contactRequests += 1;
    });

    await page.goto(pathToFileURL(resolve("index.html")).href);
    await page.locator("#home-enquiry [name='firstName']").fill("Test");
    await page.locator("#home-enquiry [name='lastName']").fill("Visitor");
    await page.locator("#home-enquiry [name='email']").fill("visitor@example.com");
    await page.locator("#home-enquiry [name='phone']").fill("+256700000000");
    await page.locator("#home-enquiry [name='message']").fill("I would like to discuss a project.");
    await page.locator("#home-enquiry [type='submit']").click();

    await expect(page.locator("#home-enquiry .form-submit-status"))
        .toContainText("unavailable when this page is opened as a local file");
    expect(contactRequests).toBe(0);
});
