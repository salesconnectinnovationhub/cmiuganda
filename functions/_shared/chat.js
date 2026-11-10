import { getVerifiedAccessEmail } from "./review-auth.js";

export const MAX_CHAT_MESSAGE_LENGTH = 4000;
const MAX_BODY_BYTES = 9000;
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function chatResponse(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
  });
}

export function hasSameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function readChatJson(request) {
  const declaredLength = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return { error: chatResponse({ error: "The message is too large." }, 413) };
  }
  try {
    const body = await request.arrayBuffer();
    if (body.byteLength > MAX_BODY_BYTES) {
      return { error: chatResponse({ error: "The message is too large." }, 413) };
    }
    return { data: JSON.parse(new TextDecoder().decode(body)) };
  } catch {
    return { error: chatResponse({ error: "Chat requests must contain valid JSON." }, 400) };
  }
}

export function cleanText(value, maximum) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").slice(0, maximum);
}

export function isConversationId(value) {
  return typeof value === "string" && ID_PATTERN.test(value);
}

export function validEmail(value) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function newVisitorToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function hashVisitorToken(token) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function bearerToken(request) {
  const authorization = request.headers.get("Authorization") || "";
  const match = /^Bearer ([A-Za-z0-9_-]{40,64})$/.exec(authorization);
  return match ? match[1] : "";
}

function configuredStaff(env) {
  return [...String(env.CMS_EDITOR_EMAILS || "").split(","), ...String(env.CMS_APPROVER_EMAILS || "").split(",")]
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function authorizeChatStaff(request, env) {
  const email = await getVerifiedAccessEmail(request, env, "CF_ACCESS_CMS_AUD");
  if (email === null) return { error: chatResponse({ error: "Staff chat authentication is not configured." }, 503) };
  if (!email || !configuredStaff(env).includes(email)) {
    return { error: chatResponse({ error: "Sign in with an authorized CMI Group staff account." }, 403) };
  }
  return { email };
}

export function chatDatabaseUnavailable() {
  return chatResponse({ error: "Chat storage is not configured. Apply functions/chat-schema.sql and bind D1 as DB." }, 503);
}

export function chatError(message) {
  return chatResponse({ error: message }, 400);
}
