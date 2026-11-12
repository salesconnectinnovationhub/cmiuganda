import assert from "node:assert/strict";
import test from "node:test";
import { onRequestPost as submitContact } from "../../functions/api/contact.js";
import { onRequestPost as submitInterest } from "../../functions/api/interest.js";
import netlifyContact, { config as netlifyContactConfig } from "../../netlify/functions/contact.mjs";
import netlifyInterest, { config as netlifyInterestConfig } from "../../netlify/functions/interest.mjs";

const CMI_CONTACT_EMAIL = "cmi.groupuganda@gmail.com";
const EMAIL_ENV = { RESEND_API_KEY: "test-key", CMI_FROM_EMAIL: "website@example.com" };

function mockEmailDelivery(t) {
  let message;
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    message = JSON.parse(options.body);
    return new Response(null, { status: 200 });
  });
  return () => message;
}

function formRequest(path, fields) {
  return new Request(`https://cmi.example/api/${path}`, {
    method: "POST",
    headers: {
      Origin: "https://cmi.example",
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "text/plain",
    },
    body: new URLSearchParams(fields),
  });
}

test("contact form notifications go to the public CMI contact email", async (t) => {
  const getMessage = mockEmailDelivery(t);
  const response = await submitContact({
    request: formRequest("contact", {
      firstName: "Test",
      lastName: "Visitor",
      email: "visitor@example.com",
      phone: "+256700000000",
      message: "Please contact me about a project.",
    }),
    env: EMAIL_ENV,
  });

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^text\/plain/);
  assert.match(await response.clone().text(), /sent to CMI Group/);
  assert.deepEqual(getMessage().to, [CMI_CONTACT_EMAIL]);
  assert.equal(getMessage().reply_to, "visitor@example.com");
});

test("Netlify contact route delegates to the shared email handler", async (t) => {
  const originalKey = process.env.RESEND_API_KEY;
  const originalSender = process.env.CMI_FROM_EMAIL;
  process.env.RESEND_API_KEY = EMAIL_ENV.RESEND_API_KEY;
  process.env.CMI_FROM_EMAIL = EMAIL_ENV.CMI_FROM_EMAIL;

  try {
    const getMessage = mockEmailDelivery(t);
    const response = await netlifyContact(formRequest("contact", {
      firstName: "Netlify",
      lastName: "Visitor",
      email: "visitor@example.com",
      phone: "+256700000000",
      message: "Please contact me about a project.",
    }));

    assert.deepEqual(netlifyContactConfig, { path: "/api/contact" });
    assert.equal(response.status, 200);
    assert.deepEqual(getMessage().to, [CMI_CONTACT_EMAIL]);
  } finally {
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
    if (originalSender === undefined) delete process.env.CMI_FROM_EMAIL;
    else process.env.CMI_FROM_EMAIL = originalSender;
  }
});

test("quotation and consultation enquiries go to the public CMI contact email", async (t) => {
  const getMessage = mockEmailDelivery(t);
  const response = await submitContact({
    request: formRequest("contact", {
      firstName: "Test",
      lastName: "Visitor",
      email: "visitor@example.com",
      phone: "+256700000000",
      message: "Please send a quotation and arrange a project consultation.",
    }),
    env: EMAIL_ENV,
  });

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^text\/plain/);
  assert.deepEqual(getMessage().to, [CMI_CONTACT_EMAIL]);
  assert.match(getMessage().text, /quotation and arrange a project consultation/);
  assert.equal(getMessage().reply_to, "visitor@example.com");
});

test("expression-of-interest quote requests go to the public CMI contact email", async (t) => {
  const getMessage = mockEmailDelivery(t);
  const response = await submitInterest({
    request: formRequest("interest", {
      fullname: "Test Visitor",
      email: "visitor@example.com",
      phone: "+256700000000",
      currentAddress: "Kampala",
      countryCode: "+256",
      whatsappNo: "+256700000000",
      mobilePhone: "+256700000000",
      homePhone: "+256700000000",
      homeCountry: "Uganda",
      homeDistrict: "Kampala",
      projectCountry: "Uganda",
    }),
    env: EMAIL_ENV,
  });

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^text\/plain/);
  assert.deepEqual(getMessage().to, [CMI_CONTACT_EMAIL]);
  assert.equal(getMessage().reply_to, "visitor@example.com");
});

test("Netlify interest route delegates to the shared email handler", async (t) => {
  const originalKey = process.env.RESEND_API_KEY;
  const originalSender = process.env.CMI_FROM_EMAIL;
  process.env.RESEND_API_KEY = EMAIL_ENV.RESEND_API_KEY;
  process.env.CMI_FROM_EMAIL = EMAIL_ENV.CMI_FROM_EMAIL;

  try {
    const getMessage = mockEmailDelivery(t);
    const response = await netlifyInterest(formRequest("interest", {
      fullname: "Netlify Visitor",
      email: "visitor@example.com",
      phone: "+256700000000",
      currentAddress: "Kampala",
      countryCode: "+256",
      whatsappNo: "+256700000000",
      mobilePhone: "+256700000000",
      homePhone: "+256700000000",
      homeCountry: "Uganda",
      homeDistrict: "Kampala",
      projectCountry: "Uganda",
    }));

    assert.deepEqual(netlifyInterestConfig, { path: "/api/interest" });
    assert.equal(response.status, 200);
    assert.deepEqual(getMessage().to, [CMI_CONTACT_EMAIL]);
  } finally {
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
    if (originalSender === undefined) delete process.env.CMI_FROM_EMAIL;
    else process.env.CMI_FROM_EMAIL = originalSender;
  }
});
