const cmsContentCache = new Map();

if (window.location.protocol !== "file:") {
    loadBusinessContactSettings();
    if (document.querySelector("#cms-team-status")) loadManagedTeam();
    if (document.querySelector("#cms-partners")) loadManagedPartners();
    if (document.querySelector("#cms-services")) loadManagedServices();
    if (document.querySelector("#cms-resources")) loadManagedResources();
    loadActivePromotion();
}

async function loadBusinessContactSettings() {
    try {
        const records = await loadCmsItems("settings");
        const settings = records.find((item) => item.slug === "business-contact");
        if (!settings) return;
        updateContactLinks(settings);
    } catch (error) {
        console.warn("Business contact settings are temporarily unavailable.", error);
    }
}

function updateContactLinks(settings) {
    const oldEmail = "cmi.groupuganda@gmail.com";
    if (typeof settings.publicEmail === "string" && settings.publicEmail) {
        document.querySelectorAll('a[href^="mailto:"]').forEach((link) => {
            const [address, query = ""] = link.getAttribute("href").slice(7).split("?", 2);
            if (address.toLowerCase() !== oldEmail) return;
            link.href = `mailto:${settings.publicEmail}${query ? `?${query}` : ""}`;
            replaceText(link, oldEmail, settings.publicEmail);
        });
    }

    const defaultPhones = ["256789612187", "256754433022"];
    const newPhones = [settings.mainPhone, settings.alternatePhone];
    document.querySelectorAll('a[href^="tel:"]').forEach((link) => {
        const original = link.getAttribute("href").slice(4).replace(/\D/g, "");
        const index = defaultPhones.indexOf(original);
        if (index < 0 || typeof newPhones[index] !== "string" || !newPhones[index]) return;
        const digits = newPhones[index].replace(/\D/g, "");
        const international = digits.startsWith("0") ? `+256${digits.slice(1)}` : `+${digits}`;
        link.href = `tel:${international}`;
        replacePhoneText(link, original, international);
    });

    if (Object.hasOwn(settings, "whatsappUrl")) {
        document.querySelectorAll('a[href="https://wa.me/message/DYT6JQFKYJNLF1"]').forEach((link) => {
            if (settings.whatsappUrl) link.href = settings.whatsappUrl;
            else link.hidden = true;
        });
    }

    const officeAddresses = [
        { match: /rukiidi 3 street|daj plaza/i, field: "fortPortalAddress" },
        { match: /amizon house|nakawa division/i, field: "kampalaAddress" },
    ];
    document.querySelectorAll('a[href="#"]').forEach((link) => {
        const replacement = officeAddresses.find((office) => Object.hasOwn(settings, office.field) && office.match.test(link.textContent));
        if (!replacement) return;
        if (!settings[replacement.field]) {
            const listItem = link.closest("li");
            if (listItem) listItem.hidden = true;
            else link.hidden = true;
            return;
        }
        const icon = link.querySelector("i");
        link.replaceChildren(...(icon ? [icon, document.createTextNode(settings[replacement.field])] : [document.createTextNode(settings[replacement.field])]));
    });
}

function replaceText(element, oldValue, newValue) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
        node.nodeValue = node.nodeValue.replace(new RegExp(escapeRegExp(oldValue), "gi"), newValue);
    }
}

function replacePhoneText(element, oldDigits, newPhone) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
        const match = node.nodeValue.match(/(?:\+?\s*\(?\s*256\s*\)?|0)?[\s()-]*[0-9][0-9\s()-]{6,}/);
        if (match && match[0].replace(/\D/g, "").includes(oldDigits)) {
            node.nodeValue = node.nodeValue.replace(match[0], newPhone);
        }
    }
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function loadCmsItems(type) {
    if (!cmsContentCache.has(type)) {
        const request = fetch(`/api/cms?type=${encodeURIComponent(type)}`, {
            headers: { accept: "application/json" },
        }).then(async (response) => {
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Content is temporarily unavailable.");
            if (!Array.isArray(result.items)) throw new Error("Content response is invalid.");
            return result.items.filter((item) => item.publicationStatus === "published");
        }).catch((error) => {
            cmsContentCache.delete(type);
            throw error;
        });
        cmsContentCache.set(type, request);
    }
    return cmsContentCache.get(type);
}

