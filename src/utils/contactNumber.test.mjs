import { test } from "node:test";
import assert from "node:assert/strict";
import { contactNumberError } from "./contactNumber.js";

test("a contact number needs a country code and exactly 10 digits", () => {
	assert.equal(contactNumberError("", true), "Enter both a country code and a contact number");
	assert.equal(contactNumberError("9000000011", false), "Enter both a country code and a contact number");
	assert.equal(contactNumberError("900000001", true), "Enter exactly 10 digits, without spaces");
	assert.equal(contactNumberError("90000000111", true), "Enter exactly 10 digits, without spaces");
	assert.equal(contactNumberError("90000 00011", true), "Enter exactly 10 digits, without spaces");
	assert.equal(contactNumberError("9000000011", true), "");
});
