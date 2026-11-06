const status = document.querySelector("#analytics-status");
const daysSelect = document.querySelector("#analytics-days");
const results = document.querySelector("#analytics-results");
const eventLabels = {
    consultation_click: "Consultation CTA click",
    contact_submit: "Contact form accepted",
    interest_submit: "Interest form accepted",
    estimator_handoff: "Estimator to contact handoff",
    phone_click: "Phone link click",
    whatsapp_click: "WhatsApp link click",
    chat_click: "Chat link click",
    payment_start: "PesaPal payment start",
    payment_return: "Payment return page visited (unverified)",
};

daysSelect.addEventListener("change", loadAnalytics);
loadAnalytics();

async function loadAnalytics() {
    status.className = "alert alert-info";
    status.textContent = "Loading aggregate conversion data...";
    results.replaceChildren();
    try {
        const response = await fetch(`/api/analytics?days=${encodeURIComponent(daysSelect.value)}`, {
            headers: { accept: "application/json" },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `Analytics request failed (${response.status}).`);

        const totals = new Map();
        for (const event of data.events) {
            const key = `${event.event}\n${event.path}`;
            totals.set(key, (totals.get(key) || 0) + event.count);
        }
        const sortedTotals = [...totals.entries()].sort((first, second) => second[1] - first[1]);
        if (!sortedTotals.length) {
            status.className = "alert alert-secondary";
            status.textContent = `No conversion events recorded in the last ${data.days} days.`;
            return;
        }

        const fragment = document.createDocumentFragment();
        for (const [key, count] of sortedTotals) {
            const [event, path] = key.split("\n");
            const row = document.createElement("tr");
            const eventCell = document.createElement("th");
            eventCell.scope = "row";
            eventCell.textContent = eventLabels[event] || event;
            const pathCell = document.createElement("td");
            pathCell.textContent = path;
            const countCell = document.createElement("td");
            countCell.textContent = new Intl.NumberFormat().format(count);
            row.append(eventCell, pathCell, countCell);
            fragment.append(row);
        }
        results.replaceChildren(fragment);
        status.className = "alert alert-success";
        status.textContent = `Showing ${sortedTotals.length} event and page combinations for the last ${data.days} days.`;
    } catch (error) {
        status.className = "alert alert-danger";
        status.textContent = error.message || "Conversion analytics could not be loaded.";
    }
}