import { test } from "node:test";
import assert from "node:assert/strict";
import { contactNumberError, limitContactDigits } from "./contactNumber.js";

test("a contact number keeps at most 10 digits", () => {
	assert.equal(limitContactDigits("90000000119"), "9000000011");
	assert.equal(limitContactDigits("90000 00011"), "9000000011");
	assert.equal(limitContactDigits("09876543210"), "9876543210");
	assert.equal(limitContactDigits("919876543210"), "9876543210");
});

test("a contact number needs a country code and exactly 10 digits", () => {
	assert.equal(contactNumberError("", true), "Enter both a country code and a contact number");
	assert.equal(contactNumberError("9000000011", false), "Enter both a country code and a contact number");
	assert.equal(contactNumberError("900000001", true), "Enter exactly 10 digits, without spaces");
	assert.equal(contactNumberError("90000000111", true), "Enter exactly 10 digits, without spaces");
	assert.equal(contactNumberError("90000 00011", true), "Enter exactly 10 digits, without spaces");
	assert.equal(contactNumberError("9000000011", true), "");
});
