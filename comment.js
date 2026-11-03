const reviewForm = document.querySelector("#review-form");
const reviewLoader = reviewForm?.querySelector(".form-loader");
const reviewsContainer = document.querySelector(".review-container");
const responseMessage = document.querySelector("#server-response");
const ratingInput = document.querySelector("#userRating");
const adminAccess = document.querySelector("#review-admin-access");

if (reviewForm && reviewsContainer && responseMessage && ratingInput) {
    if (window.location.protocol === "file:") {
        reviewsContainer.textContent = "Reviews require a Cloudflare Pages preview.";
        reviewForm.querySelector('button[type="submit"]').disabled = true;
        if (adminAccess) adminAccess.hidden = true;
    } else {
        reviewForm.addEventListener("submit", submitReview);
        reviewsContainer.addEventListener("submit", submitAdminReply);
        reviewsContainer.addEventListener("click", handleReviewAction);
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") loadReviews();
        });

        document.querySelectorAll(".rating-star").forEach((button) => {
            button.addEventListener("click", () => selectRating(button.dataset.rating));
        });

        if (adminAccess) {
            adminAccess.addEventListener("click", () => {
                window.setTimeout(loadReviews, 1000);
            });
        }

        loadReviews();
    }
}

function selectRating(value) {
    ratingInput.value = value;
    document.querySelectorAll(".rating-star").forEach((button) => {
        const selected = Number(button.dataset.rating) <= Number(value);
        button.classList.toggle("text-warning", selected);
        button.setAttribute("aria-pressed", String(Number(button.dataset.rating) === Number(value)));
    });
}

async function submitReview(event) {
    event.preventDefault();
    responseMessage.textContent = "";

    if (!reviewForm.reportValidity()) return;
    if (!ratingInput.value) {
        responseMessage.textContent = "Please select a star rating before submitting.";
        return;
    }

    const formData = new FormData(reviewForm);
    if (String(formData.get("website") || "").trim()) return;

    setReviewLoading(true);
    try {
        const response = await fetch("/api/reviews", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                name: formData.get("commentor_name"),
                rating: Number(ratingInput.value),
                comment: formData.get("userComment"),
                website: formData.get("website"),
            }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Your review could not be submitted.");

        reviewForm.reset();
        selectRating("");
        responseMessage.textContent = "Thank you. Your review has been published.";
        await loadReviews();
    } catch (error) {
        responseMessage.textContent = error.message || "Your review could not be submitted. Please try again.";
    } finally {
        setReviewLoading(false);
    }
}

async function submitAdminReply(event) {
    const form = event.target.closest(".review-reply-form");
    if (!form) return;
    event.preventDefault();

    const reply = form.querySelector("textarea").value.trim();
    if (!reply || reply.length > 1000) {
        form.querySelector(".reply-status").textContent = "Enter a reply of 1 to 1,000 characters.";
        return;
    }

    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    form.querySelector(".reply-status").textContent = "Saving reply...";
    try {
        const response = await fetch("/api/reviews/reply", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                reviewId: Number(form.dataset.reviewId),
                reply,
            }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "The reply could not be saved.");
        await loadReviews();
    } catch (error) {
        form.querySelector(".reply-status").textContent = error.message || "The reply could not be saved.";
        button.disabled = false;
    }
}

async function loadReviews() {
    if (!reviewsContainer) return;
    try {
        const response = await fetch("/api/reviews", { headers: { accept: "application/json" } });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Reviews are temporarily unavailable.");
        renderReviews(result.reviews, result.isAdmin === true);
        if (adminAccess) adminAccess.hidden = result.isAdmin === true;
    } catch (error) {
        reviewsContainer.replaceChildren(createMessage(error.message || "Reviews are temporarily unavailable."));
    }
}

function renderReviews(reviews, isAdmin) {
    reviewsContainer.replaceChildren();
    if (!Array.isArray(reviews) || reviews.length === 0) {
        reviewsContainer.append(createMessage("No reviews yet. Be the first to share your experience."));
        return;
    }

    for (const review of reviews) {
        const card = document.createElement("article");
        card.className = "card mb-3";
        const body = document.createElement("div");
        body.className = "card-body";

        const heading = document.createElement("div");
        heading.className = "d-flex justify-content-between align-items-start flex-wrap";
        const name = document.createElement("h4");
        name.className = "card-title";
        name.textContent = review.name;
        const rating = document.createElement("div");
        rating.className = "text-warning";
        rating.setAttribute("aria-label", `${review.rating} out of 5 stars`);
        rating.textContent = `${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}`;
        heading.append(name, rating);

        const comment = document.createElement("p");
        comment.className = "card-text";
        comment.textContent = review.comment;
        body.append(heading, comment);

        if (review.reply) {
            const reply = document.createElement("div");
            reply.className = "review-official-reply mt-3 p-3";
            const label = document.createElement("strong");
            label.textContent = "CMI Group response";
            const replyText = document.createElement("p");
            replyText.className = "mb-0 mt-2";
            replyText.textContent = review.reply;
            reply.append(label, replyText);
            body.append(reply);
        }

        if (isAdmin) body.append(createReplyForm(review));
        card.append(body);
        reviewsContainer.append(card);
    }
}

function createReplyForm(review) {
    const form = document.createElement("form");
    form.className = "review-reply-form mt-3";
    form.dataset.reviewId = String(review.id);

    const label = document.createElement("label");
    label.className = "form-label";
    label.textContent = review.reply ? "Update official reply" : "Write official reply";
    const textarea = document.createElement("textarea");
    textarea.className = "form-control";
    textarea.rows = 3;
    textarea.maxLength = 1000;
    textarea.required = true;
    textarea.value = review.reply || "";
    textarea.setAttribute("aria-label", label.textContent);

    const button = document.createElement("button");
    button.className = "btn btn-primary mt-2";
    button.type = "submit";
    button.textContent = review.reply ? "Update reply" : "Publish reply";

    const status = document.createElement("p");
    status.className = "reply-status mt-2 mb-0";
    status.setAttribute("role", "status");
    form.append(label, textarea, button, status);
    return form;
}

function handleReviewAction(event) {
    const loginLink = event.target.closest("#review-admin-access a");
    if (loginLink) {
        window.setTimeout(loadReviews, 1000);
    }
}

function createMessage(message) {
    const paragraph = document.createElement("p");
    paragraph.className = "text-center";
    paragraph.textContent = message;
    return paragraph;
}

function setReviewLoading(isLoading) {
    if (reviewLoader) reviewLoader.style.display = isLoading ? "flex" : "none";
    reviewForm.querySelector("button[type=submit]").disabled = isLoading;
}
