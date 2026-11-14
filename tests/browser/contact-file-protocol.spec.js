import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const web3FormsEndpoint = "https://api.web3forms.com/submit";

async function mockWeb3FormsFailure(page) {
    await page.route(web3FormsEndpoint, async (route) => {
        await route.fulfill({
            status: 503,
            contentType: "application/json",
            headers: { "access-control-allow-origin": "*" },
            body: JSON.stringify({ success: false, message: "Test email service unavailable." }),
        });
    });
}

test("contact form from a local file offers an email fallback when Web3Forms is unavailable", async ({ page }) => {
    await mockWeb3FormsFailure(page);
    await page.goto(pathToFileURL(resolve("contact.html")).href);
    await page.locator("#contact-first-name").fill("Test");
    await page.locator("#contact-last-name").fill("Visitor");
    await page.locator("#contact-email").fill("visitor@example.com");
    await page.locator("#contact-phone").fill("+256700000000");
    await page.locator("#contact-message").fill("I would like to discuss a project.");
    await page.getByRole("button", { name: "Send message" }).click();

    const status = page.locator("#contact-form .form-submit-status");
    await expect(status).toContainText("We could not send your enquiry just now.");
    const emailLink = status.getByRole("link", { name: "Email CMI Group directly" });
    await expect(emailLink).toHaveAttribute("href", /^mailto:cmi\.groupuganda@gmail\.com/);
    expect(decodeURIComponent(await emailLink.getAttribute("href"))).toContain("I would like to discuss a project.");
    expect(decodeURIComponent(await emailLink.getAttribute("href"))).toContain("visitor@example.com");
    await expect(page.locator("#contact-message")).toHaveValue("I would like to discuss a project.");
});

test("homepage enquiry from a local file offers an email fallback when Web3Forms is unavailable", async ({ page }) => {
    await mockWeb3FormsFailure(page);
    await page.goto(pathToFileURL(resolve("index.html")).href);
    await page.locator("#home-enquiry [name='firstName']").fill("Test");
    await page.locator("#home-enquiry [name='lastName']").fill("Visitor");
    await page.locator("#home-enquiry [name='email']").fill("visitor@example.com");
    await page.locator("#home-enquiry [name='phone']").fill("+256700000000");
    await page.locator("#home-enquiry [name='message']").fill("I would like to discuss a project.");
    await page.locator("#home-enquiry [type='submit']").click();

    const status = page.locator("#home-enquiry .form-submit-status");
    await expect(status).toContainText("We could not send your enquiry just now.");
    const emailLink = status.getByRole("link", { name: "Email CMI Group directly" });
    await expect(emailLink).toHaveAttribute("href", /^mailto:cmi\.groupuganda@gmail\.com/);
    expect(decodeURIComponent(await emailLink.getAttribute("href"))).toContain("I would like to discuss a project.");
    expect(decodeURIComponent(await emailLink.getAttribute("href"))).toContain("visitor@example.com");
    await expect(page.locator("#home-enquiry [name='message']")).toHaveValue("I would like to discuss a project.");
});
