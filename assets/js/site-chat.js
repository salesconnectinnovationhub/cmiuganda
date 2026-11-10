(() => {
    const storageKey = "cmi-site-chat";
    const startForm = document.querySelector("#chat-start-form");
    const thread = document.querySelector("#chat-thread");
    if (!startForm || !thread) return;

    const status = document.querySelector("#chat-status");
    const startError = document.querySelector("#chat-start-error");
    const replyError = document.querySelector("#chat-reply-error");
    const replyNotice = document.querySelector("#chat-reply-notice");
    const replyForm = document.querySelector("#chat-reply-form");
    const messages = document.querySelector("#chat-messages");
    const newButton = document.querySelector("#chat-new-button");
    let activeConversation = null;
    let activeToken = null;
    let polling = false;
    let renderedMessageKeys = new Set();

    function saveSession() {
        sessionStorage.setItem(storageKey, JSON.stringify({
            conversationId: activeConversation.id,
            token: activeToken,
        }));
    }

    function clearSession() {
        sessionStorage.removeItem(storageKey);
        activeConversation = null;
        activeToken = null;
        renderedMessageKeys = new Set();
    }

    function showChat() {
        startForm.hidden = true;
        thread.hidden = false;
    }

    function showStartForm() {
        thread.hidden = true;
        startForm.hidden = false;
    }

    function addMessage(message) {
        const key = message.id || `${message.sender}:${message.createdAt}:${message.body}`;
        if (renderedMessageKeys.has(key)) return;
        renderedMessageKeys.add(key);
        const item = document.createElement("li");
        item.className = `chat-message chat-message--${message.sender === "visitor" ? "visitor" : "staff"}`;
        const meta = document.createElement("span");
        meta.className = "chat-message-meta";
        const date = new Date(message.createdAt);
        meta.textContent = `${message.sender === "visitor" ? "You" : "CMI Group"} · ${Number.isNaN(date.getTime()) ? "" : date.toLocaleString()}`;
        const body = document.createElement("span");
        body.textContent = message.body;
        item.append(meta, body);
        messages.append(item);
        messages.scrollTop = messages.scrollHeight;
    }

    function setClosed(isClosed) {
        const textarea = replyForm.querySelector("textarea");
        const submit = replyForm.querySelector('[type="submit"]');
        textarea.disabled = isClosed;
        submit.disabled = isClosed;
        replyNotice.textContent = isClosed
            ? "This conversation has been closed by CMI Group."
            : "Replies are sent to the CMI Group team.";
        newButton.hidden = !isClosed;
    }

    async function request(url, options = {}) {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...(options.headers || {}),
                ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
            },
            credentials: "same-origin",
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Chat is temporarily unavailable.");
        return data;
    }

    async function refreshConversation() {
        if (!activeConversation || polling) return;
        polling = true;
        try {
            const data = await request(`/api/chat?conversationId=${encodeURIComponent(activeConversation.id)}`);
            activeConversation = data.conversation;
            showChat();
            for (const message of data.messages) addMessage(message);
            setClosed(data.conversation.status !== "open");
        } catch (error) {
            if (/could not be found|could not be verified/i.test(error.message)) {
                clearSession();
                showStartForm();
                status.textContent = "This chat could not be restored. Start a new conversation.";
                startError.textContent = error.message;
            } else {
                replyNotice.textContent = error.message;
            }
        } finally {
            polling = false;
        }
    }

    function saveRequest(body) {
        return request("/api/chat", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
        });
    }

    startForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        startError.textContent = "";
        const submit = startForm.querySelector('[type="submit"]');
        submit.disabled = true;
        status.textContent = "Sending your message...";
        const formData = new FormData(startForm);
        try {
            const data = await saveRequest({
                name: formData.get("name"),
                email: formData.get("email"),
                message: formData.get("message"),
                website: formData.get("website"),
            });
            activeConversation = data.conversation;
            activeToken = data.token;
            saveSession();
            messages.replaceChildren();
            renderedMessageKeys = new Set();
            showChat();
            status.textContent = "Your conversation is open. We’ll email you when the team replies.";
            replyNotice.textContent = data.staffNotified
                ? "Your message has been sent to the CMI Group team."
                : "Your message is saved, but our email alert did not send. For urgent help, use the contact details below.";
            await refreshConversation();
            startForm.reset();
        } catch (error) {
            startError.textContent = error.message;
            status.textContent = "We couldn’t send your message.";
        } finally {
            submit.disabled = false;
        }
    });

    replyForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        replyError.textContent = "";
        const submit = replyForm.querySelector('[type="submit"]');
        const textarea = replyForm.querySelector("textarea");
        submit.disabled = true;
        try {
            const data = await saveRequest({
                conversationId: activeConversation.id,
                message: textarea.value,
            });
            textarea.value = "";
            replyNotice.textContent = data.staffNotified
                ? "Message sent to CMI Group."
                : "Message saved, but our email alert did not send. For urgent help, use the contact details below.";
            await refreshConversation();
        } catch (error) {
            replyError.textContent = error.message;
        } finally {
            submit.disabled = false;
        }
    });

    newButton.addEventListener("click", () => {
        clearSession();
        messages.replaceChildren();
        showStartForm();
        status.textContent = "Start a new conversation with CMI Group.";
        startError.textContent = "";
        startForm.querySelector("input[name=name]").focus();
    });

    function restoreSession() {
        const hash = new URLSearchParams(location.hash.slice(1));
        const linkedId = hash.get("conversation");
        const linkedToken = hash.get("token");
        if (linkedId && linkedToken) {
            sessionStorage.setItem(storageKey, JSON.stringify({ conversationId: linkedId, token: linkedToken }));
            history.replaceState(null, "", `${location.pathname}${location.search}`);
        }
        try {
            const saved = JSON.parse(sessionStorage.getItem(storageKey) || "null");
            if (!saved || !/^[0-9a-f-]{36}$/i.test(saved.conversationId) || !/^[A-Za-z0-9_-]{40,64}$/.test(saved.token)) {
                clearSession();
                return;
            }
            activeConversation = { id: saved.conversationId, status: "open" };
            activeToken = saved.token;
            showChat();
            refreshConversation();
        } catch {
            clearSession();
        }
    }

    restoreSession();
    window.setInterval(refreshConversation, 5000);
})();