async function loadManagedTeam() {
    const container = document.querySelector("#team-container");
    const status = document.querySelector("#cms-team-status");
    if (!container || !status) return;
    try {
        const members = await loadCmsItems("team");
        if (!members.length) return;
        members.sort((first, second) => (first.sortOrder || 0) - (second.sortOrder || 0));
        const fragment = document.createDocumentFragment();
        for (const member of members) {
            const column = document.createElement("div");
            column.className = "col-lg-4 col-md-6";
            const card = document.createElement("article");
            card.className = "team-member";
            if (member.image && isApprovedImage(member.image)) {
                const image = document.createElement("img");
                image.src = cmsImageUrl(member.image);
                image.alt = member.imageAlt || member.title;
                image.loading = "lazy";
                image.decoding = "async";
                card.append(image);
            }
            const details = document.createElement("div");
            details.className = "member-details";
            const name = document.createElement("h3");
            name.className = "member-name";
            name.textContent = member.title;
            const role = document.createElement("p");
            role.className = "member-title";
            role.textContent = member.role || "";
            details.append(name, role);
            if (member.bio) {
                const bio = document.createElement("p");
                bio.className = "member-bio";
                bio.textContent = member.bio;
                details.append(bio);
            }
            card.append(details);
            column.append(card);
            fragment.append(column);
        }
        container.replaceChildren(fragment);
        status.hidden = true;
    } catch (error) {
        status.hidden = false;
        status.textContent = error.message || "Team profiles are temporarily unavailable.";
    }
}

async function loadManagedPartners() {
    const existing = document.querySelector("#cms-partners");
    if (!existing) return;
    try {
        const partners = await loadCmsItems("partner");
        if (!partners.length) return;
        partners.sort((first, second) => (first.sortOrder || 0) - (second.sortOrder || 0));
        const section = document.createElement("section");
        section.className = "brand-area cms-partner-area";
        const inner = document.createElement("div");
        inner.className = "container";
        const title = document.createElement("h2");
        title.className = "text-center mb-4";
        title.textContent = "Our partners";
        const row = document.createElement("div");
        row.className = "row justify-content-center";
        for (const partner of partners) {
            if (!partner.url || !isApprovedImage(partner.logo)) continue;
            const column = document.createElement("div");
            column.className = "col-6 col-md-3 mb-3";
            const link = document.createElement("a");
            link.href = partner.url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.setAttribute("aria-label", `Visit ${partner.title} website (opens in a new tab)`);
            const image = document.createElement("img");
            image.className = "img-fluid";
            image.src = cmsImageUrl(partner.logo);
            image.alt = partner.imageAlt || `${partner.title} logo`;
            image.loading = "lazy";
            image.decoding = "async";
            link.append(image);
            column.append(link);
            row.append(column);
        }
        if (!row.childElementCount) return;
        inner.append(title, row);
        section.append(inner);
        existing.closest(".brand-area")?.after(section);
    } catch (error) {
        console.error("Could not load partner logos.", error);
    }
}

async function loadManagedServices() {
    const container = document.querySelector("#cms-services");
    if (!container) return;
    try {
        const services = await loadCmsItems("service");
        services.sort((first, second) => (first.sortOrder || 0) - (second.sortOrder || 0));
        const fragment = document.createDocumentFragment();
        for (const service of services) {
            const column = document.createElement("div");
            column.className = "col-lg-4 mb-4";
            const card = document.createElement("article");
            card.className = "subsection p-4 bg-light h-100";
            if (service.image && isApprovedImage(service.image)) {
                const image = document.createElement("img");
                image.className = "img-fluid mb-3";
                image.src = cmsImageUrl(service.image);
                image.alt = service.imageAlt || service.title;
                image.loading = "lazy";
                image.decoding = "async";
                card.append(image);
            }
            const title = document.createElement("h3");
            title.className = "subsection-title";
            title.textContent = service.title;
            const summary = document.createElement("p");
            summary.className = "subsection-description";
            summary.textContent = service.summary || "";
            card.append(title, summary);
            column.append(card);
            fragment.append(column);
        }
        container.replaceChildren(fragment);
    } catch (error) {
        const message = document.createElement("p");
        message.className = "text-center";
        message.textContent = error.message || "Services are temporarily unavailable.";
        container.replaceChildren(message);
    }
}

async function loadManagedResources() {
    const container = document.querySelector("#cms-resources");
    if (!container) return;
    try {
        const resources = await loadCmsItems("resource");
        if (!resources.length) return;
        const fragment = document.createDocumentFragment();
        for (const resource of resources) {
            if (!resource.file || !/^cms-media\/resource\/[0-9a-f-]{36}\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/.test(resource.file)) continue;
            const column = document.createElement("div");
            column.className = "col-md-6 mb-4";
            const card = document.createElement("article");
            card.className = "card h-100";
            const icon = document.createElement("i");
            icon.className = "fas fa-file-alt card-img-top text-center";
            icon.style.cssText = "font-size:4rem;padding:20px";
            icon.setAttribute("aria-hidden", "true");
            const body = document.createElement("div");
            body.className = "card-body text-center";
            const title = document.createElement("h3");
            title.className = "card-title h5";
            title.textContent = resource.title;
            body.append(title);
            if (resource.summary) {
                const description = document.createElement("p");
                description.className = "card-text";
                description.textContent = resource.summary;
                body.append(description);
            }
            const link = document.createElement("a");
            link.href = cmsImageUrl(resource.file);
            link.className = "btn btn-primary";
            link.textContent = "Download";
            link.setAttribute("aria-label", `Download ${resource.title}`);
            body.append(link);
            card.append(icon, body);
            column.append(card);
            fragment.append(column);
        }
        if (fragment.childElementCount) container.replaceChildren(fragment);
    } catch (error) {
        console.error("Could not load support resources.", error);
    }
}

