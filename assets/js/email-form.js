(function () {
    const recipient = "cmi.groupuganda@gmail.com";
    const defaultWhatsAppUrl = "https://wa.me/message/DYT6JQFKYJNLF1";

    function getFieldLabel(field) {
        const label = field.labels && field.labels[0];
        return label ? label.textContent.trim() : field.name;
    }

    function getSubmissionSummary(form) {
        const message = form.querySelector('[name="message"]');
        if (message && message.value.trim()) {
            const text = message.value.trim();
            return `Your message: ${text.length > 240 ? `${text.slice(0, 237).trimEnd()}...` : text}`;
        }

        const selectedServices = Array.from(form.querySelectorAll('input[type="checkbox"]:checked'))
            .map(getFieldLabel)
            .filter(Boolean);
        if (selectedServices.length) return `Selected services: ${selectedServices.join(", ")}`;

        return "Your project enquiry details were received.";
    }

    function getWhatsAppUrl() {
        const whatsappLink = Array.from(document.querySelectorAll("a[href]")).find((link) => {
            const url = new URL(link.href);
            return url.protocol === "https:"
                && (url.hostname === "wa.me" || url.hostname === "api.whatsapp.com");
        });
        return whatsappLink ? whatsappLink.href : defaultWhatsAppUrl;
    }

    function showSuccess(status, form) {
        const whatsappLink = document.createElement("a");
        whatsappLink.href = getWhatsAppUrl();
        whatsappLink.target = "_blank";
        whatsappLink.rel = "noopener noreferrer";
        whatsappLink.textContent = "message CMI Group on WhatsApp";

        status.replaceChildren(
            document.createTextNode("Your enquiry has been submitted to CMI Group. "),
            document.createTextNode(getSubmissionSummary(form)),
            document.createTextNode(" CMI Group will respond using the contact details you provided. For a quicker response, "),
            whatsappLink,
            document.createTextNode(".")
        );
    }

    function createEmailDraft(form) {
        const fields = Array.from(form.elements)
            .filter((field) => {
                if (!field.name || field.name === "bot-field" || field.name === "form-name" || field.disabled) return false;
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
        const body = ["Website enquiry for CMI Group", "", ...fields].join("\r\n");

        return `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }

    function showFailure(status, form, message) {
        const emailLink = document.createElement("a");
        emailLink.href = createEmailDraft(form);
        emailLink.textContent = "Email CMI Group directly";
        status.replaceChildren(
            document.createTextNode(`${message} Your details are still on this page. You can also `),
            emailLink,
            document.createTextNode(".")
        );
    }

    window.cmiEmailForm = {
        async submit(form, status) {
            if (!(status instanceof HTMLElement)) {
                throw new Error("The enquiry form is missing its submit status element.");
            }

            const button = form.querySelector('[type="submit"]');
            if (!(button instanceof HTMLButtonElement || button instanceof HTMLInputElement)) {
                throw new Error("The enquiry form is missing its submit button.");
            }
            if (form.dataset.submitting === "true") return false;

            const formData = new FormData(form);
            if (!formData.get("form-name")) {
                throw new Error("The enquiry form is missing its Netlify form name.");
            }

            form.dataset.submitting = "true";
            form.setAttribute("aria-busy", "true");
            button.disabled = true;
            status.textContent = "Submitting your enquiry…";

            try {
                const response = await fetch(form.action, {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams(formData).toString(),
                    credentials: "same-origin",
                });

                if (!response.ok) {
                    showFailure(status, form, "We could not submit your enquiry just now.");
                    return false;
                }

                showSuccess(status, form);
                form.reset();
                return true;
            } catch (error) {
                console.error("Could not submit the CMI Group enquiry form to Netlify.", error);
                showFailure(status, form, "We could not submit your enquiry just now.");
                return false;
            } finally {
                delete form.dataset.submitting;
                form.removeAttribute("aria-busy");
                button.disabled = false;
            }
        },
    };
})();
