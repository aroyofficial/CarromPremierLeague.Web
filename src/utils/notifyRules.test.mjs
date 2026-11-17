import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_VISIBLE, dedupeKey, durationFor, liveRole, overflowIds, staleIds } from "./notifyRules.js";

test("success clears after 3 to 5 seconds and info after about 5", () => {
	assert.equal(durationFor("success"), 4000);
	assert.equal(durationFor("info"), 5000);
	assert.equal(durationFor("success", { duration: 1000 }), 3000);
	assert.equal(durationFor("success", { duration: 9000 }), 5000);
});

test("warnings and contextual errors clear after 6 to 10 seconds", () => {
	assert.equal(durationFor("warning"), 8000);
	assert.equal(durationFor("error", { contextual: true }), 8000);
	assert.equal(durationFor("error", { contextual: true, duration: 2000 }), 6000);
	assert.equal(durationFor("warning", { duration: 30000 }), 10000);
});

test("an error with no field-level explanation stays until dismissed", () => {
	assert.equal(durationFor("error"), 0);
	assert.equal(durationFor("error", { duration: 7000 }), 0);
});

test("navigation clears stale errors and warnings but not critical or newer ones", () => {
	const items = [
		{ id: 1, type: "error", createdAt: 100 },
		{ id: 2, type: "warning", createdAt: 100 },
		{ id: 3, type: "error", critical: true, createdAt: 100 },
		{ id: 4, type: "success", createdAt: 100 },
		{ id: 5, type: "error", createdAt: 300 },
		{ id: 6, type: "loading", createdAt: 100 },
	];
	assert.deepEqual(staleIds(items, 200), [1, 2]);
});

test("critical notifications persist until dismissed", () => {
	assert.equal(durationFor("error", { critical: true }), 0);
	assert.equal(durationFor("warning", { critical: true, duration: 4000 }), 0);
});

test("loading notifications persist until closed", () => {
	assert.equal(durationFor("loading"), 0);
	assert.equal(durationFor("loading", { duration: 3000 }), 0);
});

test("the same message is de-duplicated by type and text", () => {
	assert.equal(dedupeKey("error", "Save failed"), "error:Save failed");
	assert.notEqual(dedupeKey("error", "Save failed"), dedupeKey("success", "Save failed"));
	assert.equal(dedupeKey("info", "x", "custom"), "custom");
});

test("only the oldest removable notifications are trimmed", () => {
	const items = [
		{ id: 1, type: "success" },
		{ id: 2, type: "loading" },
		{ id: 3, type: "error", critical: true },
		{ id: 4, type: "info" },
		{ id: 5, type: "warning" },
		{ id: 6, type: "success" },
	];
	assert.deepEqual(overflowIds(items, MAX_VISIBLE), [1, 4]);
	assert.deepEqual(overflowIds(items.slice(0, 4), MAX_VISIBLE), []);
});

test("errors and warnings are announced assertively, others politely", () => {
	assert.equal(liveRole("error"), "alert");
	assert.equal(liveRole("warning"), "alert");
	assert.equal(liveRole("success"), "status");
	assert.equal(liveRole("loading"), "status");
});
