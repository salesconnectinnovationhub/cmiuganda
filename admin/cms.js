const collections = {
    property: {
        label: "Property listings",
        fields: [
            ["title", "Listing title", "text", true],
            ["slug", "URL-safe slug", "text", true],
            ["type", "Property type (Land, Residential, Commercial, Rental)", "text", true],
            ["location", "Location", "text", true],
            ["price", "Price as displayed", "text", true],
            ["status", "Availability (Available, Reserved, Sold, Rented)", "text", true],
            ["summary", "Summary", "textarea", true],
            ["features", "Features (one per line)", "textarea", false],
            ["images", "Approved site image paths (one per line)", "textarea", false],
            ["imageAlt", "Main image description", "text", false],
        ],
    },
    team: {
        label: "Team profiles",
        fields: [
            ["title", "Person's name", "text", true],
            ["slug", "URL-safe slug", "text", true],
            ["role", "Role or title", "text", true],
            ["bio", "Biography", "textarea", false],
            ["image", "Approved team image path", "text", false],
            ["imageAlt", "Image description", "text", false],
            ["sortOrder", "Display order (number)", "number", false],
        ],
    },
    partner: {
        label: "Partners",
        fields: [
            ["title", "Partner name", "text", true],
            ["slug", "URL-safe slug", "text", true],
            ["url", "Approved HTTPS website", "url", true],
            ["logo", "Approved logo image path", "text", true],
            ["imageAlt", "Logo description", "text", false],
            ["sortOrder", "Display order (number)", "number", false],
        ],
    },
    service: {
        label: "Services",
        fields: [
            ["title", "Service title", "text", true],
            ["slug", "URL-safe slug", "text", true],
            ["summary", "Description", "textarea", true],
            ["image", "Approved image path", "text", false],
            ["imageAlt", "Image description", "text", false],
            ["sortOrder", "Display order (number)", "number", false],
        ],
    },
    promotion: {
        label: "Promotions and announcements",
        fields: [
            ["title", "Promotion title", "text", true],
            ["slug", "URL-safe slug", "text", true],
            ["body", "Announcement text", "textarea", true],
            ["image", "Approved image path", "text", false],
            ["imageAlt", "Image description", "text", false],
            ["startAt", "Start date (YYYY-MM-DD)", "date", true],
            ["endAt", "End date (YYYY-MM-DD)", "date", true],
            ["frequencyDays", "Show again after dismissal (days, 1-365)", "number", true],
            ["buttonText", "Button label", "text", false],
            ["buttonUrl", "Button HTTPS URL", "url", false],
        ],
    },
};

const status = document.querySelector("#cms-status");
const app = document.querySelector("#cms-app");
const typeSelect = document.querySelector("#content-type");
const contentList = document.querySelector("#content-list");
const form = document.querySelector("#content-form");
const editorFields = document.querySelector("#editor-fields");
const editorHelp = document.querySelector("#editor-help");
const archiveButton = document.querySelector("#archive-item");
let items = [];
let selectedId = null;

for (const [type, collection] of Object.entries(collections)) {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = collection.label;
    typeSelect.append(option);
}

typeSelect.addEventListener("change", loadItems);
document.querySelector("#new-item").addEventListener("click", () => editItem(null));
document.querySelector("#reset-form").addEventListener("click", () => editItem(null));
form.addEventListener("submit", saveItem);
archiveButton.addEventListener("click", archiveItem);

loadItems();

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            accept: "application/json",
            ...(options.body ? { "content-type": "application/json" } : {}),
            ...options.headers,
        },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `CMS request failed (${response.status}).`);
    return result;
}

async function loadItems() {
    const type = typeSelect.value || Object.keys(collections)[0];
    if (!typeSelect.value) typeSelect.value = type;
    status.className = "alert alert-info cms-status";
    status.textContent = "Checking admin access and loading content...";
    form.hidden = true;
    contentList.replaceChildren();

    try {
        const result = await apiRequest(`/api/cms?type=${encodeURIComponent(type)}`);
        if (!result.isAdmin) throw new Error("Admin access required. Sign in using the approved CMI Group admin account.");
        items = result.items;
        app.hidden = false;
        status.className = "alert alert-success cms-status";
        status.textContent = `Admin access verified. ${items.length} ${collections[type].label.toLowerCase()} loaded.`;
        renderList();
    } catch (error) {
        app.hidden = true;
        status.className = "alert alert-danger cms-status";
        status.textContent = error.message || "CMS could not be loaded.";
    }
}

