import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const web3FormsEndpoint = "https://api.web3forms.com/submit";
const web3FormsAccessKey = "59457e34-e78d-40c5-87eb-0b5e008db3ac";

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

async function mockEmailEndpoint(page, formName, { status = 200, success = true, message = "" } = {}) {
    let submittedData;
    await page.route(web3FormsEndpoint, async (route) => {
        if (route.request().method() !== "POST") {
            await route.continue();
            return;
        }

        const request = route.request();
        const formRequest = new Request(request.url(), {
            method: request.method(),
            headers: request.headers(),
            body: request.postDataBuffer(),
        });
        submittedData = await formRequest.formData();
        expect(submittedData.get("form-name")).toBe(formName);
        expect(submittedData.get("access_key")).toBe(web3FormsAccessKey);
        await route.fulfill({
            status,
            contentType: "application/json",
            body: JSON.stringify({ success, message }),
        });
    });
    return () => submittedData;
}

async function dismissAnnouncement(page) {
    await page.evaluate(() => {
        localStorage.setItem("cmi-promotion-dismissed-default-advert-campaign", String(Date.now()));
    });
    const closeButton = page.getByRole("button", { name: "Close announcement" });
    if (await closeButton.isVisible()) await closeButton.click();
}

test("estimate quote handoff prefills the contact message", async ({ page }) => {
    const getSubmission = await mockEmailEndpoint(page, "contact-enquiry");
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
    await dismissAnnouncement(page);
    await expect(page.locator("#estimate-prefill-status")).toContainText("estimate has been added");
    await expect(page.locator("#contact-message")).toHaveValue(/Estimated quantity: 161 concrete blocks/);
    await expect(page.locator("#contact-message")).toHaveValue(/Net wall area after openings: 13\.2 m2/);

    await page.locator("#contact-first-name").fill("Quote");
    await page.locator("#contact-last-name").fill("Visitor");
    await page.locator("#contact-email").fill("visitor@example.com");
    await page.locator("#contact-phone").fill("+256700000000");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.locator("#contact-form .form-submit-status")).toContainText("Your enquiry was sent to CMI Group.");
    expect(getSubmission().get("message")).toContain("Estimated quantity: 161 concrete blocks");
    expect(getSubmission().get("message")).toContain("Net wall area after openings: 13.2 m2");
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

test("homepage embeds the CMI Group project video feed without a click", async ({ page }) => {
    await page.route("https://www.youtube-nocookie.com/**", (route) => route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><title>YouTube embed mock</title>",
    }));
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const recentVideo = page.locator("#youtube-videos iframe").nth(0);
    await expect(recentVideo).toHaveAttribute("title", "Recently published CMI Group videos");
    await expect(recentVideo).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/videoseries?list=UUhS7w2_gNGsj61jGtMxkywA");
    const popularVideo = page.locator("#youtube-videos iframe").nth(1);
    await expect(popularVideo).toHaveAttribute("title", "Most-viewed CMI Group video: Diaspora Ugandans building back home");
    await expect(popularVideo).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/ti6fqpmF1aY");
    await expect(page.locator(".testimonial-area").locator("xpath=following-sibling::section[@id='youtube-videos']")).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Visit the CMI Group YouTube channel" })).toHaveAttribute("href", "https://youtube.com/@cmigroupconstruct?si=PhzkGZjLEsvlL72j");
    await expect(page.getByRole("heading", { name: "Local delivery. Clear decisions. Confidence from anywhere." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "How We Work" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Policies" })).toHaveAttribute("href", "policies.html");
    await expect(page.getByRole("link", { name: "Explore Project Management" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Meet Our Engineers" })).toBeVisible();
    await expect(page.getByRole("link", { name: "See Our Quality Standards" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Learn About CMI Group" })).toBeVisible();
});

test("contact form sends its fields through Web3Forms", async ({ page }) => {
    const getSubmission = await mockEmailEndpoint(page, "contact-enquiry");
    const formRequests = [];
    page.on("request", (request) => {
        if (request.url() === web3FormsEndpoint) formRequests.push(request.url());
    });
    await page.goto("/contact.html", { waitUntil: "domcontentloaded" });
    await dismissAnnouncement(page);
    await expect(page.getByRole("heading", { name: "Office locations in Uganda" })).toBeVisible();
    await expect(page.locator(".office-location-card iframe")).toHaveCount(2);
    await expect(page.getByRole("link", { name: "Policies" })).toHaveAttribute("href", "policies.html");
    await expect(page.locator(".contact-direct-options a i")).toHaveClass(/fa-whatsapp/);
    await page.locator("#contact-first-name").fill("Test");
    await page.locator("#contact-last-name").fill("Visitor");
    await page.locator("#contact-email").fill("visitor@example.com");
    await page.locator("#contact-phone").fill("+256700000000");
    await page.locator("#contact-message").fill("I would like to discuss a building project.");
    await page.getByRole("button", { name: "Send message" }).click();

    const status = page.locator("#contact-form .form-submit-status");
    await expect(status).toContainText("Your enquiry was sent to CMI Group.");
    await expect(status).toContainText("Your message: I would like to discuss a building project.");
    const whatsappLink = status.getByRole("link", { name: "message CMI Group on WhatsApp" });
    await expect(whatsappLink).toHaveAttribute("href", "https://wa.me/message/DYT6JQFKYJNLF1");
    await expect(whatsappLink).toHaveAttribute("target", "_blank");
    await expect(whatsappLink.locator("i")).toHaveClass(/fa-whatsapp/);
    expect(getSubmission().get("firstName")).toBe("Test");
    expect(getSubmission().get("lastName")).toBe("Visitor");
    expect(getSubmission().get("email")).toBe("visitor@example.com");
    expect(getSubmission().get("message")).toBe("I would like to discuss a building project.");
    expect(getSubmission().get("name")).toBe("Test Visitor");
    expect(getSubmission().get("replyto")).toBe("visitor@example.com");
    expect(getSubmission().get("subject")).toBe("Contact page enquiry");
    await expect(page.locator("#contact-message")).toHaveValue("");
    expect(page.url()).toContain("/contact.html");
    expect(formRequests).toEqual([web3FormsEndpoint]);
});

test("contact form keeps details and offers an email fallback when Web3Forms fails", async ({ page }) => {
    await mockEmailEndpoint(page, "contact-enquiry", {
        status: 503,
        success: false,
        message: "We could not send your message just now. Please try again.",
    });
    await page.goto("/contact.html", { waitUntil: "domcontentloaded" });
    await dismissAnnouncement(page);
    await page.locator("#contact-first-name").fill("Test");
    await page.locator("#contact-last-name").fill("Visitor");
    await page.locator("#contact-email").fill("visitor@example.com");
    await page.locator("#contact-phone").fill("+256700000000");
    await page.locator("#contact-message").fill("Please call me about a project.");
    await page.getByRole("button", { name: "Send message" }).click();

    const form = page.locator("#contact-form");
    const status = form.locator(".form-submit-status");
    await expect(status).toContainText("We could not send your message just now.");
    const fallbackLink = status.getByRole("link", { name: "Email CMI Group directly" });
    expect(decodeURIComponent(await fallbackLink.getAttribute("href"))).toContain("Please call me about a project.");
    await expect(page.locator("#contact-message")).toHaveValue("Please call me about a project.");
    await expect(form.getByRole("button", { name: "Send message" })).toBeEnabled();
    expect(page.url()).toContain("/contact.html");
});

test("contact form does not treat an unsuccessful Web3Forms response as sent", async ({ page }) => {
    await mockEmailEndpoint(page, "contact-enquiry", {
        success: false,
        message: "Access key is invalid.",
    });
    await page.goto("/contact.html", { waitUntil: "domcontentloaded" });
    await dismissAnnouncement(page);
    await page.locator("#contact-first-name").fill("Test");
    await page.locator("#contact-last-name").fill("Visitor");
    await page.locator("#contact-email").fill("visitor@example.com");
    await page.locator("#contact-phone").fill("+256700000000");
    await page.locator("#contact-message").fill("Please call me about a project.");
    await page.getByRole("button", { name: "Send message" }).click();

    const form = page.locator("#contact-form");
    const status = form.locator(".form-submit-status");
    await expect(status).toContainText("Access key is invalid.");
    await expect(status.getByRole("link", { name: "Email CMI Group directly" })).toBeVisible();
    await expect(page.locator("#contact-message")).toHaveValue("Please call me about a project.");
});

test("public enquiry forms point to the matching email endpoints", async ({ page }) => {
    const forms = [
        ["/", "#home-enquiry", "home-enquiry"],
        ["/services.html", "#service-enquiry-form", "service-enquiry"],
        ["/project.html", "#project-enquiry-form", "project-enquiry"],
        ["/property-management.html", "#property-enquiry-form", "property-enquiry"],
        ["/contact.html#contact-form", "#contact-form", "contact-enquiry"],
        ["/contact.html#express", ".interestForm", "project-interest"],
    ];
    for (const [path, selector, name] of forms) {
        await page.goto(path, { waitUntil: "domcontentloaded" });
        const form = page.locator(selector);
        await expect(form).toBeVisible();
        await expect(form).toHaveAttribute("action", web3FormsEndpoint);
        await expect(form).toHaveAttribute("name", name);
        await expect(form.locator('[name="form-name"]')).toHaveValue(name);
        await expect(form.locator('[name="access_key"]')).toHaveValue(web3FormsAccessKey);
        const honeypot = form.locator('input[type="checkbox"][name="botcheck"]');
        await expect(honeypot).toHaveCount(1);
        await expect(honeypot).not.toBeChecked();
    }

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Local delivery. Clear decisions. Confidence from anywhere." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Get a project estimate" })).toHaveAttribute("href", "block-estimator.html");
    await expect(page.getByRole("link", { name: "Book a site visit" })).toHaveAttribute("href", "#home-enquiry");
});

test("home, project, and property consultation forms send email", async ({ page }) => {
    const forms = [
        ["/", "#home-enquiry", "home-enquiry"],
        ["/project.html", "#project-enquiry-form", "project-enquiry"],
        ["/property-management.html", "#property-enquiry-form", "property-enquiry"],
    ];

    for (const [path, selector, name] of forms) {
        const getSubmission = await mockEmailEndpoint(page, name);
        await page.goto(path, { waitUntil: "domcontentloaded" });
        await dismissAnnouncement(page);

        const form = page.locator(selector);
        await form.locator('[name="firstName"]').fill("Test");
        await form.locator('[name="lastName"]').fill("Visitor");
        await form.locator('[name="email"]').fill("visitor@example.com");
        await form.locator('[name="phone"]').fill("+256700000000");
        await form.locator('[name="message"]').fill("I would like to discuss a project.");
        await form.locator('[type="submit"]').click();

        await expect(form.locator(".form-submit-status")).toContainText("Your enquiry was sent to CMI Group.");
        expect(getSubmission().get("form-name")).toBe(name);
        expect(getSubmission().get("message")).toBe("I would like to discuss a project.");
    }
});

test("embedded project enquiry form sends email", async ({ page }) => {
    const getSubmission = await mockEmailEndpoint(page, "service-enquiry");
    await page.goto("/services.html", { waitUntil: "domcontentloaded" });
    await dismissAnnouncement(page);
    await page.locator("#service-first-name").fill("Test");
    await page.locator("#service-last-name").fill("Visitor");
    await page.locator("#service-email").fill("visitor@example.com");
    await page.locator("#service-phone").fill("+256700000000");
    await page.locator("#service-message").fill("I would like to discuss a building project in Kampala.");
    await page.locator("#service-enquiry-form").getByRole("button", { name: "Request a project consultation" }).click();

    const status = page.locator("#service-enquiry-form .form-submit-status");
    await expect(status).toContainText("Your enquiry was sent to CMI Group.");
    await expect(status).toContainText("Your message: I would like to discuss a building project in Kampala.");
    expect(getSubmission().get("message")).toContain("I would like to discuss a building project in Kampala.");
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
    const previewButton = page.getByRole("button", { name: "Preview website", exact: true });
    await expect(previewButton).toBeVisible();
    await previewButton.click();
    await expect(page.locator("#preview-dialog")).toBeVisible();
    await expect(page.locator("#preview-dialog-content h2")).toHaveText("<img src=x onerror=alert(1)>");
});

test("mobile navigation supports keyboard open, escape, and focus return", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const openButton = page.getByRole("button", { name: "Open navigation" });
    await openButton.click();
    await expect(openButton).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("button", { name: "Close navigation" })).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.locator("#mobile-menu")).toContainText("Services");
    await page.keyboard.press("Escape");
    await expect(openButton).toHaveAttribute("aria-expanded", "false");
    await expect(openButton).toBeFocused();
});

test("mobile contact flow switches forms and sends the enquiry by email", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockEmailEndpoint(page, "contact-enquiry");
    await page.goto("/contact.html", { waitUntil: "domcontentloaded" });
    await dismissAnnouncement(page);
    await page.getByRole("button", { name: "Detailed project interest" }).click();
    await expect(page.locator("#interest-form-panel")).toBeVisible();
    await page.getByRole("button", { name: "General enquiry" }).click();
    await expect(page.locator("#contact-form-panel")).toBeVisible();
    await expect(page.getByLabel("Project or question")).toBeVisible();

    await page.locator("#contact-first-name").fill("Mobile");
    await page.locator("#contact-last-name").fill("Visitor");
    await page.locator("#contact-email").fill("visitor@example.com");
    await page.locator("#contact-phone").fill("+256700000000");
    await page.locator("#contact-message").fill("I would like to discuss a project.");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.locator("#contact-form .form-submit-status")).toContainText("Your enquiry was sent to CMI Group.");
    expect(page.url()).toContain("/contact.html");
});

