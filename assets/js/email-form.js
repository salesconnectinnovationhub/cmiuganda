(function () {
    const recipient = "cmi.groupuganda@gmail.com";

    function showFailure(status, message) {
        const fallbackLink = document.createElement("a");
        fallbackLink.href = `mailto:${recipient}`;
        fallbackLink.textContent = "email CMI Group directly";
        status.replaceChildren(
            document.createTextNode(`${message} You can also `),
            fallbackLink,
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
            if (form.dataset.submitting === "true") return;

            form.dataset.submitting = "true";
            form.setAttribute("aria-busy", "true");
            button.disabled = true;
            status.textContent = "Sending your message…";

            try {
                const response = await fetch(form.action, {
                    method: "POST",
                    body: new FormData(form),
                    headers: { Accept: "text/plain" },
                    credentials: "same-origin",
                });
                const message = (await response.text()).trim();

                if (!response.ok) {
                    showFailure(status, message || "We could not send your message just now. Please try again.");
                    return false;
                }

                status.textContent = message || "Your message has been sent to CMI Group.";
                form.reset();
                return true;
            } catch (error) {
                console.error("Could not submit the CMI Group enquiry form.", error);
                showFailure(status, "We could not reach the email service. Your details are still here; please try again.");
                return false;
            } finally {
                delete form.dataset.submitting;
                form.removeAttribute("aria-busy");
                button.disabled = false;
            }
        },
    };
})();
