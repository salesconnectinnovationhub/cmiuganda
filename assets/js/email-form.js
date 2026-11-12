(function () {
    const recipient = "cmi.groupuganda@gmail.com";

    function fieldLabel(field) {
        const label = field.labels && field.labels[0];
        if (label) return label.textContent.trim();
        return field.name
            .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
            .replace(/^./, (character) => character.toUpperCase());
    }

    function createMailtoUrl(form) {
        const isInterest = form.classList.contains("interestForm");
        const name = isInterest
            ? form.elements.fullname.value.trim()
            : `${form.elements.firstName.value.trim()} ${form.elements.lastName.value.trim()}`.trim();
        const subject = `${isInterest ? "Project interest" : "Website enquiry"} from ${name}`;
        const lines = Array.from(form.elements)
            .filter((field) => field.name && field.name !== "website" && field.type !== "submit")
            .filter((field) => field.type !== "checkbox" || field.checked)
            .map((field) => `${fieldLabel(field)}: ${field.type === "checkbox" ? "Yes" : field.value.trim()}`);
        const body = lines.join("\n");

        return `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }

    window.cmiEmailForm = {
        openDraft(form, status) {
            const draftUrl = createMailtoUrl(form);
            const fallbackLink = document.createElement("a");
            fallbackLink.href = draftUrl;
            fallbackLink.target = "_blank";
            fallbackLink.rel = "noopener noreferrer";
            fallbackLink.textContent = "open the prefilled email draft";

            status.replaceChildren(
                document.createTextNode("Your email app should open a draft addressed to CMI Group. If it doesn't, "),
                fallbackLink,
                document.createTextNode(" and press Send. The message isn't sent until you press Send.")
            );
            window.open(draftUrl, "_blank");
        },
    };
})();