test("detailed interest form sends selected services by email", async ({ page }) => {
    const getSubmission = await mockEmailEndpoint(page, "project-interest");
    await page.goto("/contact.html#express", { waitUntil: "domcontentloaded" });
    await dismissAnnouncement(page);
    await page.getByLabel("Full name").fill("Test Visitor");
    await page.getByLabel("Email address").nth(1).fill("visitor@example.com");
    await page.getByLabel("Phone number").nth(1).fill("+256700000000");
    await page.getByLabel("Current address").fill("Kampala");
    await page.getByLabel("Country code").fill("+256");
    await page.getByLabel("WhatsApp number").fill("+256700000000");
    await page.getByLabel("Mobile phone").fill("+256700000000");
    await page.getByLabel("Home phone").fill("+256700000000");
    await page.getByLabel("Home country").fill("Uganda");
    await page.getByLabel("Home district/city").fill("Kampala");
    await page.getByLabel("Project country").fill("Uganda");
    await page.getByLabel("Build a residential house").check();
    await page.getByRole("button", { name: "Submit interest" }).click();

    const status = page.locator(".interestForm .form-submit-status");
    await expect(status).toContainText("Your enquiry was sent to CMI Group.");
    await expect(status).toContainText("Selected services: Build a residential house");
    await expect(status.getByRole("link", { name: "message CMI Group on WhatsApp" }))
        .toHaveAttribute("href", "https://wa.me/message/DYT6JQFKYJNLF1");
    expect(getSubmission().get("fullname")).toBe("Test Visitor");
    expect(getSubmission().get("name")).toBe("Test Visitor");
    expect(getSubmission().get("message")).toContain("Build a residential house: on");
    expect(getSubmission().get("buildResidentialHouse")).toBe("on");
    expect(page.url()).toContain("/contact.html#express");
});

