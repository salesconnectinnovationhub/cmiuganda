import { onRequestPost } from "../../functions/api/contact.js";

export default async function contact(request) {
  if (request.method !== "POST") {
    return new Response("Method not allowed.", {
      status: 405,
      headers: { allow: "POST", "content-type": "text/plain; charset=utf-8" },
    });
  }

  return onRequestPost({ request, env: process.env });
}

export const config = { path: "/api/contact" };
