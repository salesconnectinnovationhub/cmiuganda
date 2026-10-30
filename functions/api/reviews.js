import { isAuthorizedReviewAdmin } from "../_shared/review-auth.js";

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
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function jsonRequestFromSite(request) {
  return request.headers.get("Content-Type")?.includes("application/json") === true
    && requestFromSite(request);
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return jsonResponse({ error: "Reviews are temporarily unavailable." }, 503);

  try {
    const { results } = await env.DB.prepare(
      `SELECT comment_id, commentor_name, user_rating, user_comment, created_at, admin_reply, reply_at
       FROM reviews ORDER BY comment_id DESC LIMIT 100`,
    ).all();

    return jsonResponse({
      reviews: results.map((review) => ({
        id: review.comment_id,
        name: review.commentor_name,
        rating: review.user_rating,
        comment: review.user_comment,
        createdAt: review.created_at,
        reply: review.admin_reply,
        replyAt: review.reply_at,
      })),
      isAdmin: await isAuthorizedReviewAdmin(request, env),
    });
  } catch (error) {
    console.error("Could not load public reviews.", error);
    return jsonResponse({ error: "Reviews are temporarily unavailable." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!jsonRequestFromSite(request)) return jsonResponse({ error: "Submit reviews from the CMI Group website." }, 403);
  if (!env.DB) return jsonResponse({ error: "Reviews are temporarily unavailable." }, 503);

  let review;
  try {
    const body = await request.arrayBuffer();
    if (body.byteLength > 8_000) return jsonResponse({ error: "The review is too long." }, 413);
    review = JSON.parse(new TextDecoder().decode(body));
  } catch {
    return jsonResponse({ error: "The review could not be read." }, 400);
  }

  if (!review || typeof review !== "object" || Array.isArray(review)) {
    return jsonResponse({ error: "The review could not be read." }, 400);
  }
  if (String(review.website || "").trim()) return jsonResponse({ ok: true });

  const name = String(review.name || "").trim();
  const comment = String(review.comment || "").trim();
  const rating = Number(review.rating);
  if (name.length < 1 || name.length > 80) return jsonResponse({ error: "Enter a name of 1 to 80 characters." }, 400);
  if (comment.length < 1 || comment.length > 2000) return jsonResponse({ error: "Enter a review of 1 to 2,000 characters." }, 400);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return jsonResponse({ error: "Select a rating from 1 to 5 stars." }, 400);

  try {
    const result = await env.DB.prepare(
      "INSERT INTO reviews (commentor_name, user_rating, user_comment) VALUES (?, ?, ?)",
    ).bind(name, rating, comment).run();
    return jsonResponse({ ok: true, id: result.meta.last_row_id }, 201);
  } catch (error) {
    console.error("Could not save submitted review.", error);
    return jsonResponse({ error: "Your review could not be saved. Please try again." }, 500);
  }
}
