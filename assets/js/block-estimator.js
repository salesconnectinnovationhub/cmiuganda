(() => {
    "use strict";

    const form = document.querySelector("#block-estimator-form");
    if (!form) return;

    const wallSections = document.querySelector("#wall-sections");
    const errorMessage = document.querySelector("#estimator-error");
    const results = document.querySelector("#estimator-results");
    const quoteRequestLink = document.querySelector("#quote-request-link");
    const quoteRequestStatus = document.querySelector("#quote-request-status");
    const numberFormat = new Intl.NumberFormat("en-UG", { maximumFractionDigits: 2 });
    const quoteStorageKey = "cmi-block-estimator-quote";
    const maxQuoteMessageLength = 5000;
    let wallCount = 0;
    let calculatedQuoteSummary = "";

    document.querySelector("#copyright-year").textContent = new Date().getFullYear();

    function invalidateResults() {
        const hasEstimate = !results.hidden || Boolean(calculatedQuoteSummary);
        results.hidden = true;
        calculatedQuoteSummary = "";
        if (hasEstimate) {
            quoteRequestStatus.textContent = "Inputs changed. Recalculate the quantity before requesting a quote.";
        }
    }

    function createInput(labelText, name, options = {}) {
        const group = document.createElement("div");
        group.className = `form-group ${options.column || "col-md-4"}`;
        const id = `${name}-${Math.random().toString(36).slice(2, 9)}`;
        const label = document.createElement("label");
        label.htmlFor = id;
        label.textContent = labelText;
        const input = document.createElement("input");
        input.className = "form-control";
        input.id = id;
        input.name = name;
        input.type = "number";
        input.min = "0";
        input.step = name === "opening-count" ? "1" : "any";
        input.required = true;
        if (options.placeholder) input.placeholder = options.placeholder;
        group.append(label, input);
        return group;
    }

    function addOpening(section, sectionNumber) {
        const openings = section.querySelector(".openings-list");
        const openingNumber = openings.children.length + 1;
        const row = document.createElement("div");
        row.className = "opening-row";
        row.dataset.opening = "";

        const heading = document.createElement("div");
        heading.className = "opening-heading";
        const title = document.createElement("h4");
        title.textContent = `Opening ${openingNumber}`;
        const remove = document.createElement("button");
        remove.className = "btn btn-sm btn-outline-secondary";
        remove.type = "button";
        remove.textContent = "Remove";
        remove.setAttribute("aria-label", `Remove opening ${openingNumber} from wall ${sectionNumber}`);
        remove.addEventListener("click", () => {
            row.remove();
            renumberOpenings(section);
            invalidateResults();
        });
        heading.append(title, remove);

        const fields = document.createElement("div");
        fields.className = "row";
        fields.append(
            createInput("Width (m)", "opening-width", { placeholder: "e.g. 0.9" }),
            createInput("Height (m)", "opening-height", { placeholder: "e.g. 2.1" }),
            createInput("Number of same-size openings", "opening-count", { placeholder: "e.g. 1" })
        );
        row.append(heading, fields);
        openings.append(row);
        invalidateResults();
    }

    function renumberOpenings(section) {
        section.querySelectorAll(".opening-row").forEach((row, index) => {
            const title = row.querySelector("h4");
            const remove = row.querySelector("button");
            title.textContent = `Opening ${index + 1}`;
            remove.setAttribute("aria-label", `Remove opening ${index + 1} from wall ${section.dataset.wallNumber}`);
        });
    }

    function addWall() {
        wallCount += 1;
        const section = document.createElement("section");
        section.className = "wall-section";
        section.dataset.wallNumber = String(wallCount);
        section.setAttribute("aria-labelledby", `wall-title-${wallCount}`);

        const heading = document.createElement("div");
        heading.className = "wall-section-heading";
        const title = document.createElement("h3");
        title.id = `wall-title-${wallCount}`;
        title.textContent = `Wall ${wallCount}`;
        heading.append(title);
        if (wallCount > 1) {
            const remove = document.createElement("button");
            remove.className = "btn btn-sm btn-outline-secondary";
            remove.type = "button";
            remove.textContent = "Remove wall";
            remove.addEventListener("click", () => {
                section.remove();
                renumberWalls();
                invalidateResults();
            });
            heading.append(remove);
        }

        const dimensions = document.createElement("div");
        dimensions.className = "row";
        dimensions.append(
            createInput("Wall length (m)", "wall-length", { placeholder: "e.g. 5.2" }),
            createInput("Wall height (m)", "wall-height", { placeholder: "e.g. 3" })
        );

        const openingHeading = document.createElement("div");
        openingHeading.className = "opening-heading";
        const openingTitle = document.createElement("h4");
        openingTitle.textContent = "Doors, windows, and other openings";
        const addOpeningButton = document.createElement("button");
        addOpeningButton.className = "btn btn-sm btn-outline-secondary";
        addOpeningButton.type = "button";
        addOpeningButton.textContent = "Add opening";
        addOpeningButton.addEventListener("click", () => addOpening(section, Number(section.dataset.wallNumber)));
        openingHeading.append(openingTitle, addOpeningButton);

        const openings = document.createElement("div");
        openings.className = "openings-list";
        section.append(heading, dimensions, openingHeading, openings);
        wallSections.append(section);
        invalidateResults();
    }

    function renumberWalls() {
        wallSections.querySelectorAll(".wall-section").forEach((section, index) => {
            const wallNumber = index + 1;
            section.dataset.wallNumber = String(wallNumber);
            section.querySelector("h3").textContent = `Wall ${wallNumber}`;
            section.querySelector("h3").id = `wall-title-${wallNumber}`;
            section.setAttribute("aria-labelledby", `wall-title-${wallNumber}`);
            section.querySelectorAll(".opening-row").forEach((row, openingIndex) => {
                row.querySelector("button").setAttribute("aria-label", `Remove opening ${openingIndex + 1} from wall ${wallNumber}`);
            });
        });
        wallCount = wallSections.children.length;
    }

    function readPositiveNumber(input, label, allowZero = false) {
        const value = Number(input.value);
        if (!input.value.trim() || !Number.isFinite(value) || (allowZero ? value < 0 : value <= 0)) {
            throw new Error(`${label} must be ${allowZero ? "zero or greater" : "greater than zero"}.`);
        }
        return value;
    }

    quoteRequestLink.addEventListener("click", (event) => {
        if (!calculatedQuoteSummary) {
            event.preventDefault();
            quoteRequestStatus.textContent = "Calculate the wall quantity before requesting a quote.";
            return;
        }
        if (calculatedQuoteSummary.length > maxQuoteMessageLength) {
            event.preventDefault();
            quoteRequestStatus.textContent = "This estimate summary is too long for the contact form. Reduce the number of wall sections or openings and calculate again.";
            return;
        }

        try {
            sessionStorage.setItem(quoteStorageKey, calculatedQuoteSummary);
            quoteRequestStatus.textContent = "Estimate summary ready. The contact form will open with these details included.";
        } catch (error) {
            event.preventDefault();
            quoteRequestStatus.textContent = "Your browser could not save the estimate for the contact form. Please enable site storage or copy the estimate details from this page.";
        }
    });

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        errorMessage.textContent = "";
        results.hidden = true;
        calculatedQuoteSummary = "";

        try {
            const unitLength = readPositiveNumber(form.querySelector("#unit-length"), "Unit length");
            const unitHeight = readPositiveNumber(form.querySelector("#unit-height"), "Unit height");
            const jointWidth = readPositiveNumber(form.querySelector("#joint-width"), "Mortar joint width", true);
            const waste = readPositiveNumber(form.querySelector("#waste"), "Waste allowance", true);
            if (waste > 25) throw new Error("Waste allowance cannot be more than 25%.");

            const walls = [...wallSections.querySelectorAll(".wall-section")];
            if (walls.length === 0) throw new Error("Add at least one wall section.");

            let netArea = 0;
            const wallDetails = [];
            for (const [index, wall] of walls.entries()) {
                const length = readPositiveNumber(wall.querySelector('[name="wall-length"]'), `Wall ${index + 1} length`);
                const height = readPositiveNumber(wall.querySelector('[name="wall-height"]'), `Wall ${index + 1} height`);
                const grossArea = length * height;
                let openingsArea = 0;
                const openingDetails = [];

                for (const [openingIndex, opening] of [...wall.querySelectorAll(".opening-row")].entries()) {
                    const widthInput = opening.querySelector('[name="opening-width"]');
                    const heightInput = opening.querySelector('[name="opening-height"]');
                    const countInput = opening.querySelector('[name="opening-count"]');
                    const openingValues = [widthInput.value, heightInput.value, countInput.value];
                    if (openingValues.every((value) => !value.trim())) continue;
                    if (openingValues.some((value) => !value.trim())) {
                        throw new Error(`Complete the width, height, and count for wall ${index + 1}, opening ${openingIndex + 1}.`);
                    }

                    const width = readPositiveNumber(widthInput, `Wall ${index + 1}, opening ${openingIndex + 1} width`);
                    const openingHeight = readPositiveNumber(heightInput, `Wall ${index + 1}, opening ${openingIndex + 1} height`);
                    const count = readPositiveNumber(countInput, `Wall ${index + 1}, opening ${openingIndex + 1} count`);
                    if (!Number.isInteger(count)) throw new Error(`Wall ${index + 1}, opening ${openingIndex + 1} count must be a whole number.`);
                    if (width > length || openingHeight > height) {
                        throw new Error(`Wall ${index + 1}, opening ${openingIndex + 1} cannot be larger than its wall.`);
                    }
                    const area = width * openingHeight * count;
                    openingsArea += area;
                    openingDetails.push(`Opening ${openingIndex + 1}: ${numberFormat.format(width)} m × ${numberFormat.format(openingHeight)} m × ${numberFormat.format(count)} = ${numberFormat.format(area)} m²`);
                }

                if (openingsArea > grossArea) {
                    throw new Error(`Openings on wall ${index + 1} have more area than the wall. Check the dimensions and counts.`);
                }
                const wallNetArea = grossArea - openingsArea;
                netArea += wallNetArea;
                wallDetails.push(`Wall ${index + 1}: ${numberFormat.format(length)} m × ${numberFormat.format(height)} m = ${numberFormat.format(grossArea)} m² gross; ${openingDetails.length ? openingDetails.join("; ") : "no openings deducted"}; ${numberFormat.format(openingsArea)} m² openings deducted; ${numberFormat.format(wallNetArea)} m² net.`);
            }

            if (netArea <= 0) throw new Error("The measured walls have no remaining area after openings.");

            const unitFaceArea = ((unitLength + jointWidth) / 1000) * ((unitHeight + jointWidth) / 1000);
            const baseQuantity = netArea / unitFaceArea;
            const wasteQuantity = baseQuantity * waste / 100;
            const quantityWithWaste = baseQuantity + wasteQuantity;
            const totalQuantity = Math.ceil(quantityWithWaste);
            const unitLabel = form.querySelector("#unit-type").selectedOptions[0].textContent.toLowerCase();

            document.querySelector("#result-units").textContent = `${numberFormat.format(totalQuantity)} ${unitLabel}`;
            document.querySelector("#result-area").textContent = `${numberFormat.format(netArea)} m²`;
            document.querySelector("#result-base-quantity").textContent = numberFormat.format(baseQuantity);
            document.querySelector("#result-waste-quantity").textContent = numberFormat.format(wasteQuantity);
            document.querySelector("#result-waste").textContent = `${numberFormat.format(waste)}%`;
            const assumptions = [
                ["Selected unit", form.querySelector("#unit-type").selectedOptions[0].textContent],
                ["Nominal unit size", `${numberFormat.format(unitLength)} mm × ${numberFormat.format(unitHeight)} mm`],
                ["Mortar joint width", `${numberFormat.format(jointWidth)} mm`],
                ["Unit face area including joints", `${numberFormat.format(unitFaceArea)} m² (${numberFormat.format((unitLength + jointWidth) / 1000)} m × ${numberFormat.format((unitHeight + jointWidth) / 1000)} m)`],
                ["Waste allowance", `${numberFormat.format(waste)}% of the unrounded base quantity`],
                ["Rounding", "Final quantity rounded up to the next whole unit"],
            ];
            const assumptionsList = document.querySelector("#result-assumptions");
            assumptionsList.replaceChildren();
            for (const [label, value] of assumptions) {
                const term = document.createElement("dt");
                term.className = "col-sm-5";
                term.textContent = label;
                const description = document.createElement("dd");
                description.className = "col-sm-7";
                description.textContent = value;
                assumptionsList.append(term, description);
            }

            const wallList = document.querySelector("#result-walls");
            wallList.replaceChildren();
            for (const detail of wallDetails) {
                const item = document.createElement("li");
                item.textContent = detail;
                wallList.append(item);
            }

            document.querySelector("#result-formula").textContent =
                `Calculation: ${numberFormat.format(netArea)} m² net wall area ÷ ${numberFormat.format(unitFaceArea)} m² unit face area = ${numberFormat.format(baseQuantity)} units; plus ${numberFormat.format(wasteQuantity)} units (${numberFormat.format(waste)}% waste) = ${numberFormat.format(quantityWithWaste)}; rounded up = ${numberFormat.format(totalQuantity)} units.`;
            calculatedQuoteSummary = [
                "Block/brick quantity estimate - quote request",
                `Estimated quantity: ${totalQuantity} ${unitLabel}`,
                `Net wall area after openings: ${numberFormat.format(netArea)} m2`,
                `Unit: ${form.querySelector("#unit-type").selectedOptions[0].textContent}; size ${numberFormat.format(unitLength)} mm x ${numberFormat.format(unitHeight)} mm`,
                `Mortar joint width: ${numberFormat.format(jointWidth)} mm`,
                `Unit face area including joints: ${numberFormat.format(unitFaceArea)} m2`,
                `Waste allowance: ${numberFormat.format(waste)}%`,
                `Base quantity before waste: ${numberFormat.format(baseQuantity)}`,
                `Waste units added: ${numberFormat.format(wasteQuantity)}`,
                `Wall measurements: ${wallDetails.map((detail) => detail.replaceAll("×", "x").replaceAll("m²", "m2")).join(" | ")}`,
                `Calculation: ${numberFormat.format(netArea)} m2 / ${numberFormat.format(unitFaceArea)} m2 = ${numberFormat.format(baseQuantity)} units; plus ${numberFormat.format(wasteQuantity)} waste units = ${numberFormat.format(quantityWithWaste)}; rounded up = ${totalQuantity} units.`,
                "Please confirm materials, specifications, and current pricing. This is a preliminary quantity estimate, not a quotation or full bill of quantities; cement, sand, mortar quantities, and prices are not included.",
            ].join("\n");
            quoteRequestStatus.textContent = "";
            results.hidden = false;
        } catch (error) {
            errorMessage.textContent = error.message;
        }
    });

    form.addEventListener("input", invalidateResults);

    document.querySelector("#add-wall").addEventListener("click", addWall);
    addWall();
})();
