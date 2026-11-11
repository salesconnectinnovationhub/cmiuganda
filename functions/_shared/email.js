const RESEND_ENDPOINT = "https://api.resend.com/emails";

export const RECIPIENT = "cmi.groupuganda@gmail.com";

export function response(message, status, title = "CMI Group message") {
  const safeMessage = message.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
  const heading = status < 400 ? "Thank you" : "We could not send your message";

  return new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><body style="font:16px/1.5 system-ui,sans-serif;max-width:42rem;margin:10vh auto;padding:0 1rem"><h1>${heading}</h1><p>${safeMessage}</p><p><a href="/contact.html">Return to the contact page</a></p></body></html>`,
    {
      status,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    },
  );
}

export function sanitize(value) {
  return String(value ?? "").trim().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

export async function readFormData(request) {
  const origin = request.headers.get("Origin");
  if (!origin) {
    return { error: response("Please submit the form from the CMI Group website.", 403) };
  }
  try {
    if (new URL(origin).origin !== new URL(request.url).origin) {
      return { error: response("Please submit the form from the CMI Group website.", 403) };
    }
  } catch (error) {
    return { error: response("Please submit the form from the CMI Group website.", 403) };
  }

  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.includes("application/x-www-form-urlencoded") && !contentType.includes("multipart/form-data")) {
    return { error: response("The form submission could not be read. Please return to the contact page and try again.", 415) };
  }

  try {
    const body = await request.arrayBuffer();
    if (body.byteLength > 20_000) {
      return { error: response("The submitted form is too large. Please shorten your answers and try again.", 413) };
    }
    const formRequest = new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body,
    });
    return { formData: await formRequest.formData() };
  } catch (error) {
    console.error("Could not parse CMI Group form data.", error);
    return { error: response("The form submission could not be read. Please try again.", 400) };
  }
}

export async function sendEmail(env, { to = RECIPIENT, replyTo, subject, text }) {
  if (!env.RESEND_API_KEY || !env.CMI_FROM_EMAIL) {
    console.error("CMI Group email configuration is incomplete.");
    return { status: 503 };
  }
  if (typeof to !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    console.error("CMI Group email notification recipient is invalid.");
    return { status: 400 };
  }

  let mailResponse;
  try {
    mailResponse = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: env.CMI_FROM_EMAIL,
        to: [to],
        reply_to: replyTo,
        subject,
        text,
      }),
    });
  } catch (error) {
    console.error("CMI Group email provider request failed.", error);
    return { status: 502 };
  }

  if (!mailResponse.ok) {
    const providerError = await mailResponse.text();
    console.error("CMI Group email provider rejected the request.", mailResponse.status, providerError);
    return { status: 502 };
  }

  return { status: 200 };
}
