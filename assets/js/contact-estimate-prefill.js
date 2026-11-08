(() => {
    "use strict";

    const form = document.querySelector("#contact-form");
    const message = form?.querySelector("#contact-message");
    const status = document.querySelector("#estimate-prefill-status");
    if (!form || !message || !status) return;

    try {
        const estimate = sessionStorage.getItem("cmi-block-estimator-quote");
        if (!estimate) return;
        sessionStorage.removeItem("cmi-block-estimator-quote");
        message.value = estimate;
        status.textContent = "Your block/brick estimate has been added to the message. Add your contact details and any project notes, then send the form.";
    } catch (error) {
        status.textContent = "The saved estimate could not be retrieved. Return to the estimator and try the quote request again.";
    }
})();
