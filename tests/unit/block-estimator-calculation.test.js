import assert from "node:assert/strict";
import test from "node:test";
import { calculateEstimate } from "../../assets/js/block-estimator-calculation.js";

function estimate(overrides = {}) {
    return calculateEstimate({
        unitLength: "400",
        unitHeight: "200",
        jointWidth: "10",
        waste: "5",
        walls: [{ length: "5", height: "3", openings: [] }],
        ...overrides,
    });
}

test("deducts openings, adds waste, and rounds the final quantity up", () => {
    const result = estimate({
        walls: [{
            length: "5",
            height: "3",
            openings: [{ width: "0.9", height: "2", count: "1" }],
        }],
    });

    assert.equal(result.netArea, 13.2);
    assert.equal(result.walls[0].openingsArea, 1.8);
    assert.equal(result.totalQuantity, 161);
});

test("combines multiple walls and repeated openings", () => {
    const result = estimate({
        unitLength: "1000",
        unitHeight: "1000",
        jointWidth: "0",
        waste: "0",
        walls: [
            { length: "5", height: "3", openings: [{ width: "1", height: "1", count: "2" }] },
            { length: "4", height: "2", openings: [] },
        ],
    });

    assert.equal(result.netArea, 21);
    assert.equal(result.totalQuantity, 21);
});

test("accepts zero joint width and zero waste", () => {
    const result = estimate({
        unitLength: "600",
        unitHeight: "600",
        jointWidth: "0",
        waste: "0",
        walls: [{ length: "1", height: "1", openings: [] }],
    });

    assert.equal(result.unitFaceArea, 0.36);
    assert.equal(result.totalQuantity, 3);
});

test("rejects missing and invalid required dimensions", () => {
    assert.throws(() => estimate({ unitLength: "" }), /Unit length must be greater than zero/);
    assert.throws(() => estimate({ unitHeight: "-1" }), /Unit height must be greater than zero/);
    assert.throws(() => estimate({ walls: [{ length: "Infinity", height: "3", openings: [] }] }), /Wall 1 length must be greater than zero/);
    assert.throws(() => estimate({ jointWidth: "-1" }), /Mortar joint width must be zero or greater/);
});

test("rejects missing walls and waste above the allowed maximum", () => {
    assert.throws(() => estimate({ walls: [] }), /Add at least one wall section/);
    assert.throws(() => estimate({ waste: "25.5" }), /Waste allowance cannot be more than 25%/);
});

test("rejects incomplete openings and fractional opening counts", () => {
    assert.throws(() => estimate({
        walls: [{ length: "5", height: "3", openings: [{ width: "1", height: "", count: "1" }] }],
    }), /Complete the width, height, and count/);
    assert.throws(() => estimate({
        walls: [{ length: "5", height: "3", openings: [{ width: "1", height: "1", count: "1.5" }] }],
    }), /count must be a whole number/);
});

test("rejects openings larger than the wall or that remove all wall area", () => {
    assert.throws(() => estimate({
        walls: [{ length: "5", height: "3", openings: [{ width: "6", height: "1", count: "1" }] }],
    }), /cannot be larger than its wall/);
    assert.throws(() => estimate({
        walls: [{ length: "2", height: "2", openings: [{ width: "2", height: "2", count: "1" }] }],
    }), /no remaining area/);
});