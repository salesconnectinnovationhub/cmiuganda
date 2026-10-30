import { isAuthorizedReviewAdmin } from "../../_shared/review-auth.js";

export async function onRequestGet({ request, env }) {
  const authorized = await isAuthorizedReviewAdmin(request, env);
  return Response.json(
    authorized
      ? { authorized: true, message: "Admin access verified. Return to the reviews page to reply." }
      : { authorized: false, error: "Sign in using the approved CMI Group admin account." },
    {
      status: authorized ? 200 : 403,
      headers: {
        "cache-control": "no-store",
        "content-type": "application/json; charset=utf-8",
        "x-content-type-options": "nosniff",
      },
    },
  );
}
