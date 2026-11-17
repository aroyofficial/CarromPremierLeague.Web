import assert from "node:assert/strict";
import test from "node:test";
import { suggestUsername, usernameCandidates } from "./adminUsername.js";

test("a first and last name become the username", () => {
	assert.equal(suggestUsername("Ada", "Lovelace", "ada@example.com"), "ada.lovelace");
});

test("the same name keeps the email in the next choice", () => {
	const candidates = usernameCandidates("Ada", "Lovelace", "ada.other@example.com");
	assert.equal(candidates[0], "ada.lovelace");
	assert.equal(candidates[1], "ada.lovelace.ada.other");
	assert.ok(candidates.includes("ada.lovelace2"));
});

test("an email alone uses the mailbox name", () => {
	assert.equal(suggestUsername("", "", "New-Admin@Example.com"), "new-admin");
});

test("accents and spaces are dropped", () => {
	assert.equal(suggestUsername(" José ", "García", "j@example.com"), "jose.garcia");
});