function renderList() {
    contentList.replaceChildren();
    if (!items.length) {
        const empty = document.createElement("p");
        empty.className = "text-muted";
        empty.textContent = "No content in this collection yet.";
        contentList.append(empty);
        return;
    }

    for (const item of items) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "list-group-item list-group-item-action cms-item";
        button.setAttribute("aria-current", String(item.id === selectedId));
        const title = document.createElement("strong");
        title.textContent = item.title;
        const meta = document.createElement("span");
        meta.className = "d-block small text-muted";
        meta.textContent = `${item.publicationStatus} · ${item.slug}`;
        button.append(title, meta);
        button.addEventListener("click", () => editItem(item));
        contentList.append(button);
    }
}

function editItem(item) {
    selectedId = item?.id || null;
    const type = typeSelect.value;
    editorFields.replaceChildren();
    form.hidden = false;
    archiveButton.hidden = !selectedId;
    editorHelp.textContent = selectedId
        ? `Editing ${item.title}. Drafts are not visible publicly.`
        : "Creating a new draft. Choose Published to make it visible on the website.";

    for (const [name, label, inputType, required] of collections[type].fields) {
        const wrapper = document.createElement("div");
        wrapper.className = "form-group";
        const id = `cms-${name}`;
        const fieldLabel = document.createElement("label");
        fieldLabel.className = "form-label";
        fieldLabel.htmlFor = id;
        fieldLabel.textContent = label;
        const input = inputType === "textarea"
            ? document.createElement("textarea")
            : document.createElement("input");
        input.className = "form-control";
        input.id = id;
        input.name = name;
        if (inputType !== "textarea") input.type = inputType;
        input.required = required;
        input.maxLength = name === "bio" || name === "body" || name === "summary" ? 3000 : 500;
        if (name === "frequencyDays") {
            input.min = "1";
            input.max = "365";
            input.step = "1";
        }
        if (inputType === "textarea") input.rows = 4;
        const value = item?.[name];
        if (Array.isArray(value)) input.value = value.join("\n");
        else if (value !== undefined && value !== null) input.value = String(value);
        else if (name === "frequencyDays") input.value = "7";
        if (name === "slug" && !selectedId) {
            const titleInput = editorFields.querySelector('[name="title"]');
            input.readOnly = true;
            titleInput?.addEventListener("input", () => {
                input.value = slugify(titleInput.value);
            });
        }
        wrapper.append(fieldLabel, input);
        editorFields.append(wrapper);
    }

    const publicationWrapper = document.createElement("div");
    publicationWrapper.className = "form-group";
    const publicationLabel = document.createElement("label");
    publicationLabel.htmlFor = "cms-publication-status";
    publicationLabel.textContent = "Publication";
    const publicationSelect = document.createElement("select");
    publicationSelect.id = "cms-publication-status";
    publicationSelect.name = "publicationStatus";
    publicationSelect.className = "form-control";
    for (const [value, label] of [["draft", "Draft"], ["published", "Published"], ["archived", "Archived"]]) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        publicationSelect.append(option);
    }
    publicationSelect.value = item?.publicationStatus || "draft";
    publicationWrapper.append(publicationLabel, publicationSelect);
    editorFields.append(publicationWrapper);
    renderList();
}

async function saveItem(event) {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const type = typeSelect.value;
    const item = {};
    for (const [name] of collections[type].fields) {
        const input = form.elements.namedItem(name);
        if (name === "features" || name === "images") {
            item[name] = input.value.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
        } else if (name === "sortOrder") {
            item[name] = input.value ? Number(input.value) : 0;
        } else if (name === "frequencyDays") {
            item[name] = Number(input.value);
        } else {
            item[name] = input.value.trim();
        }
    }
    item.publicationStatus = form.elements.publicationStatus.value;
    status.className = "alert alert-info cms-status";
    status.textContent = "Saving content...";

    try {
        const saved = await apiRequest("/api/cms", {
            method: selectedId ? "PUT" : "POST",
            body: JSON.stringify({ type, id: selectedId, item }),
        });
        selectedId = saved.id;
        status.className = "alert alert-success cms-status";
        status.textContent = item.publicationStatus === "published"
            ? "Content saved and published."
            : "Draft saved. It is not visible publicly.";
        await loadItems();
        const savedItem = items.find((entry) => entry.id === selectedId);
        if (savedItem) editItem(savedItem);
    } catch (error) {
        status.className = "alert alert-danger cms-status";
        status.textContent = error.message || "Content could not be saved.";
    }
}

async function archiveItem() {
    if (!selectedId || !window.confirm("Archive this item? Archived content will no longer be public.")) return;
    try {
        await apiRequest("/api/cms", {
            method: "DELETE",
            body: JSON.stringify({ id: selectedId }),
        });
        selectedId = null;
        status.className = "alert alert-success cms-status";
        status.textContent = "Content archived.";
        await loadItems();
        editItem(null);
    } catch (error) {
        status.className = "alert alert-danger cms-status";
        status.textContent = error.message || "Content could not be archived.";
    }
}

function slugify(value) {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
