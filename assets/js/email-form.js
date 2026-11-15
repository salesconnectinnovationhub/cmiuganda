(function () {
    const recipient = "cmi.groupuganda@gmail.com";
    const endpoint = "https://api.web3forms.com/submit";
    const accessKey = "59457e34-e78d-40c5-87eb-0b5e008db3ac";
    const defaultWhatsAppUrl = "https://wa.me/message/DYT6JQFKYJNLF1";
    const acceptedMessage = "Your enquiry was sent to CMI Group.";
    const formSubjects = {
        "home-enquiry": "Homepage consultation enquiry",
        "contact-enquiry": "Contact page enquiry",
        "project-interest": "Detailed project interest",
        "service-enquiry": "Service consultation enquiry",
        "project-enquiry": "Project consultation enquiry",
        "property-enquiry": "Property consultation enquiry",
    };

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

    function showSuccess(status, form, deliveryMessage) {
        const whatsappLink = document.createElement("a");
        whatsappLink.href = getWhatsAppUrl();
        whatsappLink.target = "_blank";
        whatsappLink.rel = "noopener noreferrer";
        whatsappLink.textContent = "message CMI Group on WhatsApp";
        const whatsappIcon = document.createElement("i");
        whatsappIcon.className = "fab fa-whatsapp";
        whatsappIcon.setAttribute("aria-hidden", "true");
        whatsappLink.prepend(whatsappIcon, document.createTextNode(" "));

        status.replaceChildren(
            document.createTextNode(`${deliveryMessage} `),
            document.createTextNode(getSubmissionSummary(form)),
            document.createTextNode(" For a quick reply, "),
            whatsappLink,
            document.createTextNode(".")
        );
    }

    function createEmailDraft(form) {
        const fields = Array.from(form.elements)
            .filter((field) => {
                if (!field.name || ["access_key", "bot-field", "botcheck", "form-name", "message"].includes(field.name) || field.disabled) return false;
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

    function getDetailedMessage(form) {
        return Array.from(form.elements)
            .filter((field) => {
                if (!field.name || ["access_key", "bot-field", "botcheck", "form-name", "message"].includes(field.name) || field.disabled) return false;
                if (field.type === "submit" || field.type === "button" || field.type === "reset") return false;
                if ((field.type === "checkbox" || field.type === "radio") && !field.checked) return false;
                return true;
            })
            .map((field) => `${getFieldLabel(field)}: ${field.value.trim()}`)
            .filter((line) => !line.endsWith(": "))
            .join("\n");
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
            const formName = formData.get("form-name");
            if (typeof formName !== "string" || !formSubjects[formName]) {
                console.error("The CMI Group enquiry form has a missing or unrecognized form name.");
                showFailure(status, form, "We could not send your enquiry just now.");
                return false;
            }

            if (new URL(form.action, window.location.href).href !== endpoint) {
                console.error("The CMI Group enquiry form has an invalid email endpoint.");
                showFailure(status, form, "We could not send your enquiry just now.");
                return false;
            }

            const fullName = formData.get("fullname")
                || [formData.get("firstName"), formData.get("lastName")].filter(Boolean).join(" ");
            formData.set("access_key", accessKey);
            if (fullName) formData.set("name", String(fullName));
            const email = formData.get("email");
            if (email) formData.set("replyto", String(email));
            formData.set("subject", formSubjects[formName]);
            if (formName === "project-interest" || !formData.get("message")) {
                formData.set("message", getDetailedMessage(form));
            }

            form.dataset.submitting = "true";
            form.setAttribute("aria-busy", "true");
            button.disabled = true;
            status.textContent = "Sending your enquiry…";

            try {
                const response = await fetch(endpoint, {
                    method: "POST",
                    body: formData,
                });
                const data = await response.json();
                if (!response.ok || data.success !== true) {
                    showFailure(status, form, data.message || "We could not send your enquiry just now.");
                    return false;
                }

                showSuccess(status, form, acceptedMessage);
                form.reset();
                return true;
            } catch (error) {
                console.error("Could not submit the CMI Group enquiry to its email service.", error);
                showFailure(status, form, "We could not send your enquiry just now.");
                return false;
            } finally {
                delete form.dataset.submitting;
                form.removeAttribute("aria-busy");
                button.disabled = false;
            }
        },
    };
})();
