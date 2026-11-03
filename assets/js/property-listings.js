const listingsContainer = document.querySelector("#property-listings");
const listingsStatus = document.querySelector("#property-listings-status");
const listingTypes = new Set(["Land", "Residential", "Commercial", "Rental"]);
const listingStatuses = new Set(["Available", "Reserved", "Sold", "Rented"]);

if (listingsContainer && listingsStatus) {
    if (window.location.protocol === "file:") {
        listingsStatus.textContent = "Property listings require a Cloudflare Pages preview.";
    } else {
        loadPropertyListings();
    }
}

async function loadPropertyListings() {
    try {
        const response = await fetch("/api/cms?type=property", {
            headers: { accept: "application/json" },
        });
        if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            throw new Error(result.error || "Property listings are temporarily unavailable.");
        }

        const result = await response.json();
        if (!Array.isArray(result.items)) throw new Error("Property listing data is not in the expected format.");

        const publishedListings = result.items.filter(isPublishedListing);
        listingsContainer.replaceChildren();
        if (publishedListings.length === 0) {
            listingsStatus.textContent = "There are no current listings. Contact our team to discuss your property requirements.";
            return;
        }

        for (const listing of publishedListings) {
            listingsContainer.append(createListingCard(listing));
        }
        listingsStatus.textContent = `${publishedListings.length} current ${publishedListings.length === 1 ? "listing" : "listings"}.`;
    } catch (error) {
        listingsStatus.textContent = error.message || "Property listings are temporarily unavailable.";
    }
}

function isPublishedListing(listing) {
    return listing
        && typeof listing === "object"
        && listing.publicationStatus === "published"
        && typeof listing.id === "string"
        && typeof listing.title === "string"
        && listingTypes.has(listing.type)
        && typeof listing.location === "string"
        && typeof listing.price === "string"
        && listingStatuses.has(listing.status)
        && typeof listing.summary === "string"
        && Array.isArray(listing.features)
        && listing.features.every((feature) => typeof feature === "string")
        && Array.isArray(listing.images)
        && listing.images.every(isApprovedImage)
        && typeof listing.updatedAt === "string";
}

function isApprovedImage(path) {
    return typeof path === "string"
        && (/^(images|img|propertyimages)\/[A-Za-z0-9_./-]+$/.test(path) && !path.split("/").includes("..")
            || /^cms-media\/property\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(path));
}

function propertyImageUrl(path) {
    return path.startsWith("cms-media/")
        ? `/api/cms-media?key=${encodeURIComponent(path)}`
        : path;
}

function createListingCard(listing) {
    const column = document.createElement("div");
    column.className = "col-lg-4 col-md-6 mb-4";
    const card = document.createElement("article");
    card.className = "card h-100 shadow-sm";

    const imagePath = listing.images[0];
    if (imagePath) {
        const image = document.createElement("img");
        image.className = "card-img-top";
        image.src = propertyImageUrl(imagePath);
        image.alt = listing.imageAlt || listing.title;
        image.loading = "lazy";
        image.decoding = "async";
        card.append(image);
    }

    const body = document.createElement("div");
    body.className = "card-body d-flex flex-column";
    const status = document.createElement("p");
    status.className = "text-uppercase mb-2";
    status.textContent = `${listing.type} · ${listing.status}`;

    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = listing.title;

    const location = document.createElement("p");
    location.className = "mb-2";
    location.textContent = listing.location;

    const price = document.createElement("p");
    price.className = "font-weight-bold";
    price.textContent = listing.price;

    const summary = document.createElement("p");
    summary.className = "card-text";
    summary.textContent = listing.summary;

    body.append(status, title, location, price, summary);

    if (listing.features.length) {
        const features = document.createElement("ul");
        features.className = "list-wrap";
        for (const feature of listing.features) {
            const item = document.createElement("li");
            item.textContent = feature;
            features.append(item);
        }
        body.append(features);
    }

    const inquiry = document.createElement("a");
    inquiry.className = "btn mt-auto";
    inquiry.href = `mailto:cmi.groupuganda@gmail.com?subject=${encodeURIComponent(`Property enquiry: ${listing.title}`)}`;
    inquiry.textContent = "Enquire about this property";
    body.append(inquiry);
    card.append(body);
    column.append(card);
    return column;
}
