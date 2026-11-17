import { test } from "node:test";
import assert from "node:assert/strict";
import { rotatedDimensions } from "./pictureFrame.js";

test("a quarter turn swaps width and height, a half turn keeps them", () => {
	assert.deepEqual(rotatedDimensions(800, 600, 1), { width: 600, height: 800 });
	assert.deepEqual(rotatedDimensions(800, 600, 3), { width: 600, height: 800 });
	assert.deepEqual(rotatedDimensions(800, 600, 2), { width: 800, height: 600 });
	assert.deepEqual(rotatedDimensions(800, 600, 0), { width: 800, height: 600 });
});

test("negative and whole-turn counts wrap to the same quarter turn", () => {
	assert.deepEqual(rotatedDimensions(800, 600, -1), { width: 600, height: 800 });
	assert.deepEqual(rotatedDimensions(800, 600, 5), { width: 600, height: 800 });
	assert.deepEqual(rotatedDimensions(800, 600, 4), { width: 800, height: 600 });
});
