import assert from "node:assert/strict";
import test from "node:test";
import { onRequestPost as submitContact } from "../../functions/api/contact.js";
import { onRequestPost as submitInterest } from "../../functions/api/interest.js";

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
  assert.deepEqual(getMessage().to, [CMI_CONTACT_EMAIL]);
  assert.equal(getMessage().reply_to, "visitor@example.com");
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
  assert.deepEqual(getMessage().to, [CMI_CONTACT_EMAIL]);
  assert.equal(getMessage().reply_to, "visitor@example.com");
});
