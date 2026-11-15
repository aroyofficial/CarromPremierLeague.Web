import { test } from "node:test";
import assert from "node:assert/strict";
import { canStoreCredential, generatePassword, GENERATED_LENGTH, storeCredential } from "./passwordTools.js";
import { passwordStrength } from "./passwordRules.js";

test("a generated password is long and mixes every character group", () => {
	for (let run = 0; run < 200; run += 1) {
		const value = generatePassword();
		assert.equal(value.length, GENERATED_LENGTH);
		assert.match(value, /[a-z]/);
		assert.match(value, /[A-Z]/);
		assert.match(value, /[2-9]/);
		assert.match(value, /[!@#$%^&*\-_=+?]/);
		assert.doesNotMatch(value, /[0O1lI]/);
	}
});

test("a generated password scores as very strong", () => {
	assert.equal(passwordStrength(generatePassword()).score, 5);
});

test("generated passwords differ", () => {
	const seen = new Set(Array.from({ length: 50 }, () => generatePassword()));
	assert.equal(seen.size, 50);
});

test("short lengths are raised to the 12-character minimum", () => {
	assert.equal(generatePassword(4).length, 12);
});

test("browser storage is used only where the Credential Management API exists", async () => {
	assert.equal(canStoreCredential({}), false);
	assert.equal(await storeCredential("ada", "secret-password-1", "", {}), "unsupported");

	const stored = [];
	class PasswordCredential {
		constructor(data) {
			Object.assign(this, data);
		}
	}
	const scope = { PasswordCredential, navigator: { credentials: { store: async (item) => stored.push(item) } } };
	assert.equal(canStoreCredential(scope), true);
	assert.equal(await storeCredential("ada", "secret-password-1", "Ada", scope), "stored");
	assert.deepEqual({ ...stored[0] }, { id: "ada", password: "secret-password-1", name: "Ada" });

	scope.navigator.credentials.store = async () => {
		throw new Error("dismissed");
	};
	assert.equal(await storeCredential("ada", "secret-password-1", "", scope), "failed");
});
