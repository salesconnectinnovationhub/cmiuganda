import { getVerifiedAccessEmail } from "../_shared/review-auth.js";

const COLLECTIONS = new Set(["property", "team", "partner", "service", "promotion"]);
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const CONTENT_TYPES = new Map([
  ["image/jpeg", { extension: "jpg", signature: [0xff, 0xd8, 0xff] }],
  ["image/png", { extension: "png", signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  ["image/webp", { extension: "webp", signature: [0x52, 0x49, 0x46, 0x46] }],
]);

function jsonResponse(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
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

function configuredEmails(value) {
  return String(value || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
}

function cmsRole(email, env) {
  if (!email) return null;
  if (configuredEmails(env.CMS_APPROVER_EMAILS).includes(email)) return "approver";
  if (configuredEmails(env.CMS_EDITOR_EMAILS).includes(email)) return "editor";
  return null;
}

function validMediaKey(key) {
  return typeof key === "string"
    && /^cms-media\/(property|team|partner|service|promotion)\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(key);
}

function hasExpectedSignature(bytes, contentType) {
  const format = CONTENT_TYPES.get(contentType);
  if (!format || !format.signature.every((byte, index) => bytes[index] === byte)) return false;
  if (contentType === "image/webp") {
    return bytes.length >= 12
      && bytes[8] === 0x57
      && bytes[9] === 0x45
      && bytes[10] === 0x42
      && bytes[11] === 0x50;
  }
  return true;
}

function unavailable() {
  return jsonResponse({ error: "Image storage is not configured. Bind a Cloudflare R2 bucket as CMS_MEDIA_BUCKET." }, 503);
}

export async function onRequestGet({ request, env }) {
  if (!env.CMS_MEDIA_BUCKET) return unavailable();
  const key = new URL(request.url).searchParams.get("key");
  if (!validMediaKey(key)) return jsonResponse({ error: "Image not found." }, 404);

  try {
    const email = await getVerifiedAccessEmail(request, env, "CF_ACCESS_CMS_AUD");
    const role = cmsRole(email, env);
    if (!role) {
      if (!env.DB) return jsonResponse({ error: "Image not found." }, 404);
      const published = await env.DB.prepare(
        "SELECT 1 AS visible FROM cms_items WHERE status = 'published' AND instr(payload_json, ?) > 0 LIMIT 1",
      ).bind(key).first();
      if (!published) return jsonResponse({ error: "Image not found." }, 404);
    }

    const object = await env.CMS_MEDIA_BUCKET.get(key);
    if (!object) return jsonResponse({ error: "Image not found." }, 404);
    return new Response(object.body, {
      headers: {
        "content-type": object.httpMetadata?.contentType || "application/octet-stream",
        "cache-control": "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff",
        "content-disposition": "inline",
      },
    });
  } catch (error) {
    console.error("Could not load a CMS image from R2.", error);
    return jsonResponse({ error: "Image could not be loaded." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!validOrigin(request)) return jsonResponse({ error: "Upload images from the CMI Group CMS." }, 403);
  const email = await getVerifiedAccessEmail(request, env, "CF_ACCESS_CMS_AUD");
  if (!cmsRole(email, env)) return jsonResponse({ error: "Sign in with an authorized CMI Group CMS account." }, 403);
  if (!env.CMS_MEDIA_BUCKET) return unavailable();

  const declaredLength = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_FILE_BYTES + 32_000) {
    return jsonResponse({ error: "Choose an image smaller than 5 MB." }, 413);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch (error) {
    return jsonResponse({ error: "The image upload could not be read." }, 400);
  }

  const collection = formData.get("collection");
  const file = formData.get("image");
  if (!COLLECTIONS.has(collection)) return jsonResponse({ error: "Choose a valid content type for this image." }, 400);
  if (!(file instanceof File) || file.size === 0) return jsonResponse({ error: "Choose an image to upload." }, 400);
  if (file.size > MAX_FILE_BYTES) return jsonResponse({ error: "Choose an image smaller than 5 MB." }, 413);

  const contentType = file.type.toLowerCase();
  const format = CONTENT_TYPES.get(contentType);
  if (!format) return jsonResponse({ error: "Use a JPEG, PNG, or WebP image." }, 415);

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasExpectedSignature(bytes, contentType)) {
      return jsonResponse({ error: "The selected file does not appear to be a valid image." }, 415);
    }

    const key = `cms-media/${collection}/${crypto.randomUUID()}.${format.extension}`;
    await env.CMS_MEDIA_BUCKET.put(key, bytes, {
      httpMetadata: { contentType },
      customMetadata: { uploadedBy: email, originalName: file.name.slice(0, 120) },
    });
    return jsonResponse({ key }, 201);
  } catch (error) {
    console.error("Could not store a CMS image in R2.", error);
    return jsonResponse({ error: "Image upload failed. Please try again." }, 500);
  }
}
