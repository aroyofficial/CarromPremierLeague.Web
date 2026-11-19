import { test } from "node:test";
import assert from "node:assert/strict";
import { optionalContactError } from "./contactNumber.js";

test("an empty optional phone is valid, with or without a country code", () => {
	assert.equal(optionalContactError("", null), "");
	assert.equal(optionalContactError("   ", ""), "");
});

test("a typed number needs a country code and a valid number for it", () => {
	assert.equal(optionalContactError("9000000011", null), "Choose a country code for this number.");
	assert.equal(optionalContactError("", "+91"), "Enter a contact number, or clear the country code.");
	assert.equal(optionalContactError("9000000011", "+91"), "");
	assert.equal(optionalContactError("5000000011", "+91"), "Enter a 10-digit Indian mobile number that starts with 6 to 9.");
	assert.equal(optionalContactError("90000 00011", "+91"), "");
	assert.equal(optionalContactError("12ab", "+1"), "Use digits only.");
	assert.equal(optionalContactError("4155550100", "+1"), "");
});

test("an Indian number with a trunk 0 or a repeated 91 is accepted, like the API", () => {
	assert.equal(optionalContactError("09876543210", "+91"), "");
	assert.equal(optionalContactError("919876543210", "+91"), "");
	assert.equal(optionalContactError("9123456789", "+91"), "");
	assert.equal(optionalContactError("91912345678", "+91"), "Enter at most 10 digits.");
});

test("outside India the country code and number must make 8 to 15 digits together", () => {
	const tooShort = "Enter the full number. With the country code it should be 8 to 15 digits.";
	assert.equal(optionalContactError("12345", "+44"), tooShort);
	assert.equal(optionalContactError("123456", "+1"), tooShort);
	assert.equal(optionalContactError("0123456", "+1"), tooShort);
	assert.equal(optionalContactError("1234567", "+1"), "");
	assert.equal(optionalContactError("1234567890", "+44"), "");
	assert.equal(optionalContactError("12345678901", "+44"), "Enter at most 10 digits.");
});
