import { test } from "node:test";
import assert from "node:assert/strict";
import { isLoading, loadingText } from "./carromLoadingState.js";

test("a loading flag shows the mask only while it is on", () => {
	assert.equal(isLoading(true), true);
	assert.equal(isLoading(false), false);
	assert.equal(isLoading(0), false);
	assert.equal(isLoading("wait"), true);
});

test("section text comes from the element attribute or an options object", () => {
	const el = {
		getAttribute(name) {
			return name === "element-loading-text" ? "Loading..." : null;
		},
	};
	assert.equal(loadingText(el, true), "Loading...");
	assert.equal(loadingText(el, { text: "Saving..." }), "Saving...");
	assert.equal(loadingText({}, true), "");
});
