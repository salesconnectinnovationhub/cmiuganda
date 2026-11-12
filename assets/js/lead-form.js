document.querySelectorAll("[data-lead-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;

        const status = form.querySelector(".form-submit-status");
        if (!(status instanceof HTMLElement)) {
            throw new Error("The project enquiry form is missing its submit controls.");
        }

        window.cmiEmailForm.openDraft(form, status);
    });
});
