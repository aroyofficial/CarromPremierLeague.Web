import assert from "node:assert/strict";
import test from "node:test";

import { adminAssistantIsVisible, assistantIsVisible, assistantSwitches } from "./assistantVisibility.js";
import { readClaims } from "./tokenClaims.js";

test("the assistant stays hidden until a provider can answer", () => {
	assert.equal(assistantIsVisible({ enabled: true, checked: true, available: false }), false);
	assert.equal(assistantIsVisible({ enabled: true, checked: false, available: true }), false);
	assert.equal(assistantIsVisible({ enabled: false, checked: true, available: true }), false);
	assert.equal(assistantIsVisible({ enabled: true, checked: true, available: true }), true);
});

test("the two switches come from the API and fall back to the old single value", () => {
	assert.deepEqual(assistantSwitches({ assistant_public_enabled: false, assistant_admin_enabled: true }), {
		assistant_public_enabled: false,
		assistant_admin_enabled: true,
	});
	assert.deepEqual(assistantSwitches({ assistant_enabled: false }), {
		assistant_public_enabled: false,
		assistant_admin_enabled: false,
	});
	assert.deepEqual(assistantSwitches({}), { assistant_public_enabled: true, assistant_admin_enabled: true });
	assert.deepEqual(assistantSwitches(undefined), { assistant_public_enabled: true, assistant_admin_enabled: true });
});

test("the admin launcher needs the switch, a signed-in admin with access, and a provider", () => {
	const ready = {
		enabled: true,
		checked: true,
		available: true,
		signedIn: true,
		mustChangePassword: false,
		hasAccess: true,
	};
	assert.equal(adminAssistantIsVisible(ready), true);
	assert.equal(adminAssistantIsVisible({ ...ready, hasAccess: false }), false);
	assert.equal(adminAssistantIsVisible({ ...ready, enabled: false }), false);
	assert.equal(adminAssistantIsVisible({ ...ready, signedIn: false }), false);
	assert.equal(adminAssistantIsVisible({ ...ready, mustChangePassword: true }), false);
	assert.equal(adminAssistantIsVisible({ ...ready, available: false }), false);
});

test("token claims are read without trusting them", () => {
	const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
	const token = `${encode({ alg: "HS256" })}.${encode({ sub: "3", ast: true })}.signature`;
	assert.equal(readClaims(token).ast, true);
	assert.deepEqual(readClaims("not-a-token"), {});
	assert.deepEqual(readClaims(null), {});
});
