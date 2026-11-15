import { test } from "node:test";
import assert from "node:assert/strict";
import { initialSidebarExpanded, isPhoneWidth, sidebarPreference } from "./sidebarState.js";

test("phones always start with the rail collapsed", () => {
	assert.equal(initialSidebarExpanded(390, "expanded"), false);
	assert.equal(initialSidebarExpanded(767, null), false);
	assert.equal(isPhoneWidth(768), false);
});

test("tablet and desktop follow the saved choice", () => {
	assert.equal(initialSidebarExpanded(820, "expanded"), true);
	assert.equal(initialSidebarExpanded(1440, "collapsed"), false);
});

test("without a saved choice, wide screens expand and tablets collapse", () => {
	assert.equal(initialSidebarExpanded(1280, null), true);
	assert.equal(initialSidebarExpanded(1024, null), false);
});

test("the saved choice is a readable word", () => {
	assert.equal(sidebarPreference(true), "expanded");
	assert.equal(sidebarPreference(false), "collapsed");
});
