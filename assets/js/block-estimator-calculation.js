function readPositiveNumber(value, label, allowZero = false) {
    const rawValue = String(value ?? "");
    const number = Number(rawValue);
    if (!rawValue.trim() || !Number.isFinite(number) || (allowZero ? number < 0 : number <= 0)) {
        throw new Error(`${label} must be ${allowZero ? "zero or greater" : "greater than zero"}.`);
    }
    return number;
}

export function calculateEstimate({ unitLength, unitHeight, jointWidth, waste, walls }) {
    const parsedUnitLength = readPositiveNumber(unitLength, "Unit length");
    const parsedUnitHeight = readPositiveNumber(unitHeight, "Unit height");
    const parsedJointWidth = readPositiveNumber(jointWidth, "Mortar joint width", true);
    const parsedWaste = readPositiveNumber(waste, "Waste allowance", true);
    if (parsedWaste > 25) throw new Error("Waste allowance cannot be more than 25%.");
    if (!Array.isArray(walls) || walls.length === 0) throw new Error("Add at least one wall section.");

    let netArea = 0;
    const parsedWalls = walls.map((wall, index) => {
        const wallNumber = index + 1;
        const length = readPositiveNumber(wall.length, `Wall ${wallNumber} length`);
        const height = readPositiveNumber(wall.height, `Wall ${wallNumber} height`);
        const grossArea = length * height;
        let openingsArea = 0;
        const openings = [];

        for (const [openingIndex, opening] of (wall.openings || []).entries()) {
            const openingNumber = openingIndex + 1;
            const values = [opening.width, opening.height, opening.count].map((value) => String(value ?? ""));
            if (values.every((value) => !value.trim())) continue;
            if (values.some((value) => !value.trim())) {
                throw new Error(`Complete the width, height, and count for wall ${wallNumber}, opening ${openingNumber}.`);
            }

            const width = readPositiveNumber(opening.width, `Wall ${wallNumber}, opening ${openingNumber} width`);
            const openingHeight = readPositiveNumber(opening.height, `Wall ${wallNumber}, opening ${openingNumber} height`);
            const count = readPositiveNumber(opening.count, `Wall ${wallNumber}, opening ${openingNumber} count`);
            if (!Number.isInteger(count)) throw new Error(`Wall ${wallNumber}, opening ${openingNumber} count must be a whole number.`);
            if (width > length || openingHeight > height) {
                throw new Error(`Wall ${wallNumber}, opening ${openingNumber} cannot be larger than its wall.`);
            }

            const area = width * openingHeight * count;
            openingsArea += area;
            openings.push({ width, height: openingHeight, count, area });
        }

        if (openingsArea > grossArea) {
            throw new Error(`Openings on wall ${wallNumber} have more area than the wall. Check the dimensions and counts.`);
        }
        const wallNetArea = grossArea - openingsArea;
        netArea += wallNetArea;
        return { length, height, grossArea, openings, openingsArea, netArea: wallNetArea };
    });

    if (netArea <= 0) throw new Error("The measured walls have no remaining area after openings.");

    const unitFaceArea = ((parsedUnitLength + parsedJointWidth) / 1000) * ((parsedUnitHeight + parsedJointWidth) / 1000);
    const baseQuantity = netArea / unitFaceArea;
    const wasteQuantity = baseQuantity * parsedWaste / 100;
    const quantityWithWaste = baseQuantity + wasteQuantity;

    return {
        unitLength: parsedUnitLength,
        unitHeight: parsedUnitHeight,
        jointWidth: parsedJointWidth,
        waste: parsedWaste,
        walls: parsedWalls,
        netArea,
        unitFaceArea,
        baseQuantity,
        wasteQuantity,
        quantityWithWaste,
        totalQuantity: Math.ceil(quantityWithWaste),
    };
}