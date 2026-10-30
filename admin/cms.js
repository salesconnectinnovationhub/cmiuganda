const collections = {
    property: {
        label: "Property listings",
        fields: [
            ["title", "Listing title", "text", true, "Use a short name visitors can recognize, such as \"Two-bedroom home in Entebbe\"."],
            ["slug", "URL-safe slug", "text", true, "Created automatically from the title; used internally to identify this item."],
            ["type", "Property type", "select", true, "Choose the closest match.", ["Land", "Residential", "Commercial", "Rental"]],
            ["location", "Location", "text", true, "Example: Entebbe, Wakiso District."],
            ["price", "Displayed price", "text", true, "Enter the amount and currency as visitors should see it, e.g. UGX 180,000,000 or Contact us."],
            ["status", "Availability", "select", true, "Choose the current availability.", ["Available", "Reserved", "Sold", "Rented"]],
            ["summary", "Summary", "textarea", true, "Describe the property in 1–3 sentences. Example: A serviced residential plot near the main road, with water and power nearby."],
            ["features", "Features (one per line)", "textarea", false, "Add one short feature per line, such as \"Road access\" or \"Water connection nearby\"."],
            ["images", "Property photos", "imageList", false, "Upload JPEG, PNG, or WebP images up to 5 MB each. The first photo is the listing thumbnail."],
            ["imageAlt", "Main image description", "text", false, "Describe what is visible, e.g. \"Front view of the house and garden\". Leave blank to use the listing title."],
        ],
    },
    team: {
        label: "Team profiles",
        fields: [
            ["title", "Person's name", "text", true, "Enter the name as it should appear publicly."],
            ["slug", "URL-safe slug", "text", true, "Created automatically from the name; used internally to identify this profile."],
            ["role", "Role or title", "text", true, "Example: Managing Director or Quantity Surveyor."],
            ["bio", "Biography", "textarea", false, "Add a short, approved biography. Keep it relevant to the person's CMI Group role."],
            ["image", "Team photo", "imagePicker", false, "Upload a JPEG, PNG, or WebP photo up to 5 MB."],
            ["imageAlt", "Photo description", "text", false, "Describe the person in the photo, e.g. \"Portrait of the Managing Director\"."],
            ["sortOrder", "Display order (number)", "number", false, "Use 1 for the first profile, 2 for the second, and so on."],
        ],
    },
    partner: {
        label: "Partners",
        fields: [
            ["title", "Partner name", "text", true, "Enter the partner name as it should appear publicly."],
            ["slug", "URL-safe slug", "text", true, "Created automatically from the name."],
            ["url", "Partner website (HTTPS)", "url", true, "Example: https://example.com"],
            ["logo", "Partner logo", "imagePicker", true, "Upload a JPEG, PNG, or WebP logo up to 5 MB."],
            ["imageAlt", "Logo description", "text", false, "Example: \"ABC Ltd logo\"."],
            ["sortOrder", "Display order (number)", "number", false, "Use 1 for the first partner, 2 for the second, and so on."],
        ],
    },
    service: {
        label: "Services",
        fields: [
            ["title", "Service title", "text", true, "Use a concise service name visitors will understand."],
            ["slug", "URL-safe slug", "text", true, "Created automatically from the title."],
            ["summary", "Description", "textarea", true, "Explain what the service includes in a few clear sentences."],
            ["image", "Service image", "imagePicker", false, "Upload a JPEG, PNG, or WebP image up to 5 MB."],
            ["imageAlt", "Image description", "text", false, "Describe the image for visitors using screen readers."],
            ["sortOrder", "Display order (number)", "number", false, "Use 1 for the first service, 2 for the second, and so on."],
        ],
    },
    promotion: {
        label: "Promotions and announcements",
        fields: [
            ["title", "Promotion title", "text", true, "Example: End-of-year building offer."],
            ["slug", "URL-safe slug", "text", true, "Created automatically from the title."],
            ["body", "Announcement text", "textarea", true, "Describe the offer, who it is for, and any important conditions."],
            ["image", "Promotion image", "imagePicker", false, "Upload a JPEG, PNG, or WebP image up to 5 MB."],
            ["imageAlt", "Image description", "text", false, "Describe the image for visitors using screen readers."],
            ["startAt", "Start date", "date", true, "The promotion starts on this date in Uganda time."],
            ["endAt", "End date", "date", true, "The promotion remains active through this date in Uganda time."],
            ["frequencyDays", "Show again after dismissal (days, 1-365)", "number", true, "How long a visitor who closes the pop-up waits before seeing it again."],
            ["buttonText", "Button label", "text", false, "Example: View the offer."],
            ["buttonUrl", "Button link (HTTPS)", "url", false, "Use a complete secure link, e.g. https://cmigroupuganda.com/contact.html."],
        ],
    },
    settings: {
        label: "Business contact details",
        fields: [
            ["title", "Settings name", "text", true, "Keep this as \"Business contact details\"."],
            ["slug", "Settings key", "text", true, "This record uses the fixed key business-contact."],
            ["publicEmail", "Public contact email", "email", true, "Used by public email links. This does not change the server-side form delivery inbox."],
            ["mainPhone", "Main phone number", "tel", true, "Include the country code, e.g. +256789612187."],
            ["alternatePhone", "Alternate phone number", "tel", true, "Include the country code, e.g. +256754433022."],
            ["whatsappUrl", "WhatsApp link", "url", false, "Use a secure wa.me or api.whatsapp.com link."],
            ["fortPortalAddress", "Fort Portal address", "textarea", false, "Enter the approved address shown on the contact page."],
            ["kampalaAddress", "Kampala address", "textarea", false, "Enter the approved address shown on the contact page."],
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
const preview = document.querySelector("#content-preview");
const previewDialog = document.querySelector("#preview-dialog");
const previewDialogContent = document.querySelector("#preview-dialog-content");
const historyPanel = document.querySelector("#revision-history");
const historyList = document.querySelector("#revision-list");
let items = [];
let selectedId = null;
let currentType = "";
let isDirty = false;
let cmsRole = null;

for (const [type, collection] of Object.entries(collections)) {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = collection.label;
    typeSelect.append(option);
}

typeSelect.addEventListener("change", () => {
    if (isDirty && !confirmDiscardChanges()) {
        typeSelect.value = currentType;
        return;
    }
    currentType = typeSelect.value;
    selectedId = null;
    isDirty = false;
    loadItems();
});
document.querySelector("#new-item").addEventListener("click", () => editItem(null));
document.querySelector("#reset-form").addEventListener("click", discardChanges);
document.querySelector("#preview-content").addEventListener("click", openPreview);
document.querySelector("#close-preview").addEventListener("click", () => previewDialog.close());
document.querySelector("#refresh-history").addEventListener("click", loadHistory);
form.addEventListener("submit", saveItem);
form.addEventListener("input", markFormDirty);
form.addEventListener("change", markFormDirty);
archiveButton.addEventListener("click", archiveItem);
window.addEventListener("beforeunload", (event) => {
    if (!isDirty) return;
    event.preventDefault();
    event.returnValue = "";
});

loadItems();

async function apiRequest(url, options = {}) {
    const isFormData = options.body instanceof FormData;
    const response = await fetch(url, {
        ...options,
        headers: {
            accept: "application/json",
            ...(options.body && !isFormData ? { "content-type": "application/json" } : {}),
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
    if (!currentType) currentType = type;
    status.className = "alert alert-info cms-status";
    status.textContent = "Checking admin access and loading content...";
    form.hidden = true;
    historyPanel.hidden = true;
    historyList.replaceChildren();
    contentList.replaceChildren();

    try {
        const result = await apiRequest(`/api/cms?type=${encodeURIComponent(type)}`);
        if (!result.isAdmin) throw new Error("Admin access required. Sign in using the approved CMI Group admin account.");
        cmsRole = result.role;
        items = result.items;
        if (result.role === "editor") {
            document.querySelector("#publish-content").hidden = true;
        }
        app.hidden = false;
        status.className = "alert alert-success cms-status";
        const roleLabel = cmsRole === "approver" ? "Approver" : "Editor";
        status.textContent = `${roleLabel} access verified. ${items.length} ${collections[type].label.toLowerCase()} loaded.`;
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
        meta.textContent = `${publicationLabel(item.publicationStatus)} · ${item.slug}`;
        if (cmsRole === "editor" && item.publicationStatus !== "draft") {
            button.disabled = true;
            meta.textContent += " · Approver-only";
        }
        button.append(title, meta);
        button.addEventListener("click", () => editItem(item));
        contentList.append(button);
    }
}

function editItem(item) {
    if (isDirty && !confirmDiscardChanges()) return;
    selectedId = item?.id || null;
    const type = typeSelect.value;
    editorFields.replaceChildren();
    form.hidden = false;
    historyPanel.hidden = !selectedId;
    archiveButton.hidden = !selectedId;
    document.querySelector("#publish-content").hidden = cmsRole !== "approver";
    archiveButton.hidden = !selectedId || cmsRole !== "approver" || type === "settings" || item?.publicationStatus === "archived";
    const itemHelp = selectedId
        ? `Editing ${item.title}. Current status: ${publicationLabel(item.publicationStatus)}.`
        : "Creating new content. Save it as a draft or publish it when it is ready.";
    editorHelp.textContent = cmsRole === "editor"
        ? `${itemHelp} Editors can save drafts only; an approver must publish them.`
        : `${itemHelp} Preview before publishing to make sure the content looks right.`;

    for (const [name, label, inputType, required, helpText, options] of collections[type].fields) {
        const wrapper = document.createElement("div");
        wrapper.className = "form-group";
        const id = `cms-${name}`;
        const fieldLabel = document.createElement("label");
        fieldLabel.className = "form-label";
        fieldLabel.htmlFor = id;
        fieldLabel.textContent = label;
        const isImagePicker = inputType === "imagePicker" || inputType === "imageList";
        const input = inputType === "textarea" || inputType === "imageList"
            ? document.createElement("textarea")
            : document.createElement(inputType === "select" ? "select" : "input");
        input.className = "form-control";
        input.id = id;
        input.name = name;
        if (inputType !== "textarea" && inputType !== "select") input.type = inputType === "imagePicker" ? "hidden" : inputType;
        if (inputType === "imageList") input.hidden = true;
        input.required = isImagePicker ? false : required;
        input.maxLength = name === "bio" || name === "body" || name === "summary" ? 3000 : 500;
        if (name === "frequencyDays") {
            input.min = "1";
            input.max = "365";
            input.step = "1";
        }
        if (inputType === "textarea") input.rows = 4;
        if (inputType === "select") {
            const placeholder = document.createElement("option");
            placeholder.value = "";
            placeholder.textContent = "Choose an option";
            input.append(placeholder);
            for (const optionValue of options || []) {
                const option = document.createElement("option");
                option.value = optionValue;
                option.textContent = optionValue;
                input.append(option);
            }
        }
        const value = item?.[name];
        if (Array.isArray(value)) input.value = value.join("\n");
        else if (value !== undefined && value !== null) input.value = String(value);
        else if (name === "frequencyDays") input.value = "7";
        else if (type === "settings" && name === "title") input.value = "Business contact details";
        else if (type === "settings" && name === "slug") input.value = "business-contact";
        else if (type === "settings" && name === "publicEmail") input.value = "cmi.groupuganda@gmail.com";
        else if (type === "settings" && name === "mainPhone") input.value = "+256789612187";
        else if (type === "settings" && name === "alternatePhone") input.value = "+256754433022";
        else if (type === "settings" && name === "whatsappUrl") input.value = "https://wa.me/message/DYT6JQFKYJNLF1";
        else if (type === "settings" && name === "fortPortalAddress") input.value = "Rukiidi 3 street, Daj plaza, Fort Portal, Uganda";
        else if (type === "settings" && name === "kampalaAddress") input.value = "Amizon House, Ground floor, opposite Mutungo parish catholic church, Nakawa Division Kampala, Uganda";
        if (name === "slug" && type === "settings") {
            input.readOnly = true;
            input.value = "business-contact";
        } else if (name === "title" && type === "settings") {
            input.readOnly = true;
            input.value = "Business contact details";
        } else if (name === "slug" && !selectedId) {
            const titleInput = editorFields.querySelector('[name="title"]');
            input.readOnly = true;
            titleInput?.addEventListener("input", () => {
                input.value = slugify(titleInput.value);
            });
        }
        wrapper.append(fieldLabel, input);
        if (isImagePicker) {
            const picker = document.createElement("input");
            picker.type = "file";
            picker.accept = "image/jpeg,image/png,image/webp";
            picker.multiple = inputType === "imageList";
            picker.className = "form-control-file mt-2";
            picker.setAttribute("aria-label", `Upload ${label.toLowerCase()}`);
            picker.addEventListener("change", () => uploadSelectedImages(name, input, picker));
            wrapper.append(picker);
            const imageList = document.createElement("div");
            imageList.className = "cms-image-list mt-3";
            imageList.dataset.imageField = name;
            wrapper.append(imageList);
            renderImagePicker(name, input, imageList);
        }
        if (helpText) {
            const help = document.createElement("small");
            help.className = "form-text text-muted";
            help.id = `${id}-help`;
            help.textContent = helpText;
            input.setAttribute("aria-describedby", help.id);
            wrapper.append(help);
        }
        editorFields.append(wrapper);
    }
    isDirty = false;
    renderPreview(type);
    renderList();
    if (selectedId) loadHistory();
    else historyList.replaceChildren();
}

async function saveItem(event) {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const type = typeSelect.value;
    const publicationStatus = event.submitter?.value === "published" && cmsRole === "approver" ? "published" : "draft";
    const currentItem = items.find((item) => item.id === selectedId);
    if (currentItem?.publicationStatus === "published"
        && publicationStatus === "draft"
        && !window.confirm("Saving this live item as a draft will remove it from the website. Continue?")) {
        return;
    }
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
    item.publicationStatus = publicationStatus;
    status.className = "alert alert-info cms-status";
    status.textContent = publicationStatus === "published" ? "Publishing content..." : "Saving draft...";
    setSaveButtonsDisabled(true);

    try {
        const saved = await apiRequest("/api/cms", {
            method: selectedId ? "PUT" : "POST",
            body: JSON.stringify({ type, id: selectedId, item }),
        });
        selectedId = saved.id;
        isDirty = false;
        await loadItems();
        status.className = "alert alert-success cms-status";
        status.textContent = publicationStatus === "published"
            ? "Live on website."
            : "Saved as draft. It is not visible on the website.";
        const savedItem = items.find((entry) => entry.id === selectedId);
        if (savedItem) editItem(savedItem);
    } catch (error) {
        status.className = "alert alert-danger cms-status";
        status.textContent = error.message
            ? `Could not save—please check these fields. ${error.message}`
            : "Could not save—please check these fields.";
    } finally {
        setSaveButtonsDisabled(false);
    }
}

async function loadHistory() {
    if (!selectedId || !historyList) return;
    const itemId = selectedId;
    historyList.replaceChildren();
    const loading = document.createElement("p");
    loading.className = "text-muted";
    loading.textContent = "Loading revisions...";
    historyList.append(loading);
    try {
        const result = await apiRequest(`/api/cms-revisions?id=${encodeURIComponent(itemId)}`);
        if (selectedId !== itemId) return;
        historyList.replaceChildren();
        if (!result.revisions.length) {
            const empty = document.createElement("p");
            empty.className = "text-muted";
            empty.textContent = "No saved revisions yet.";
            historyList.append(empty);
            return;
        }
        for (const revision of result.revisions) {
            const row = document.createElement("div");
            row.className = "list-group-item d-flex justify-content-between align-items-start flex-wrap";
            const description = document.createElement("div");
            const title = document.createElement("strong");
            title.textContent = `${publicationLabel(revision.publicationStatus)} · ${revision.action}`;
            const metadata = document.createElement("p");
            metadata.className = "small text-muted mb-0";
            metadata.textContent = `${revision.createdAt} · ${revision.actor}`;
            description.append(title, metadata);
            row.append(description);
            if (revision.publicationStatus !== "archived"
                && (cmsRole === "approver" || (cmsRole === "editor" && revision.publicationStatus === "draft"))) {
                const restore = document.createElement("button");
                restore.type = "button";
                restore.className = "btn btn-sm btn-outline-primary";
                restore.textContent = "Restore";
                restore.addEventListener("click", () => restoreRevision(revision));
                row.append(restore);
            }
            historyList.append(row);
        }
    } catch (error) {
        if (selectedId !== itemId) return;
        historyList.replaceChildren();
        const message = document.createElement("p");
        message.className = "text-danger";
        message.textContent = error.message || "Revision history could not be loaded.";
        historyList.append(message);
    }
}

async function restoreRevision(revision) {
    if (isDirty && !confirmDiscardChanges()) return;
    const message = revision.publicationStatus === "published"
        ? "Restore this version and make it live on the website?"
        : "Restore this saved draft?";
    if (!window.confirm(message)) return;
    try {
        const result = await apiRequest("/api/cms-revisions", {
            method: "POST",
            body: JSON.stringify({ itemId: selectedId, revisionId: revision.revisionId }),
        });
        isDirty = false;
        status.className = "alert alert-success cms-status";
        status.textContent = result.publicationStatus === "published"
            ? "Previous version restored and live on website."
            : result.publicationStatus === "archived"
                ? "The archived version remains hidden from the public."
                : "Previous draft restored.";
        await loadItems();
        const restoredItem = items.find((item) => item.id === selectedId);
        if (restoredItem) editItem(restoredItem);
    } catch (error) {
        status.className = "alert alert-danger cms-status";
        status.textContent = error.message || "Revision could not be restored.";
    }
}

async function archiveItem() {
    if (isDirty && !confirmDiscardChanges()) return;
    if (!selectedId || !window.confirm("Archive this item? Archived content will no longer be public.")) return;
    try {
        await apiRequest("/api/cms", {
            method: "DELETE",
            body: JSON.stringify({ id: selectedId }),
        });
        selectedId = null;
        isDirty = false;
        status.className = "alert alert-success cms-status";
        status.textContent = "Archived. It is no longer visible on the website.";
        await loadItems();
        editItem(null);
    } catch (error) {
        status.className = "alert alert-danger cms-status";
        status.textContent = error.message || "Content could not be archived.";
    }
}

function markFormDirty() {
    if (form.hidden) return;
    isDirty = true;
    renderPreview(typeSelect.value);
}

function confirmDiscardChanges() {
    return window.confirm("You have unsaved changes. Discard them and continue?");
}

function discardChanges() {
    if (isDirty && !confirmDiscardChanges()) return;
    isDirty = false;
    editItem(items.find((item) => item.id === selectedId) || null);
}

function publicationLabel(publicationStatus) {
    return ({
        draft: "Draft (not public)",
        published: "Live on website",
        archived: "Archived (not public)",
    })[publicationStatus] || "Unknown status";
}

function setSaveButtonsDisabled(disabled) {
    form.querySelectorAll('button[type="submit"]').forEach((button) => {
        button.disabled = disabled;
    });
}

function renderPreview(type) {
    if (!preview || !form) return;
    const value = (name) => String(form.elements.namedItem(name)?.value || "").trim();
    const cardBody = document.createElement("div");
    cardBody.className = "card-body";
    const title = document.createElement("h4");
    title.className = "card-title";
    title.textContent = value("title") || "Content title";
    const imagePath = type === "property"
        ? value("images").split(/\r?\n/).map((path) => path.trim()).find(Boolean)
        : value(type === "partner" ? "logo" : "image");
    if (imagePath && isApprovedImage(imagePath)) {
        const image = document.createElement("img");
        image.className = "card-img-top";
        image.src = cmsImageUrl(imagePath);
        image.alt = value("imageAlt") || value("title") || "Content image";
        image.loading = "lazy";
        image.addEventListener("error", () => {
            const placeholder = document.createElement("div");
            placeholder.className = "cms-preview-empty";
            placeholder.textContent = "Image could not be loaded. Check the path.";
            image.replaceWith(placeholder);
        }, { once: true });
        preview.replaceChildren(image, cardBody);
    } else {
        preview.replaceChildren(cardBody);
        if (type !== "partner" && type !== "settings") {
            const placeholder = document.createElement("div");
            placeholder.className = "cms-preview-empty";
            placeholder.textContent = "Image preview will appear here when an approved image path is added.";
            preview.prepend(placeholder);
        }
    }

    if (type === "settings") {
        for (const [name, label] of [
            ["publicEmail", "Public email"],
            ["mainPhone", "Main phone"],
            ["alternatePhone", "Alternate phone"],
            ["whatsappUrl", "WhatsApp"],
            ["fortPortalAddress", "Fort Portal office"],
            ["kampalaAddress", "Kampala office"],
        ]) {
            const detail = document.createElement("p");
            detail.textContent = `${label}: ${value(name) || "Not set"}`;
            cardBody.append(detail);
        }
        return;
    }

    if (type === "property") {
        const meta = document.createElement("p");
        meta.className = "text-uppercase text-muted mb-2";
        meta.textContent = [value("type") || "Property type", value("status") || "Availability"].join(" · ");
        const location = document.createElement("p");
        location.textContent = value("location") || "Property location";
        const price = document.createElement("p");
        price.className = "font-weight-bold";
        price.textContent = value("price") || "Displayed price";
        const summary = document.createElement("p");
        summary.textContent = value("summary") || "A short property summary will appear here.";
        cardBody.append(meta, title, location, price, summary);
        const features = value("features").split(/\r?\n/).map((feature) => feature.trim()).filter(Boolean);
        if (features.length) {
            const list = document.createElement("ul");
            for (const feature of features) {
                const item = document.createElement("li");
                item.textContent = feature;
                list.append(item);
            }
            cardBody.append(list);
        }
        const link = document.createElement("span");
        link.className = "btn mt-2";
        link.textContent = "Enquire about this property";
        cardBody.append(link);
        return;
    }

    cardBody.append(title);
    const description = document.createElement("p");
    description.textContent = value(type === "promotion" ? "body" : type === "team" ? "bio" : "summary")
        || "Your content description will appear here.";
    cardBody.append(description);

    if (type === "team") {
        const role = document.createElement("p");
        role.className = "text-muted";
        role.textContent = value("role") || "Role or title";
        cardBody.insertBefore(role, description);
    } else if (type === "partner" && value("url")) {
        const link = document.createElement("p");
        link.className = "text-muted";
        link.textContent = value("url");
        cardBody.append(link);
    } else if (type === "promotion" && value("buttonText")) {
        const button = document.createElement("span");
        button.className = "btn mt-2";
        button.textContent = value("buttonText");
        cardBody.append(button);
    }
}

function isApprovedImage(path) {
    return typeof path === "string"
        && (/^(images|img|teamimages|propertyimages)\/[A-Za-z0-9_./-]+$/.test(path) && !path.split("/").includes("..")
            || /^cms-media\/(property|team|partner|service|promotion)\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(path));
}

function cmsImageUrl(path) {
    return path.startsWith("cms-media/")
        ? `/api/cms-media?key=${encodeURIComponent(path)}`
        : path;
}

async function uploadSelectedImages(name, input, picker) {
    const files = Array.from(picker.files || []);
    picker.value = "";
    if (!files.length) return;

    picker.disabled = true;
    status.className = "alert alert-info cms-status";
    status.textContent = files.length === 1 ? "Uploading image..." : `Uploading ${files.length} images...`;
    try {
        const uploaded = [];
        for (const file of files) {
            const body = new FormData();
            body.append("collection", typeSelect.value);
            body.append("image", file);
            const result = await apiRequest("/api/cms-media", { method: "POST", body });
            uploaded.push(result.key);
            if (name === "images") {
                const current = input.value.split(/\r?\n/).map((path) => path.trim()).filter(Boolean);
                input.value = [...current, result.key].join("\n");
            } else {
                input.value = result.key;
            }
        }

        isDirty = true;
        renderImagePicker(name, input, editorFields.querySelector(`[data-image-field="${name}"]`));
        renderPreview(typeSelect.value);
        status.className = "alert alert-success cms-status";
        status.textContent = uploaded.length === 1 ? "Image uploaded. Save the draft to keep this change." : `${uploaded.length} images uploaded. Save the draft to keep these changes.`;
    } catch (error) {
        if (uploaded.length) {
            isDirty = true;
            renderImagePicker(name, input, editorFields.querySelector(`[data-image-field="${name}"]`));
            renderPreview(typeSelect.value);
        }
        status.className = "alert alert-danger cms-status";
        status.textContent = uploaded.length
            ? `${uploaded.length} image${uploaded.length === 1 ? "" : "s"} uploaded; another upload failed. ${error.message || "Please retry."}`
            : error.message || "Image upload failed. Please try again.";
    } finally {
        picker.disabled = false;
    }
}

function renderImagePicker(name, input, container) {
    if (!container) return;
    container.replaceChildren();
    const paths = name === "images"
        ? input.value.split(/\r?\n/).map((path) => path.trim()).filter(Boolean)
        : input.value.trim() ? [input.value.trim()] : [];
    for (const path of paths) {
        const item = document.createElement("div");
        item.className = "cms-image-item";
        const image = document.createElement("img");
        image.src = cmsImageUrl(path);
        image.alt = "";
        image.loading = "lazy";
        image.addEventListener("error", () => {
            image.alt = "Image could not be loaded";
            image.replaceWith(Object.assign(document.createElement("p"), {
                className: "cms-help",
                textContent: "Image unavailable",
            }));
        }, { once: true });
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "btn btn-sm btn-outline-danger mt-1";
        remove.textContent = "Remove image";
        remove.addEventListener("click", () => {
            if (name === "images") {
                input.value = paths.filter((entry) => entry !== path).join("\n");
            } else {
                input.value = "";
            }
            isDirty = true;
            renderImagePicker(name, input, container);
            renderPreview(typeSelect.value);
        });
        item.append(image, remove);
        container.append(item);
    }
    if (!paths.length) {
        const empty = document.createElement("p");
        empty.className = "form-text text-muted";
        empty.textContent = "No image selected yet.";
        container.append(empty);
    }
}

function openPreview() {
    renderPreview(typeSelect.value);
    previewDialogContent.replaceChildren(preview.cloneNode(true));
    previewDialog.showModal();
}

function slugify(value) {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
