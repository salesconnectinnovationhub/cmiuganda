import {
  authorizeChatStaff,
  chatDatabaseUnavailable,
  chatError,
  chatResponse,
  cleanText,
  hasSameOrigin,
  isConversationId,
  MAX_CHAT_MESSAGE_LENGTH,
  readChatJson,
} from "../../_shared/chat.js";
import { RECIPIENT, sendEmail } from "../../_shared/email.js";

function databaseUnavailable() {
  return chatDatabaseUnavailable();
}

export async function onRequestGet({ request, env }) {
  const staff = await authorizeChatStaff(request, env);
  if (staff.error) return staff.error;
  if (!env.DB) return databaseUnavailable();

  const conversationId = new URL(request.url).searchParams.get("conversationId");
  try {
    if (conversationId !== null) {
      if (!isConversationId(conversationId)) return chatError("Choose a valid conversation.");
      const conversation = await env.DB.prepare(
        "SELECT id, visitor_name AS visitorName, visitor_email AS visitorEmail, status, created_at AS createdAt, updated_at AS updatedAt FROM chat_conversations WHERE id = ?",
      ).bind(conversationId).first();
      if (!conversation) return chatResponse({ error: "Conversation not found." }, 404);
      const { results } = await env.DB.prepare(
        "SELECT id, sender, body, created_at AS createdAt FROM chat_messages WHERE conversation_id = ? ORDER BY created_at, id LIMIT 200",
      ).bind(conversationId).all();
      return chatResponse({ conversation, messages: results || [] });
    }

    const { results } = await env.DB.prepare(
      `SELECT c.id, c.visitor_name AS visitorName, c.visitor_email AS visitorEmail,
        c.status, c.created_at AS createdAt, c.updated_at AS updatedAt,
        (SELECT m.body FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS lastMessage
       FROM chat_conversations c ORDER BY CASE c.status WHEN 'open' THEN 0 ELSE 1 END, c.updated_at DESC LIMIT 100`,
    ).all();
    return chatResponse({ conversations: results || [], staffEmail: staff.email });
  } catch (error) {
    console.error("Could not load the staff chat inbox.", error);
    return chatResponse({ error: "The chat inbox could not be loaded." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!hasSameOrigin(request)) return chatResponse({ error: "Send staff replies from the CMI Group admin site." }, 403);
  const staff = await authorizeChatStaff(request, env);
  if (staff.error) return staff.error;
  if (!env.DB) return databaseUnavailable();

  const parsed = await readChatJson(request);
  if (parsed.error) return parsed.error;
  const { conversationId, message } = parsed.data || {};
  if (!isConversationId(conversationId)) return chatError("Choose a valid conversation.");
  const body = cleanText(message, MAX_CHAT_MESSAGE_LENGTH);
  if (!body) return chatError("Write a reply before sending.");
  if (typeof message !== "string" || message.trim().length > MAX_CHAT_MESSAGE_LENGTH) {
    return chatError(`Messages must be ${MAX_CHAT_MESSAGE_LENGTH} characters or fewer.`);
  }

  const now = new Date().toISOString();
  try {
    const conversation = await env.DB.prepare(
      "SELECT id, visitor_name AS visitorName, visitor_email AS visitorEmail FROM chat_conversations WHERE id = ?",
    )
      .bind(conversationId).first();
    if (!conversation) return chatResponse({ error: "Conversation not found." }, 404);
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO chat_messages (id, conversation_id, sender, body, created_at) VALUES (?, ?, 'staff', ?, ?)",
      ).bind(crypto.randomUUID(), conversationId, body, now),
      env.DB.prepare(
        "UPDATE chat_conversations SET status = 'open', updated_at = ? WHERE id = ?",
      ).bind(now, conversationId),
    ]);
    const notification = await sendEmail(env, {
      to: conversation.visitorEmail,
      replyTo: RECIPIENT,
      subject: "CMI Group has replied to your website chat",
      text: [
        `Hello ${conversation.visitorName},`,
        "",
        "CMI Group replied to your message:",
        "",
        body,
        "",
        "You can reply to this email or start another secure chat at https://cmigroupuganda.com/chat.html.",
        "For your privacy, do not forward this message if it contains information you consider private.",
      ].join("\n"),
    });
    return chatResponse({ ok: true, staffEmail: staff.email, visitorNotified: notification.status === 200 }, 201);
  } catch (error) {
    console.error("Could not save a staff chat reply.", error);
    return chatResponse({ error: "The reply could not be saved." }, 500);
  }
}

export async function onRequestPatch({ request, env }) {
  if (!hasSameOrigin(request)) return chatResponse({ error: "Update chats from the CMI Group admin site." }, 403);
  const staff = await authorizeChatStaff(request, env);
  if (staff.error) return staff.error;
  if (!env.DB) return databaseUnavailable();

  const parsed = await readChatJson(request);
  if (parsed.error) return parsed.error;
  const { conversationId, status } = parsed.data || {};
  if (!isConversationId(conversationId) || !["open", "closed"].includes(status)) {
    return chatError("Choose a valid conversation status.");
  }
  try {
    const result = await env.DB.prepare(
      "UPDATE chat_conversations SET status = ?, updated_at = ? WHERE id = ?",
    ).bind(status, new Date().toISOString(), conversationId).run();
    if (!result.meta?.changes) return chatResponse({ error: "Conversation not found." }, 404);
    return chatResponse({ ok: true, status });
  } catch (error) {
    console.error("Could not update chat status.", error);
    return chatResponse({ error: "The conversation status could not be updated." }, 500);
  }
}
