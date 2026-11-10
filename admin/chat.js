(() => {
    const status = document.querySelector("#inbox-status");
    const list = document.querySelector("#inbox-items");
    const staffEmail = document.querySelector("#staff-email");
    const threadEmpty = document.querySelector("#thread-empty");
    const threadContent = document.querySelector("#thread-content");
    const heading = document.querySelector("#thread-heading");
    const emailLink = document.querySelector("#visitor-email");
    const details = document.querySelector("#thread-details");
    const messages = document.querySelector("#staff-messages");
    const replyForm = document.querySelector("#staff-reply-form");
    const replyInput = document.querySelector("#staff-reply");
    const replyError = document.querySelector("#reply-error");
    const replyNotice = document.querySelector("#reply-notice");
    const statusButton = document.querySelector("#toggle-status");
    let selectedId = null;
    let conversationList = [];
    let refreshing = false;
    let renderedMessageIds = new Set();

    async function api(url, options = {}) {
        const response = await fetch(url, {
            ...options,
            credentials: "same-origin",
            headers: { ...(options.headers || {}) },
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
        return result;
    }

    function showStatus(message, isError = false) {
        status.textContent = message;
        status.classList.toggle("alert-danger", isError);
        status.classList.toggle("alert-info", !isError);
    }

    function renderList() {
        list.replaceChildren();
        if (!conversationList.length) {
            const empty = document.createElement("p");
            empty.className = "text-muted";
            empty.textContent = "No conversations yet.";
            list.append(empty);
            return;
        }
        for (const conversation of conversationList) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "inbox-item";
            button.setAttribute("aria-current", String(conversation.id === selectedId));
            const name = document.createElement("strong");
            name.textContent = `${conversation.visitorName} · ${conversation.status}`;
            const lastMessage = document.createElement("span");
            lastMessage.textContent = conversation.lastMessage || "No messages";
            const date = document.createElement("span");
            date.textContent = new Date(conversation.updatedAt).toLocaleString();
            button.append(name, lastMessage, date);
            button.addEventListener("click", () => selectConversation(conversation.id));
            list.append(button);
        }
    }

    function renderMessages(items) {
        for (const message of items) {
            if (renderedMessageIds.has(message.id)) continue;
            renderedMessageIds.add(message.id);
            const item = document.createElement("li");
            item.className = `chat-message chat-message--${message.sender === "visitor" ? "visitor" : "staff"}`;
            const meta = document.createElement("span");
            meta.className = "chat-message-meta";
            const date = new Date(message.createdAt);
            meta.textContent = `${message.sender === "visitor" ? "Visitor" : "CMI Group"} · ${Number.isNaN(date.getTime()) ? "" : date.toLocaleString()}`;
            const body = document.createElement("span");
            body.textContent = message.body;
            item.append(meta, body);
            messages.append(item);
        }
        messages.scrollTop = messages.scrollHeight;
    }

    async function loadConversation() {
        if (!selectedId) return;
        const data = await api(`/api/chat/admin?conversationId=${encodeURIComponent(selectedId)}`);
        if (selectedId !== data.conversation.id) return;
        heading.textContent = `${data.conversation.visitorName} · ${data.conversation.status}`;
        emailLink.textContent = data.conversation.visitorEmail;
        emailLink.href = `mailto:${encodeURIComponent(data.conversation.visitorEmail)}`;
        details.textContent = `Started ${new Date(data.conversation.createdAt).toLocaleString()}`;
        statusButton.textContent = data.conversation.status === "open" ? "Close conversation" : "Reopen conversation";
        replyInput.disabled = false;
        replyForm.querySelector('[type="submit"]').disabled = false;
        threadEmpty.hidden = true;
        threadContent.hidden = false;
        renderMessages(data.messages);
    }

    async function selectConversation(id) {
        selectedId = id;
        renderedMessageIds = new Set();
        messages.replaceChildren();
        renderList();
        threadEmpty.hidden = false;
        threadEmpty.textContent = "Loading conversation…";
        threadContent.hidden = true;
        try {
            await loadConversation();
        } catch (error) {
            threadEmpty.textContent = error.message;
        }
    }

    async function refreshInbox() {
        if (refreshing) return;
        refreshing = true;
        try {
            const data = await api("/api/chat/admin");
            staffEmail.textContent = data.staffEmail;
            conversationList = data.conversations;
            renderList();
            showStatus("Chat inbox is connected. New visitor messages refresh automatically.");
            if (selectedId && conversationList.some((item) => item.id === selectedId)) {
                await loadConversation();
            } else if (selectedId) {
                selectedId = null;
                threadContent.hidden = true;
                threadEmpty.hidden = false;
                threadEmpty.textContent = "This conversation is no longer available.";
            }
        } catch (error) {
            showStatus(error.message, true);
        } finally {
            refreshing = false;
        }
    }

    document.querySelector("#refresh-inbox").addEventListener("click", refreshInbox);

    statusButton.addEventListener("click", async () => {
        if (!selectedId) return;
        const item = conversationList.find((conversation) => conversation.id === selectedId);
        const nextStatus = item?.status === "open" ? "closed" : "open";
        statusButton.disabled = true;
        try {
            await api("/api/chat/admin", {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ conversationId: selectedId, status: nextStatus }),
            });
            await refreshInbox();
        } catch (error) {
            replyError.textContent = error.message;
        } finally {
            statusButton.disabled = false;
        }
    });

    replyForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        replyError.textContent = "";
        const button = replyForm.querySelector('[type="submit"]');
        button.disabled = true;
        try {
            const data = await api("/api/chat/admin", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ conversationId: selectedId, message: replyInput.value }),
            });
            replyInput.value = "";
            replyNotice.textContent = data.visitorNotified
                ? "Reply sent and an email notification was delivered."
                : "Reply saved, but the visitor email notification could not be delivered.";
            await refreshInbox();
        } catch (error) {
            replyError.textContent = error.message;
        } finally {
            button.disabled = false;
        }
    });

    refreshInbox();
    window.setInterval(refreshInbox, 10000);
})();
