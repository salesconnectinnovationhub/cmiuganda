document.querySelectorAll("[data-lead-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;

        const submitButton = form.querySelector('[type="submit"]');
        const status = form.querySelector(".form-submit-status");
        if (!(submitButton instanceof HTMLButtonElement) || !(status instanceof HTMLElement)) {
            throw new Error("The project enquiry form is missing its submit controls.");
        }

        submitButton.disabled = true;
        status.textContent = "Sending your enquiry...";
        try {
            const response = await fetch(form.action, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
                    "Accept": "text/plain",
                },
                body: new URLSearchParams(new FormData(form)),
            });
            const message = await response.text();
            if (!response.ok) throw new Error(message || "Your enquiry could not be sent. Please try again.");
            status.textContent = message;
            form.reset();
            window.cmiTrackConversion?.("contact_submit");
        } catch (error) {
            status.textContent = error instanceof Error
                ? error.message
                : "Your enquiry could not be sent. Please try again.";
        } finally {
            submitButton.disabled = false;
        }
    });
});
