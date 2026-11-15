import assert from "node:assert/strict";
import test from "node:test";

import { AdminSections } from "./constants.js";

test("profile stays in the admin menu for every signed-in account", () => {
	const profile = AdminSections.find((section) => section.name === "admin-profile");
	assert.equal(profile.label, "Profile");
	assert.equal(profile.path, "profile");
	assert.deepEqual(profile.permissions, []);
});
