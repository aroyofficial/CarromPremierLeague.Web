import assert from "node:assert/strict";
import test from "node:test";

import { formatDuration, passwordChecks, passwordReady, passwordStrength } from "./passwordRules.js";

test("a password is ready once it is long enough and confirmed", () => {
	assert.equal(passwordReady("short", "short"), false);
	assert.equal(passwordReady("long-enough-pass", "different"), false);
	assert.equal(passwordReady("long-enough-pass", "long-enough-pass"), true);
});

test("the checklist marks each rule", () => {
	const checks = Object.fromEntries(passwordChecks("Abcdefghijk1", "Abcdefghijk1").map((check) => [check.id, check.met]));
	assert.deepEqual(checks, { length: true, mix: true, number: true, match: true });
	assert.equal(passwordChecks("", "").find((check) => check.id === "match").met, false);
});

test("strength stays low until the minimum length", () => {
	assert.equal(passwordStrength("").score, 0);
	assert.equal(passwordStrength("Ab1!").label, "Too short");
	assert.equal(passwordStrength("abcdefghijk").label, "Too short");
	assert.equal(passwordStrength("abcdefghijkl").label, "Weak");
	assert.equal(passwordStrength("Abcdefghijk1").label, "Good");
	assert.equal(passwordStrength("Abcdefghijk1!xyz").label, "Very strong");
});

test("durations read as minutes and seconds", () => {
	assert.equal(formatDuration(0), "0:00");
	assert.equal(formatDuration(65), "1:05");
	assert.equal(formatDuration(-3), "0:00");
});
