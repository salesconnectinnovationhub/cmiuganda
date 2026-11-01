import { getVerifiedAccessEmail } from "../_shared/review-auth.js";

const TYPES = new Set(["property", "team", "partner", "promotion", "service", "settings"]);

function jsonResponse(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function cmsRole(email, env) {
  const normalized = String(email || "").toLowerCase();
  const approvers = String(env.CMS_APPROVER_EMAILS || "").split(",").map((value) => value.trim().toLowerCase());
  const editors = String(env.CMS_EDITOR_EMAILS || "").split(",").map((value) => value.trim().toLowerCase());
  if (approvers.includes(normalized)) return "approver";
  if (editors.includes(normalized)) return "editor";
  return null;
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

async function readJson(request) {
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > 4_000) return { error: "Revision request is too large." };
  try {
    return { value: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { error: "Request body must be valid JSON." };
  }
}

async function authorize(request, env) {
  const email = await getVerifiedAccessEmail(request, env, "CF_ACCESS_CMS_AUD");
  const role = cmsRole(email, env);
  return role ? { email, role } : null;
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return jsonResponse({ error: "CMS storage is not configured." }, 503);
  const actor = await authorize(request, env);
  if (!actor) return jsonResponse({ error: "Sign in with an authorized CMI Group CMS account." }, 403);

  const itemId = new URL(request.url).searchParams.get("id");
  if (!itemId || itemId.length > 100) return jsonResponse({ error: "Content item not found." }, 400);
  try {
    const revisionStatusFilter = actor.role === "approver" ? "" : "AND status = 'draft'";
    const { results } = await env.DB.prepare(
      `SELECT revision_id, item_id, content_type, slug, title, payload_json, status, action, actor_email, created_at
       FROM cms_revisions WHERE item_id = ? ${revisionStatusFilter} ORDER BY revision_id DESC LIMIT 100`,
    ).bind(itemId).all();
    return jsonResponse({
      revisions: results.map((revision) => ({
        revisionId: revision.revision_id,
        itemId: revision.item_id,
        type: revision.content_type,
        slug: revision.slug,
        title: revision.title,
        publicationStatus: revision.status,
        action: revision.action,
        actor: revision.actor_email,
        createdAt: revision.created_at,
      })),
    });
  } catch (error) {
    console.error("Could not load CMS revisions.", error);
    return jsonResponse({ error: "Revision history could not be loaded." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!validOrigin(request)) return jsonResponse({ error: "Restore revisions from the CMI Group CMS." }, 403);
  if (!env.DB) return jsonResponse({ error: "CMS storage is not configured." }, 503);
  const actor = await authorize(request, env);
  if (!actor) return jsonResponse({ error: "Sign in with an authorized CMI Group CMS account." }, 403);

  const body = await readJson(request);
  if (body.error) return jsonResponse({ error: body.error }, 400);
  const { itemId, revisionId } = body.value || {};
  if (typeof itemId !== "string" || itemId.length > 100 || !Number.isSafeInteger(revisionId) || revisionId < 1) {
    return jsonResponse({ error: "Choose a valid revision to restore." }, 400);
  }

  try {
    const [item, revision] = await Promise.all([
      env.DB.prepare("SELECT id, content_type, slug, title, payload_json, status FROM cms_items WHERE id = ?").bind(itemId).first(),
      env.DB.prepare(
        "SELECT item_id, content_type, slug, title, payload_json, status FROM cms_revisions WHERE revision_id = ? AND item_id = ?",
      ).bind(revisionId, itemId).first(),
    ]);
    if (!item || !revision) return jsonResponse({ error: "Content item or revision was not found." }, 404);
    if (!TYPES.has(revision.content_type)) return jsonResponse({ error: "This revision type cannot be restored." }, 400);
    if (actor.role !== "approver" && (item.status !== "draft" || revision.status !== "draft")) {
      return jsonResponse({ error: "Editors can restore draft revisions only. An approver must restore live or archived content." }, 403);
    }

    const auditAction = revision.status === "archived"
      ? "archive"
      : item.status !== "published" && revision.status === "published"
        ? "publish"
        : item.status === "published" && revision.status !== "published"
          ? "unpublish"
          : "update";
    const updateStatement = env.DB.prepare(
      `UPDATE cms_items SET content_type = ?, slug = ?, title = ?, payload_json = ?, status = ?,
       updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?`,
    ).bind(revision.content_type, revision.slug, revision.title, revision.payload_json, revision.status, actor.email, itemId);
    const auditStatement = env.DB.prepare(
      "INSERT INTO cms_audit_log (item_id, content_type, action, actor_email) VALUES (?, ?, ?, ?)",
    ).bind(itemId, revision.content_type, auditAction, actor.email);
    const revisionStatement = env.DB.prepare(
      `INSERT INTO cms_revisions
       (item_id, content_type, slug, title, payload_json, status, action, actor_email)
       VALUES (?, ?, ?, ?, ?, ?, 'restore', ?)`,
    ).bind(itemId, revision.content_type, revision.slug, revision.title, revision.payload_json, revision.status, actor.email);
    await env.DB.batch([updateStatement, auditStatement, revisionStatement]);
    return jsonResponse({ ok: true, publicationStatus: revision.status });
  } catch (error) {
    console.error("Could not restore a CMS revision.", error);
    if (String(error.message || "").includes("UNIQUE")) {
      return jsonResponse({ error: "This revision conflicts with another content item using the same slug." }, 409);
    }
    return jsonResponse({ error: "The selected revision could not be restored." }, 500);
  }
}
