import { test } from "node:test";
import assert from "node:assert/strict";
import { fullName, givenName, initial } from "./adminNames.js";

test("full name joins first and last name", () => {
	assert.equal(fullName({ firstName: " Ada ", lastName: "Lovelace", username: "ada" }), "Ada Lovelace");
	assert.equal(fullName({ firstName: "Ada", username: "ada" }), "Ada");
});

test("full name falls back to the username", () => {
	assert.equal(fullName({ firstName: "  ", lastName: null, username: "ada-admin" }), "ada-admin");
	assert.equal(fullName(), "");
});

test("given name prefers the first name", () => {
	assert.equal(givenName({ firstName: "Ada", username: "ada-admin" }), "Ada");
	assert.equal(givenName({ firstName: "", username: "ada-admin" }), "ada-admin");
});

test("initial comes from the shown name", () => {
	assert.equal(initial({ firstName: "ada", username: "zed" }), "A");
	assert.equal(initial({ username: "zed" }), "Z");
	assert.equal(initial({}), "A");
});
