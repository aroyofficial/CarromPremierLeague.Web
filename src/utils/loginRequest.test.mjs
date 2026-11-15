import { test } from "node:test";
import assert from "node:assert/strict";
import { requestDeadline, secondsLeft } from "./loginRequest.js";

test("a request deadline is the remaining seconds from now", () => {
	assert.equal(requestDeadline(1_000, 90), 91_000);
	assert.equal(requestDeadline(1_000, 0), 1_000);
});

test("a missing remaining time falls back to ten minutes", () => {
	assert.equal(requestDeadline(5_000, undefined), 5_000 + 600_000);
});

test("seconds left counts down and stops at zero", () => {
	assert.equal(secondsLeft(10_500, 8_000), 3);
	assert.equal(secondsLeft(8_000, 9_000), 0);
	assert.equal(secondsLeft(0, 9_000), 0);
});
