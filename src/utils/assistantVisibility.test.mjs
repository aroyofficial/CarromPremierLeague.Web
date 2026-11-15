import assert from "node:assert/strict";
import test from "node:test";

import { assistantIsVisible } from "./assistantVisibility.js";

test("the assistant stays hidden until a provider can answer", () => {
	assert.equal(assistantIsVisible({ enabled: true, checked: true, available: false }), false);
	assert.equal(assistantIsVisible({ enabled: true, checked: false, available: true }), false);
	assert.equal(assistantIsVisible({ enabled: false, checked: true, available: true }), false);
	assert.equal(assistantIsVisible({ enabled: true, checked: true, available: true }), true);
});
