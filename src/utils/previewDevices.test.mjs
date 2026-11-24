import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_PREVIEW_DEVICE, PREVIEW_DEVICES, deviceTitle, findPreviewDevice, fitBox, fitScale } from "./previewDevices.js";

test("device ids are unique and the default exists", () => {
	const ids = PREVIEW_DEVICES.map((device) => device.id);
	assert.equal(new Set(ids).size, ids.length);
	assert.ok(ids.includes(DEFAULT_PREVIEW_DEVICE));
});

test("findPreviewDevice falls back to the default for unknown ids", () => {
	assert.equal(findPreviewDevice("nope").id, DEFAULT_PREVIEW_DEVICE);
	assert.equal(findPreviewDevice("phone-portrait").height, 844);
});

test("fitScale contains the 16:9 canvas without cropping", () => {
	assert.equal(fitScale(1920, 1080), 1);
	assert.equal(fitScale(960, 540), 0.5);
	// Portrait phone: width is the limiting side.
	assert.equal(fitScale(390, 844), 390 / 1920);
	// Wide window: height is the limiting side.
	assert.equal(fitScale(3840, 540), 0.5);
	assert.equal(fitScale(0, 100), 1);
});

test("fitBox keeps the device aspect ratio inside the free space", () => {
	const phone = findPreviewDevice("phone-portrait");
	const box = fitBox(600, 440, phone);
	assert.equal(box.height, 440);
	assert.ok(box.width <= 600);
	assert.ok(Math.abs(box.width / box.height - 390 / 844) < 0.01);
	const stream = findPreviewDevice("stream");
	assert.deepEqual(fitBox(480, 1000, stream), { width: 480, height: 270 });
	assert.deepEqual(fitBox(0, 100, stream), { width: 0, height: 0 });
});

test("deviceTitle includes orientation when present", () => {
	assert.equal(deviceTitle(findPreviewDevice("tablet-portrait")), "Tablet portrait");
	assert.equal(deviceTitle(findPreviewDevice("stream")), "Stream 16:9");
});
