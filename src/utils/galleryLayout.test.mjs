import assert from "node:assert/strict";
import test from "node:test";

import { GALLERY_ROW_GAP, galleryAspect, packGalleryRows } from "./galleryLayout.js";

const photos = [
	{ id: 1, width: 1600, height: 900 },
	{ id: 2, width: 800, height: 1200 },
	{ id: 3, width: 1000, height: 1000 },
	{ id: 4, width: 400, height: 2000 },
	{ id: 5, width: 3000, height: 500 },
];

test("extreme photos are clamped to the shared aspect range", () => {
	assert.equal(galleryAspect(photos[3]), 0.45);
	assert.equal(galleryAspect(photos[4]), 2.6);
	assert.equal(galleryAspect({}), 4 / 3);
});

test("a full row fills the container and the last row stays at the target height", () => {
	const width = 1000;
	const rows = packGalleryRows(photos, width);
	assert.equal(rows.length, 2);
	assert.deepEqual(
		rows[0].map((cell) => cell.photo.id),
		[1, 2, 3, 4],
	);
	const filled = rows[0].reduce((sum, cell) => sum + cell.width, 0) + GALLERY_ROW_GAP * (rows[0].length - 1);
	assert.equal(filled, width);
	assert.ok(rows[0].every((cell) => cell.height === rows[0][0].height));
	assert.equal(rows[1][0].photo.id, 5);
	assert.equal(rows[1][0].height, 200);
	assert.equal(rows[1][0].width, 520);
});

test("a narrow container uses the shorter target row", () => {
	const rows = packGalleryRows(photos.slice(0, 2), 400);
	assert.equal(rows.at(-1)[0].height <= 160, true);
});
