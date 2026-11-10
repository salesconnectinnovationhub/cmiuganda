import {
  bearerToken,
  chatDatabaseUnavailable,
  chatError,
  chatResponse,
  cleanText,
  hashVisitorToken,
  hasSameOrigin,
  isConversationId,
  MAX_CHAT_MESSAGE_LENGTH,
  newVisitorToken,
  readChatJson,
  validEmail,
} from "../_shared/chat.js";

function databaseUnavailable() {
  return chatDatabaseUnavailable();
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return databaseUnavailable();

  const url = new URL(request.url);
  const conversationId = url.searchParams.get("conversationId");
  const token = bearerToken(request);
  if (!isConversationId(conversationId) || !token) {
    return chatResponse({ error: "This chat could not be found. Start a new conversation." }, 400);
  }

  try {
    const tokenHash = await hashVisitorToken(token);
    const conversation = await env.DB.prepare(
      "SELECT id, status FROM chat_conversations WHERE id = ? AND visitor_token_hash = ?",
    ).bind(conversationId, tokenHash).first();
    if (!conversation) return chatResponse({ error: "This chat could not be found. Start a new conversation." }, 404);

    const { results } = await env.DB.prepare(
      "SELECT id, sender, body, created_at AS createdAt FROM chat_messages WHERE conversation_id = ? ORDER BY created_at, id LIMIT 200",
    ).bind(conversationId).all();
    return chatResponse({ conversation: { id: conversation.id, status: conversation.status }, messages: results || [] });
  } catch (error) {
    console.error("Could not load a visitor chat conversation.", error);
    return chatResponse({ error: "Your conversation could not be loaded. Please try again." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!hasSameOrigin(request)) return chatResponse({ error: "Send messages from the CMI Group website." }, 403);
  if (!env.DB) return databaseUnavailable();

  const parsed = await readChatJson(request);
  if (parsed.error) return parsed.error;
  const { conversationId, message, name, email, website } = parsed.data || {};
  if (cleanText(website, 200)) return chatResponse({ ok: true });

  const body = cleanText(message, MAX_CHAT_MESSAGE_LENGTH);
  if (!body) return chatError("Write a message before sending.");
  if (typeof message !== "string" || message.trim().length > MAX_CHAT_MESSAGE_LENGTH) {
    return chatError(`Messages must be ${MAX_CHAT_MESSAGE_LENGTH} characters or fewer.`);
  }

  const now = new Date().toISOString();
  try {
    if (conversationId === undefined || conversationId === null || conversationId === "") {
      const visitorName = cleanText(name, 100);
      const visitorEmail = cleanText(email, 254).toLowerCase();
      if (!visitorName) return chatError("Enter your name to start a conversation.");
      if (typeof name !== "string" || name.trim().length > 100) return chatError("Names must be 100 characters or fewer.");
      if (visitorEmail && !validEmail(visitorEmail)) return chatError("Enter a valid email address, or leave it blank.");
      const id = crypto.randomUUID();
      const token = newVisitorToken();
      const tokenHash = await hashVisitorToken(token);

      await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO chat_conversations (id, visitor_name, visitor_email, visitor_token_hash, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'open', ?, ?)",
        ).bind(id, visitorName, visitorEmail || null, tokenHash, now, now),
        env.DB.prepare(
          "INSERT INTO chat_messages (id, conversation_id, sender, body, created_at) VALUES (?, ?, 'visitor', ?, ?)",
        ).bind(crypto.randomUUID(), id, body, now),
      ]);
      return chatResponse({
        conversation: { id, status: "open" },
        token,
        messages: [{ sender: "visitor", body, createdAt: now }],
      }, 201);
    }

    if (!isConversationId(conversationId)) return chatError("This chat could not be found. Start a new conversation.");
    const token = bearerToken(request);
    if (!token) return chatResponse({ error: "This chat could not be verified. Start a new conversation." }, 401);
    const tokenHash = await hashVisitorToken(token);
    const conversation = await env.DB.prepare(
      "SELECT id, status FROM chat_conversations WHERE id = ? AND visitor_token_hash = ?",
    ).bind(conversationId, tokenHash).first();
    if (!conversation) return chatResponse({ error: "This chat could not be verified. Start a new conversation." }, 404);
    if (conversation.status !== "open") return chatResponse({ error: "This conversation is closed. Start a new chat if you need more help." }, 409);

    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO chat_messages (id, conversation_id, sender, body, created_at) VALUES (?, ?, 'visitor', ?, ?)",
      ).bind(crypto.randomUUID(), conversationId, body, now),
      env.DB.prepare(
        "UPDATE chat_conversations SET updated_at = ? WHERE id = ? AND visitor_token_hash = ? AND status = 'open'",
      ).bind(now, conversationId, tokenHash),
    ]);
    return chatResponse({ ok: true, message: { sender: "visitor", body, createdAt: now } }, 201);
  } catch (error) {
    console.error("Could not save a visitor chat message.", error);
    return chatResponse({ error: "Your message could not be saved. Please try again." }, 500);
  }
}
