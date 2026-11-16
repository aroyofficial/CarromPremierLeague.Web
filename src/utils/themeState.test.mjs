import { test } from "node:test";
import assert from "node:assert/strict";
import { nextTheme, resolveTheme, savedTheme } from "./themeState.js";

test("a saved choice wins over the system setting", () => {
	assert.equal(resolveTheme("light", true), "light");
	assert.equal(resolveTheme("dark", false), "dark");
});

test("without a saved choice the system setting decides", () => {
	assert.equal(resolveTheme(null, true), "dark");
	assert.equal(resolveTheme(null, false), "light");
});

test("an unknown saved value is ignored", () => {
	assert.equal(savedTheme("sepia"), null);
	assert.equal(resolveTheme("sepia", true), "dark");
	assert.equal(resolveTheme("", false), "light");
});

test("the button flips between the two themes", () => {
	assert.equal(nextTheme("light"), "dark");
	assert.equal(nextTheme("dark"), "light");
});
