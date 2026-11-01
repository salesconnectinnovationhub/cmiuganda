import { getVerifiedAccessEmail } from "../_shared/review-auth.js";

const IMAGE_COLLECTIONS = new Set(["property", "team", "partner", "service", "promotion"]);
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const CONTENT_TYPES = new Map([
  ["image/jpeg", { extension: "jpg", signature: [0xff, 0xd8, 0xff] }],
  ["image/png", { extension: "png", signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  ["image/webp", { extension: "webp", signature: [0x52, 0x49, 0x46, 0x46] }],
]);
const DOCUMENT_FORMATS = new Map([
  ["pdf", { contentType: "application/pdf", signature: [0x25, 0x50, 0x44, 0x46, 0x2d] }],
  ["doc", { contentType: "application/msword", signature: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] }],
  ["xls", { contentType: "application/vnd.ms-excel", signature: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] }],
  ["ppt", { contentType: "application/vnd.ms-powerpoint", signature: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] }],
  ["docx", { contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", signature: [0x50, 0x4b, 0x03, 0x04] }],
  ["xlsx", { contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", signature: [0x50, 0x4b, 0x03, 0x04] }],
  ["pptx", { contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", signature: [0x50, 0x4b, 0x03, 0x04] }],
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
    && (/^cms-media\/(property|team|partner|service|promotion)\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(key)
      || /^cms-media\/resource\/[0-9a-f-]{36}\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/.test(key));
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

function hasExpectedDocumentSignature(bytes, format) {
  if (format.contentType === "application/pdf") {
    const header = new TextDecoder().decode(bytes.subarray(0, 1024));
    return header.includes("%PDF-");
  }
  return format.signature.every((byte, index) => bytes[index] === byte);
}

function safeFileName(value) {
  const cleaned = String(value || "download")
    .replace(/[\\/\u0000-\u001f\u007f"]/g, "_")
    .trim()
    .slice(0, 120);
  return cleaned || "download";
}

function unavailable() {
  return jsonResponse({ error: "CMS media storage is not configured. Bind a Cloudflare R2 bucket as CMS_MEDIA_BUCKET." }, 503);
}

export async function onRequestGet({ request, env }) {
  if (!env.CMS_MEDIA_BUCKET) return unavailable();
  const key = new URL(request.url).searchParams.get("key");
  if (!validMediaKey(key)) return jsonResponse({ error: "Media not found." }, 404);

  try {
    const email = await getVerifiedAccessEmail(request, env, "CF_ACCESS_CMS_AUD");
    const role = cmsRole(email, env);
    if (!role) {
      if (!env.DB) return jsonResponse({ error: "Media not found." }, 404);
      const published = await env.DB.prepare(
        "SELECT 1 AS visible FROM cms_items WHERE status = 'published' AND instr(payload_json, ?) > 0 LIMIT 1",
      ).bind(key).first();
      if (!published) return jsonResponse({ error: "Media not found." }, 404);
    }

    const object = await env.CMS_MEDIA_BUCKET.get(key);
    if (!object) return jsonResponse({ error: "Media not found." }, 404);
    const isResource = key.startsWith("cms-media/resource/");
    const filename = safeFileName(object.customMetadata?.originalName);
    const contentDisposition = isResource
      ? `attachment; filename="${filename.replace(/[^A-Za-z0-9._ -]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(filename)}`
      : "inline";
    return new Response(object.body, {
      headers: {
        "content-type": object.httpMetadata?.contentType || "application/octet-stream",
        "cache-control": "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff",
        "content-disposition": contentDisposition,
      },
    });
  } catch (error) {
    console.error("Could not load CMS media from R2.", error);
    return jsonResponse({ error: "Media could not be loaded." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!validOrigin(request)) return jsonResponse({ error: "Upload files from the CMI Group CMS." }, 403);
  const email = await getVerifiedAccessEmail(request, env, "CF_ACCESS_CMS_AUD");
  if (!cmsRole(email, env)) return jsonResponse({ error: "Sign in with an authorized CMI Group CMS account." }, 403);
  if (!env.CMS_MEDIA_BUCKET) return unavailable();

  const declaredLength = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_FILE_BYTES + 32_000) {
    return jsonResponse({ error: "Files must be 10 MB or smaller. Resize images or optimize documents before uploading." }, 413);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch (error) {
    return jsonResponse({ error: "The file upload could not be read." }, 400);
  }

  const collection = formData.get("collection");
  const file = formData.get("image") || formData.get("file");
  if (!(IMAGE_COLLECTIONS.has(collection) || collection === "resource")) {
    return jsonResponse({ error: "Choose a valid content type for this upload." }, 400);
  }
  if (!(file instanceof File) || file.size === 0) return jsonResponse({ error: "Choose a file to upload." }, 400);
  if (file.size > MAX_FILE_BYTES) {
    return jsonResponse({ error: "Files must be 10 MB or smaller. Resize images or optimize documents before uploading." }, 413);
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let extension;
    let contentType;
    if (collection === "resource") {
      extension = file.name.split(".").pop()?.toLowerCase() || "";
      const format = DOCUMENT_FORMATS.get(extension);
      const declaredType = file.type.toLowerCase();
      if (!format || (declaredType && declaredType !== format.contentType && declaredType !== "application/octet-stream")) {
        return jsonResponse({ error: "Use a PDF or Microsoft Word, Excel, or PowerPoint document." }, 415);
      }
      if (!hasExpectedDocumentSignature(bytes, format)) {
        return jsonResponse({ error: "The selected document does not match its file type." }, 415);
      }
      contentType = format.contentType;
    } else {
      const format = CONTENT_TYPES.get(file.type.toLowerCase());
      if (!format) return jsonResponse({ error: "Use a JPEG, PNG, or WebP image." }, 415);
      if (!hasExpectedSignature(bytes, file.type.toLowerCase())) {
        return jsonResponse({ error: "The selected file does not appear to be a valid image." }, 415);
      }
      extension = format.extension;
      contentType = file.type.toLowerCase();
    }

    const key = `cms-media/${collection}/${crypto.randomUUID()}.${extension}`;
    const originalName = safeFileName(file.name);
    await env.CMS_MEDIA_BUCKET.put(key, bytes, {
      httpMetadata: { contentType },
      customMetadata: { uploadedBy: email, originalName },
    });
    return jsonResponse({ key, fileName: originalName }, 201);
  } catch (error) {
    console.error("Could not store a CMS file in R2.", error);
    return jsonResponse({ error: "File upload failed. Please try again." }, 500);
  }
}
