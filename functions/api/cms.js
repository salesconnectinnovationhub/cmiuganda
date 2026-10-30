import { isAuthorizedReviewAdmin } from "../_shared/review-auth.js";

const TYPES = new Set(["property", "team", "partner", "promotion", "service"]);
const STATUSES = new Set(["draft", "published", "archived"]);
const MAX_BODY_BYTES = 30_000;

const fields = {
  property: ["type", "location", "price", "status", "summary", "features", "images", "imageAlt", "updatedAt"],
  team: ["role", "bio", "image", "imageAlt", "sortOrder"],
  partner: ["url", "logo", "imageAlt", "sortOrder"],
  promotion: ["body", "image", "imageAlt", "startAt", "endAt", "frequencyDays", "buttonText", "buttonUrl"],
  service: ["summary", "image", "imageAlt", "sortOrder"],
};

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

function normalizeText(value, maxLength) {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  return text && text.length <= maxLength ? text : null;
}

function validSlug(value) {
  return typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 100;
}

function isValidCalendarDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateItem(type, item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return "Content must be a JSON object.";
  if (!validSlug(item.slug)) return "Enter a URL-safe slug using lowercase letters, numbers, and hyphens.";
  if (!normalizeText(item.title, 160)) return "Title is required and must be 160 characters or fewer.";
  if (!STATUSES.has(item.publicationStatus)) return "Choose draft, published, or archived.";

  const payload = {};
  for (const field of fields[type]) {
    const value = item[field];
    if (value === undefined || value === null || value === "") continue;
    if (field === "features" || field === "images") {
      if (!Array.isArray(value) || value.length > 20 || !value.every((entry) => typeof entry === "string" && entry.trim().length <= 300)) {
        return `${field} must be a list of up to 20 text values.`;
      }
      if (field === "images" && !value.every((entry) => /^(images|img|teamimages|propertyimages)\//.test(entry.trim()))) {
        return "Images must use approved site-relative paths under images/, img/, teamimages/, or propertyimages/.";
      }
      payload[field] = value.map((entry) => entry.trim());
      continue;
    }
    if (field === "sortOrder") {
      const order = Number(value);
      if (!Number.isInteger(order) || order < 0 || order > 10000) return "Sort order must be a whole number from 0 to 10,000.";
      payload[field] = order;
      continue;
    }
    if (field === "frequencyDays") {
      const frequency = value === undefined || value === null || value === "" ? 7 : Number(value);
      if (!Number.isInteger(frequency) || frequency < 1 || frequency > 365) {
        return "Promotion display frequency must be a whole number from 1 to 365 days.";
      }
      payload[field] = frequency;
      continue;
    }
    const text = normalizeText(value, field === "bio" || field === "body" || field === "summary" ? 3000 : 500);
    if (!text) return `${field} must be text of the allowed length.`;
    if (field === "image" || field === "logo") {
      if (!/^(images|img|teamimages|propertyimages)\//.test(text)) return "Images must use an approved site-relative path.";
    }
    if (field === "url" || field === "buttonUrl") {
      let url;
      try {
        url = new URL(text);
      } catch {
        return `${field} must be a valid HTTPS URL.`;
      }
      if (url.protocol !== "https:") return `${field} must be a valid HTTPS URL.`;
    }
    payload[field] = text;
  }

  if (type === "property") {
    if (!["Land", "Residential", "Commercial", "Rental"].includes(payload.type)) return "Choose a valid property type.";
    if (!["Available", "Reserved", "Sold", "Rented"].includes(payload.status)) return "Choose a valid listing availability.";
    if (!normalizeText(payload.location, 500) || !normalizeText(payload.price, 500) || !normalizeText(payload.summary, 3000)) {
      return "Property listings require a location, price, and summary.";
    }
  }
  if (type === "team" && !normalizeText(payload.role, 500)) return "Team profiles require a role.";
  if (type === "partner" && (!payload.url || !payload.logo)) return "Partner entries require an approved HTTPS URL and logo path.";
  if (type === "promotion" && (!payload.body || !payload.startAt || !payload.endAt)) {
    return "Promotions require announcement text and start/end dates.";
  }
  if (type === "promotion") {
    if (!isValidCalendarDate(payload.startAt) || !isValidCalendarDate(payload.endAt) || payload.endAt < payload.startAt) {
      return "Promotion dates must be real YYYY-MM-DD calendar dates and the end date cannot be before the start date.";
    }
  }
  if (type === "service" && !normalizeText(payload.summary, 3000)) return "Services require a summary.";
  return { slug: item.slug, title: item.title.trim(), publicationStatus: item.publicationStatus, payload };
}

function mapRow(row) {
  return {
    id: row.id,
    type: row.content_type,
    slug: row.slug,
    title: row.title,
    publicationStatus: row.status,
    ...JSON.parse(row.payload_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function adminEmail(request, env) {
  return await isAuthorizedReviewAdmin(request, env, "CF_ACCESS_CMS_AUD") ? "cmigroupuganda@gmail.com" : null;
}

async function readJson(request) {
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > MAX_BODY_BYTES) return { error: "Content submission is too large." };
  try {
    return { value: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { error: "Request body must be valid JSON." };
  }
}

function storageUnavailable() {
  return jsonResponse({ error: "CMS storage is not configured. Bind a Cloudflare D1 database as DB and apply functions/cms-schema.sql." }, 503);
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return storageUnavailable();
  const type = new URL(request.url).searchParams.get("type");
  if (!TYPES.has(type)) return jsonResponse({ error: "Choose a valid content type." }, 400);
  const actor = await adminEmail(request, env);
  const isAdmin = actor !== null;

  try {
    const query = isAdmin
      ? "SELECT * FROM cms_items WHERE content_type = ? ORDER BY updated_at DESC LIMIT 500"
      : "SELECT * FROM cms_items WHERE content_type = ? AND status = 'published' ORDER BY updated_at DESC LIMIT 500";
    const { results } = await env.DB.prepare(query).bind(type).all();
    return jsonResponse({ items: results.map(mapRow), isAdmin });
  } catch (error) {
    console.error("Could not read CMS content.", error);
    return jsonResponse({ error: "CMS content could not be loaded." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  return saveItem({ request, env, isUpdate: false });
}

export async function onRequestPut({ request, env }) {
  return saveItem({ request, env, isUpdate: true });
}

async function saveItem({ request, env, isUpdate }) {
  if (!validOrigin(request)) return jsonResponse({ error: "Submit CMS changes from the CMI Group admin site." }, 403);
  const actor = await adminEmail(request, env);
  if (!actor) return jsonResponse({ error: "Sign in with the authorized CMI Group admin account." }, 403);
  if (!env.DB) return storageUnavailable();

  const body = await readJson(request);
  if (body.error) return jsonResponse({ error: body.error }, 400);
  const { type, item, id } = body.value || {};
  if (!TYPES.has(type)) return jsonResponse({ error: "Choose a valid content type." }, 400);
  if (isUpdate && (typeof id !== "string" || id.length > 100)) return jsonResponse({ error: "Content item not found." }, 400);
  const validated = validateItem(type, item);
  if (typeof validated === "string") return jsonResponse({ error: validated }, 400);

  const itemId = isUpdate ? id : crypto.randomUUID();
  try {
    let previousStatus = null;
    if (isUpdate) {
      const previous = await env.DB.prepare("SELECT status FROM cms_items WHERE id = ?").bind(itemId).first();
      if (!previous) return jsonResponse({ error: "Content item not found." }, 404);
      previousStatus = previous.status;
    }

    const action = !isUpdate
      ? "create"
      : previousStatus !== "published" && validated.publicationStatus === "published"
        ? "publish"
        : previousStatus === "published" && validated.publicationStatus !== "published"
          ? "unpublish"
          : "update";
    const statement = isUpdate
      ? env.DB.prepare(
        `UPDATE cms_items SET content_type = ?, slug = ?, title = ?, payload_json = ?, status = ?,
         updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?`,
      ).bind(type, validated.slug, validated.title, JSON.stringify(validated.payload), validated.publicationStatus, actor, itemId)
      : env.DB.prepare(
        `INSERT INTO cms_items (id, content_type, slug, title, payload_json, status, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).bind(itemId, type, validated.slug, validated.title, JSON.stringify(validated.payload), validated.publicationStatus, actor);
    const auditStatement = env.DB.prepare(
      "INSERT INTO cms_audit_log (item_id, content_type, action, actor_email) VALUES (?, ?, ?, ?)",
    ).bind(itemId, type, action, actor);
    await env.DB.batch([statement, auditStatement]);
    return jsonResponse({ ok: true, id: itemId }, isUpdate ? 200 : 201);
  } catch (error) {
    console.error("Could not save CMS content.", error);
    if (String(error.message || "").includes("UNIQUE")) {
      return jsonResponse({ error: "That slug is already in use for this content type." }, 409);
    }
    return jsonResponse({ error: "Content could not be saved." }, 500);
  }
}

export async function onRequestDelete({ request, env }) {
  if (!validOrigin(request)) return jsonResponse({ error: "Submit CMS changes from the CMI Group admin site." }, 403);
  const actor = await adminEmail(request, env);
  if (!actor) return jsonResponse({ error: "Sign in with the authorized CMI Group admin account." }, 403);
  if (!env.DB) return storageUnavailable();

  const body = await readJson(request);
  if (body.error) return jsonResponse({ error: body.error }, 400);
  const { id } = body.value || {};
  if (typeof id !== "string" || id.length > 100) return jsonResponse({ error: "Content item not found." }, 400);

  try {
    const updateStatement = env.DB.prepare(
      "UPDATE cms_items SET status = 'archived', updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?",
    ).bind(actor, id);
    const auditStatement = env.DB.prepare(
      "INSERT INTO cms_audit_log (item_id, content_type, action, actor_email) SELECT id, content_type, 'archive', ? FROM cms_items WHERE id = ?",
    ).bind(actor, id);
    const results = await env.DB.batch([updateStatement, auditStatement]);
    if (results[0].meta.changes === 0) return jsonResponse({ error: "Content item not found." }, 404);
    return jsonResponse({ ok: true });
  } catch (error) {
    console.error("Could not archive CMS content.", error);
    return jsonResponse({ error: "Content could not be archived." }, 500);
  }
}
