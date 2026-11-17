import { test } from "node:test";
import assert from "node:assert/strict";
import { maskEmail } from "./maskEmail.js";

test("an email is masked to its first and last letter of the name", () => {
	assert.equal(maskEmail("arijit.roy@example.com"), "a••••••y@example.com");
	assert.equal(maskEmail("ab@example.com"), "a•@example.com");
	assert.equal(maskEmail("  Q@example.com "), "Q•@example.com");
});

test("bad input gives an empty mask rather than a partial address", () => {
	assert.equal(maskEmail(""), "");
	assert.equal(maskEmail("no-at-sign"), "");
	assert.equal(maskEmail("@example.com"), "");
	assert.equal(maskEmail("name@"), "");
});
