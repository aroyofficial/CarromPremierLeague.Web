import { test } from "node:test";
import assert from "node:assert/strict";
import { delegableTree, flattenTree } from "./permissionTree.js";

const tree = {
	sections: [
		{
			code: "league",
			name: "League",
			areas: [
				{
					code: "players",
					name: "Players",
					permissions: [
						{ code: "players.view", name: "View players", parent: null },
						{ code: "players.edit", name: "Edit players", parent: "players.view" },
					],
				},
				{ code: "teams", name: "Teams", permissions: [{ code: "teams.view", name: "View teams", parent: null }] },
			],
		},
		{
			code: "admin",
			name: "Admin",
			areas: [{ code: "admins", name: "Admins", permissions: [{ code: "admins.manage", name: "Manage admins", parent: null }] }],
		},
	],
	roles: [
		{ code: "viewer", name: "Viewer", permissions: ["players.view", "teams.view"] },
		{ code: "owner", name: "Owner", permissions: ["players.view", "admins.manage"] },
	],
};

test("only held permissions are left in the tree", () => {
	const codes = flattenTree(delegableTree(tree, ["players.view", "teams.view"])).map((item) => item.code);
	assert.deepEqual(codes, ["players.view", "teams.view"]);
});

test("areas and sections with nothing held are removed", () => {
	const result = delegableTree(tree, ["players.view"]);
	assert.deepEqual(result.sections.map((section) => section.code), ["league"]);
	assert.deepEqual(result.sections[0].areas.map((area) => area.code), ["players"]);
});

test("a role stays only when every permission in it is held", () => {
	assert.deepEqual(delegableTree(tree, ["players.view", "teams.view"]).roles.map((role) => role.code), ["viewer"]);
	assert.deepEqual(delegableTree(tree, []).roles, []);
});

test("an empty or missing tree gives an empty tree", () => {
	assert.deepEqual(delegableTree(null, ["players.view"]).sections, []);
	assert.deepEqual(delegableTree({ sections: [], roles: [] }, null).sections, []);
});