async function loadActivePromotion() {
    try {
        const promotions = await loadCmsItems("promotion");
        const today = kampalaCalendarDate();
        const promotion = promotions.find((item) =>
            item.slug
            && isCalendarDate(item.startAt)
            && isCalendarDate(item.endAt)
            && item.startAt <= today
            && item.endAt >= today
            && !wasPromotionDismissed(item));
        if (!promotion) return;
        showPromotion(promotion);
    } catch (error) {
        console.error("Could not load current CMI Group announcements.", error);
    }
}

function kampalaCalendarDate() {
    const parts = new Intl.DateTimeFormat("en", {
        timeZone: "Africa/Kampala",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
}

function isCalendarDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function promotionDismissalKey(promotion) {
    return `cmi-promotion-dismissed-${promotion.slug}`;
}

function wasPromotionDismissed(promotion) {
    try {
        const dismissedAt = Number(localStorage.getItem(promotionDismissalKey(promotion)));
        const frequencyDays = Number.isInteger(promotion.frequencyDays)
            ? Math.min(365, Math.max(1, promotion.frequencyDays))
            : 7;
        return Number.isFinite(dismissedAt)
            && dismissedAt > 0
            && Date.now() - dismissedAt < frequencyDays * 24 * 60 * 60 * 1000;
    } catch (error) {
        console.warn("Could not read promotion dismissal preference.", error);
        return false;
    }
}

function showPromotion(promotion) {
    const returnFocus = document.activeElement instanceof HTMLElement
        && document.activeElement !== document.body
        ? document.activeElement
        : null;
    const overlay = document.createElement("div");
    overlay.className = "cms-promotion-overlay";
    overlay.setAttribute("role", "presentation");
    Object.assign(overlay.style, {
        position: "fixed", inset: "0", zIndex: "11000", background: "rgba(0,0,0,.7)",
        display: "grid", placeItems: "center", padding: "1rem",
    });

    const dialog = document.createElement("section");
    dialog.className = "cms-promotion-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "cms-promotion-title");
    Object.assign(dialog.style, {
        position: "relative", maxWidth: "38rem", width: "100%", maxHeight: "90vh",
        overflow: "auto", background: "#fff", color: "#222", borderRadius: ".5rem", padding: "2rem",
    });

    const close = document.createElement("button");
    close.type = "button";
    close.className = "btn btn-outline-secondary";
    close.textContent = "Close";
    close.setAttribute("aria-label", "Close announcement");
    close.style.cssText = "position:absolute;right:1rem;top:1rem";
    const heading = document.createElement("h2");
    heading.id = "cms-promotion-title";
    heading.tabIndex = -1;
    heading.textContent = promotion.title;
    const body = document.createElement("p");
    body.textContent = promotion.body;
    dialog.append(close, heading, body);

    if (promotion.image && isApprovedImage(promotion.image)) {
        const image = document.createElement("img");
        image.src = cmsImageUrl(promotion.image);
        image.alt = promotion.imageAlt || promotion.title;
        image.className = "img-fluid mb-3";
        image.loading = "lazy";
        dialog.insertBefore(image, body);
    }
    if (promotion.buttonText && isHttpsUrl(promotion.buttonUrl)) {
        const action = document.createElement("a");
        action.href = promotion.buttonUrl;
        action.className = "btn mr-2";
        action.textContent = promotion.buttonText;
        action.rel = "noopener noreferrer";
        dialog.append(action);
    }

    const dismiss = () => {
        try {
            localStorage.setItem(promotionDismissalKey(promotion), String(Date.now()));
        } catch (error) {
            console.warn("Could not save promotion dismissal preference.", error);
        }
        overlay.remove();
        document.removeEventListener("keydown", handleDialogKeydown);
        if (returnFocus?.isConnected) returnFocus.focus();
    };
    const handleDialogKeydown = (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            dismiss();
            return;
        }
        if (event.key !== "Tab" || !overlay.isConnected) return;

        const focusable = [...dialog.querySelectorAll(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )].filter((element) => element.getClientRects().length > 0);
        if (!focusable.length) {
            event.preventDefault();
            heading.focus();
            return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
            event.preventDefault();
            first.focus();
        }
    };
    close.addEventListener("click", dismiss);
    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) dismiss();
    });
    document.addEventListener("keydown", handleDialogKeydown);
    overlay.append(dialog);
    document.body.append(overlay);
    close.focus();
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

function isHttpsUrl(value) {
    try {
        return new URL(value).protocol === "https:";
    } catch {
        return false;
    }
}