test("quotation CTAs open the detailed contact form", async ({ page }) => {
    await page.goto("/contact.html#express", { waitUntil: "domcontentloaded" });

    await expect(page.locator("#interest-form-panel")).toBeVisible();
    await expect(page.locator("#contact-form-panel")).toBeHidden();
});

test("mobile payment form labels fields and begins PesaPal checkout", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
        window.open = (url) => {
            window.__openedCheckoutUrl = url;
            return null;
        };
    });
    await page.route("**/api/analytics", async (route) => route.fulfill({ status: 204, body: "" }));
    await page.goto("/payments.html", { waitUntil: "domcontentloaded" });
    await expect(page.getByLabel("Full name")).toBeVisible();
    await expect(page.getByLabel("Currency")).toBeVisible();
    await expect(page.getByLabel("Payment reason")).toBeVisible();
    await page.getByLabel("Full name").fill("Mobile Visitor");
    await page.getByLabel("Email address").fill("visitor@example.com");
    await page.getByLabel("Phone number").fill("+256700000000");
    await page.getByLabel("Amount").fill("10000");
    await page.getByLabel("Project or reference").fill("Mobile test payment");
    await page.getByLabel("Payment reason").fill("Test checkout start");
    await page.getByRole("button", { name: "Continue to PesaPal" }).click();
    await expect(page.locator("#payment-status")).toContainText("Opening the secure PesaPal checkout");
    expect(await page.evaluate(() => window.__openedCheckoutUrl)).toContain("https://www.pesapal.com/");
});

test("mobile gallery opens and closes project photos by keyboard", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/gallery.html", { waitUntil: "domcontentloaded" });
    const firstPhoto = page.locator("#projects-container a.popup-image").first();
    await expect(firstPhoto).toBeVisible();
    await firstPhoto.click();
    await expect(page.locator(".mfp-wrap")).toBeVisible();
    await expect(page.locator(".mfp-img")).toHaveAttribute("alt", /community water project/i);
    await page.keyboard.press("Escape");
    await expect(page.locator(".mfp-wrap")).toHaveCount(0);
});

for (const [pageName, pagePath] of [
    ["homepage", "/"],
    ["contact", "/contact.html"],
    ["payments", "/payments.html"],
    ["gallery", "/gallery.html"],
]) {
    test(`${pageName} page has no WCAG A/AA axe violations`, async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(pagePath, { waitUntil: "domcontentloaded" });
        const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
            .analyze();
        const violations = results.violations.map((violation) =>
            `${violation.id}: ${violation.nodes.map((node) => node.target.join(", ")).join("; ")}`
        );
        expect(violations, violations.join("\n")).toEqual([]);
    });
}