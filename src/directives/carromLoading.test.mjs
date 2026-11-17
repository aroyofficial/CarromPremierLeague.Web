import { test } from "node:test";
import assert from "node:assert/strict";
import { isLoading } from "./carromLoadingState.js";

test("a loading flag is on only while it is true", () => {
	assert.equal(isLoading(true), true);
	assert.equal(isLoading(false), false);
	assert.equal(isLoading(0), false);
	assert.equal(isLoading("wait"), true);
});
