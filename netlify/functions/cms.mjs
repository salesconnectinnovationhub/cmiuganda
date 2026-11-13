const publicContentTypes = new Set([
  "page",
  "partner",
  "promotion",
  "resource",
  "service",
  "settings",
  "team",
]);

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    },
  });
}

export default async function cms(request) {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const type = new URL(request.url).searchParams.get("type");
  if (!publicContentTypes.has(type)) {
    return jsonResponse({ error: "Unsupported CMS content type." }, 400);
  }

  return jsonResponse({ items: [] });
}

export const config = { path: "/api/cms" };
