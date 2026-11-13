(function () {
    const recipient = "cmi.groupuganda@gmail.com";

    function getFieldLabel(field) {
        const label = field.labels && field.labels[0];
        return label ? label.textContent.trim() : field.name;
    }

    function createEmailDraft(form) {
        const fields = Array.from(form.elements)
            .filter((field) => {
                if (!field.name || field.name === "website" || field.disabled) return false;
                if (field.type === "submit" || field.type === "button" || field.type === "reset") return false;
                if ((field.type === "checkbox" || field.type === "radio") && !field.checked) return false;
                return true;
            })
            .map((field) => `${getFieldLabel(field)}: ${field.value.trim()}`)
            .filter((line) => !line.endsWith(": "));

        const fullName = form.elements.namedItem("fullname")
            ? form.elements.namedItem("fullname").value.trim()
            : [
                form.elements.namedItem("firstName")?.value.trim(),
                form.elements.namedItem("lastName")?.value.trim(),
            ].filter(Boolean).join(" ");
        const subject = `Project quotation / enquiry${fullName ? ` from ${fullName}` : ""}`;
        const body = [
            "Website enquiry for CMI Group",
            "",
            ...fields,
        ].join("\r\n");

        return `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }

    window.cmiEmailForm = {
        submit(form, status) {
            if (!(status instanceof HTMLElement)) {
                throw new Error("The enquiry form is missing its submit status element.");
            }

            const emailLink = document.createElement("a");
            emailLink.href = createEmailDraft(form);
            emailLink.textContent = "Open your email app and send your request";
            status.replaceChildren(
                document.createTextNode("Your email draft is ready. "),
                emailLink,
                document.createTextNode(". Review it and press Send in your email app; this website does not send email automatically.")
            );
            return true;
        },
    };
})();
