import assert from "node:assert/strict";
import test from "node:test";

import { AdminSections, Permission } from "./constants.js";
import { groupAppScopes, groupWebhookEvents, settingsAccess, toggleAppScope } from "./integrations.js";

const SAMPLE_SCOPES = [
	{ code: "teams.create", area: "teams", area_name: "Teams", name: "Create teams", description: "Add teams", parent: null },
	{ code: "teams.update", area: "teams", area_name: "Teams", name: "Edit teams", description: "Edit teams", parent: null },
	{ code: "teams.delete", area: "teams", area_name: "Teams", name: "Delete teams", description: "Delete teams", parent: "teams.update" },
	{ code: "matches.update", area: "matches", area_name: "Matches", name: "Edit matches", description: "Edit matches", parent: null },
	{ code: "matches.scorecard", area: "matches", area_name: "Matches", name: "Save scorecards", description: "Scorecards", parent: "matches.update" },
];

test("admin-settings section opens for settings.update, webhooks.manage, or apps.manage", () => {
	const section = AdminSections.find((item) => item.name === "admin-settings");
	assert.deepEqual(section.permissions, [
		Permission.SETTINGS_UPDATE,
		Permission.WEBHOOKS_MANAGE,
		Permission.APPS_MANAGE,
	]);
});

test("settingsAccess unlocks only the capabilities matching held permissions", () => {
	assert.deepEqual(settingsAccess([]), {
		canOpen: false,
		canUpdateSettings: false,
		canManageWebhooks: false,
		canManageApps: false,
	});
	assert.deepEqual(settingsAccess(["webhooks.manage"]), {
		canOpen: true,
		canUpdateSettings: false,
		canManageWebhooks: true,
		canManageApps: false,
	});
	assert.deepEqual(settingsAccess(["apps.manage"]), {
		canOpen: true,
		canUpdateSettings: false,
		canManageWebhooks: false,
		canManageApps: true,
	});
	assert.deepEqual(settingsAccess(["settings.update", "webhooks.manage", "apps.manage"]), {
		canOpen: true,
		canUpdateSettings: true,
		canManageWebhooks: true,
		canManageApps: true,
	});
});

test("groupAppScopes keeps only permissions the signed-in admin holds and enforces parent availability", () => {
	const groups = groupAppScopes(SAMPLE_SCOPES, ["teams.create", "teams.delete", "matches.update", "matches.scorecard"]);
	const codes = groups.flatMap((group) => group.scopes.map((item) => item.code));
	// teams.delete is excluded because its parent teams.update is not held by the actor
	assert.deepEqual(codes, ["teams.create", "matches.update", "matches.scorecard"]);
});

test("toggleAppScope adds a missing parent when enabling a child and removes children when disabling a parent", () => {
	const withChild = toggleAppScope([], "matches.scorecard", true, SAMPLE_SCOPES);
	assert.deepEqual(new Set(withChild), new Set(["matches.update", "matches.scorecard"]));

	const droppedParent = toggleAppScope(withChild, "matches.update", false, SAMPLE_SCOPES);
	assert.deepEqual(droppedParent, []);
});

test("groupWebhookEvents groups outbound topics by category", () => {
	const groups = groupWebhookEvents([
		{ code: "match.live", group: "Matches", name: "Match live", description: "Match went live" },
		{ code: "match.ended", group: "Matches", name: "Match ended", description: "Match finished" },
		{ code: "team.created", group: "League", name: "Team created", description: "Team added" },
	]);
	assert.deepEqual(
		groups.map((item) => [item.group, item.events.map((ev) => ev.code)]),
		[
			["Matches", ["match.live", "match.ended"]],
			["League", ["team.created"]],
		],
	);
});
