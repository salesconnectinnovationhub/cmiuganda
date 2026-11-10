import { getVerifiedAccessEmail } from "../_shared/review-auth.js";

const MAX_BODY_BYTES = 1024;
const EVENTS = new Set([
  "consultation_click",
  "contact_submit",
  "interest_submit",
  "estimator_handoff",
  "phone_click",
  "whatsapp_click",
  "chat_click",
  "payment_start",
  "payment_return",
]);
const PUBLIC_PATHS = new Set([
  "/",
  "/index.html",
  "/about.html",
  "/services.html",
  "/property-management.html",
  "/project.html",
  "/gallery.html",
  "/team.html",
  "/contact.html",
  "/chat.html",
  "/block-estimator.html",
  "/payments.html",
  "/success.html",
  "/cancel.html",
]);

function jsonResponse(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" },
  });
}

function validOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function isApprover(email, env) {
  return String(env.CMS_APPROVER_EMAILS || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .includes(String(email || "").toLowerCase());
}

function databaseUnavailable() {
  return jsonResponse({ error: "Analytics storage is unavailable. Apply functions/analytics-schema.sql to the D1 database." }, 503);
}

export async function onRequestPost({ request, env }) {
  if (!validOrigin(request)) return jsonResponse({ error: "Send analytics events from the CMI Group website." }, 403);
  if (!env.DB) return databaseUnavailable();

  const declaredLength = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return jsonResponse({ error: "Analytics event is too large." }, 413);
  }

  let eventData;
  try {
    const body = await request.arrayBuffer();
    if (body.byteLength > MAX_BODY_BYTES) return jsonResponse({ error: "Analytics event is too large." }, 413);
    eventData = JSON.parse(new TextDecoder().decode(body));
  } catch {
    return jsonResponse({ error: "Analytics event must be valid JSON." }, 400);
  }

  const { event, path } = eventData || {};
  if (!EVENTS.has(event) || !PUBLIC_PATHS.has(path)) {
    return jsonResponse({ error: "Choose a valid event and public page path." }, 400);
  }

  try {
    const day = new Date().toISOString().slice(0, 10);
    await env.DB.prepare(
      `INSERT INTO analytics_daily (day, event, path, count) VALUES (?, ?, ?, 1)
       ON CONFLICT(day, event, path) DO UPDATE SET count = count + 1`,
    ).bind(day, event, path).run();
    return new Response(null, {
      status: 204,
      headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" },
    });
  } catch (error) {
    console.error("Could not record an aggregate analytics event.", error);
    return jsonResponse({ error: "Analytics event could not be recorded." }, 500);
  }
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return databaseUnavailable();
  const identity = await getVerifiedAccessEmail(request, env, "CF_ACCESS_CMS_AUD");
  if (!isApprover(identity, env)) return jsonResponse({ error: "Only an authorized approver can view conversion analytics." }, 403);

  const requestedDays = Number(new URL(request.url).searchParams.get("days"));
  const days = [7, 30, 90].includes(requestedDays) ? requestedDays : 30;
  try {
    const { results } = await env.DB.prepare(
      "SELECT day, event, path, count FROM analytics_daily WHERE day >= date('now', ?) ORDER BY day DESC, event, path",
    ).bind(`-${days - 1} days`).all();
    return jsonResponse({ days, events: results });
  } catch (error) {
    console.error("Could not read aggregate analytics events.", error);
    return jsonResponse({ error: "Conversion analytics could not be loaded." }, 500);
  }
}