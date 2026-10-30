import { isAuthorizedReviewAdmin } from "../../_shared/review-auth.js";

function jsonResponse(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function requestFromSite(request) {
  if (!request.headers.get("Content-Type")?.includes("application/json")) return false;
  const origin = request.headers.get("Origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function onRequestPost({ request, env }) {
  if (!requestFromSite(request)) return jsonResponse({ error: "Submit replies from the CMI Group website." }, 403);
  if (!env.DB) return jsonResponse({ error: "Reviews are temporarily unavailable." }, 503);
  if (!(await isAuthorizedReviewAdmin(request, env))) {
    return jsonResponse({ error: "Sign in with the authorized CMI Group admin account to reply." }, 403);
  }

  let reply;
  try {
    const body = await request.arrayBuffer();
    if (body.byteLength > 4_000) return jsonResponse({ error: "The reply is too long." }, 413);
    reply = JSON.parse(new TextDecoder().decode(body));
  } catch {
    return jsonResponse({ error: "The reply could not be read." }, 400);
  }

  if (!reply || typeof reply !== "object" || Array.isArray(reply)) {
    return jsonResponse({ error: "The reply could not be read." }, 400);
  }

  const reviewId = Number(reply.reviewId);
  const text = String(reply.reply || "").trim();
  if (!Number.isSafeInteger(reviewId) || reviewId < 1) return jsonResponse({ error: "Review not found." }, 400);
  if (text.length < 1 || text.length > 1000) return jsonResponse({ error: "Enter a reply of 1 to 1,000 characters." }, 400);

  try {
    const result = await env.DB.prepare(
      "UPDATE reviews SET admin_reply = ?, reply_at = CURRENT_TIMESTAMP WHERE comment_id = ?",
    ).bind(text, reviewId).run();
    if (result.meta.changes === 0) return jsonResponse({ error: "Review not found." }, 404);
    return jsonResponse({ ok: true });
  } catch (error) {
    console.error("Could not save admin review reply.", error);
    return jsonResponse({ error: "Your reply could not be saved. Please try again." }, 500);
  }
}
