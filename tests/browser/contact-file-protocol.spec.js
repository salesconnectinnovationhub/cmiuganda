import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

test("contact form from a local file offers an email fallback when Netlify is unavailable", async ({ page }) => {
    let apiRequests = 0;
    page.on("request", (request) => {
        if (/\/api\/(contact|interest)$/.test(request.url())) apiRequests += 1;
    });

    await page.goto(pathToFileURL(resolve("contact.html")).href);
    await page.locator("#contact-first-name").fill("Test");
    await page.locator("#contact-last-name").fill("Visitor");
    await page.locator("#contact-email").fill("visitor@example.com");
    await page.locator("#contact-phone").fill("+256700000000");
    await page.locator("#contact-message").fill("I would like to discuss a project.");
    await page.getByRole("button", { name: "Send message" }).click();

    const status = page.locator("#contact-form .form-submit-status");
    await expect(status).toContainText("We could not submit your enquiry");
    const emailLink = status.getByRole("link", { name: "Email CMI Group directly" });
    await expect(emailLink).toHaveAttribute("href", /^mailto:cmi\.groupuganda@gmail\.com/);
    expect(decodeURIComponent(await emailLink.getAttribute("href"))).toContain("I would like to discuss a project.");
    expect(decodeURIComponent(await emailLink.getAttribute("href"))).toContain("visitor@example.com");
    await expect(page.locator("#contact-message")).toHaveValue("I would like to discuss a project.");
    expect(apiRequests).toBe(0);
});

test("homepage enquiry from a local file offers an email fallback when Netlify is unavailable", async ({ page }) => {
    let apiRequests = 0;
    page.on("request", (request) => {
        if (/\/api\/contact$/.test(request.url())) apiRequests += 1;
    });

    await page.goto(pathToFileURL(resolve("index.html")).href);
    await page.locator("#home-enquiry [name='firstName']").fill("Test");
    await page.locator("#home-enquiry [name='lastName']").fill("Visitor");
    await page.locator("#home-enquiry [name='email']").fill("visitor@example.com");
    await page.locator("#home-enquiry [name='phone']").fill("+256700000000");
    await page.locator("#home-enquiry [name='message']").fill("I would like to discuss a project.");
    await page.locator("#home-enquiry [type='submit']").click();

    const status = page.locator("#home-enquiry .form-submit-status");
    await expect(status).toContainText("We could not submit your enquiry");
    const emailLink = status.getByRole("link", { name: "Email CMI Group directly" });
    await expect(emailLink).toHaveAttribute("href", /^mailto:cmi\.groupuganda@gmail\.com/);
    expect(decodeURIComponent(await emailLink.getAttribute("href"))).toContain("I would like to discuss a project.");
    expect(decodeURIComponent(await emailLink.getAttribute("href"))).toContain("visitor@example.com");
    await expect(page.locator("#home-enquiry [name='message']")).toHaveValue("I would like to discuss a project.");
    expect(apiRequests).toBe(0);
});
