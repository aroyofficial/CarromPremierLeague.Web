import assert from "node:assert/strict";
import test from "node:test";

import { AdminSections, Permission } from "./constants.js";
import {
	appStatus,
	authError,
	authFromWebhook,
	authPayload,
	authSummary,
	blankAuth,
	filterApps,
	filterByTerm,
	filterWebhooks,
	groupAppScopes,
	groupWebhookEvents,
	headerNameError,
	parseServerTime,
	relativeTime,
	summarizeApps,
	summarizeWebhooks,
	toggleAppScope,
	toggleScopeGroup,
	webhookStatus,
	webhookUrlError,
} from "./integrations.js";

const SAMPLE_SCOPES = [
	{ code: "teams.create", area: "teams", area_name: "Teams", name: "Create teams", description: "Add teams", parent: null },
	{ code: "teams.update", area: "teams", area_name: "Teams", name: "Edit teams", description: "Edit teams", parent: null },
	{ code: "teams.delete", area: "teams", area_name: "Teams", name: "Delete teams", description: "Delete teams", parent: "teams.update" },
	{ code: "matches.update", area: "matches", area_name: "Matches", name: "Edit matches", description: "Edit matches", parent: null },
	{ code: "matches.scorecard", area: "matches", area_name: "Matches", name: "Save scorecards", description: "Scorecards", parent: "matches.update" },
];

const section = (name) => AdminSections.find((item) => item.name === name);

test("webhooks and apps are their own admin pages, each behind its own permission", () => {
	assert.deepEqual(section("admin-webhooks").permissions, [Permission.WEBHOOKS_MANAGE]);
	assert.equal(section("admin-webhooks").path, "webhooks");
	assert.deepEqual(section("admin-apps").permissions, [Permission.APPS_MANAGE]);
	assert.equal(section("admin-apps").path, "apps");
});

test("settings opens only with settings.update", () => {
	assert.deepEqual(section("admin-settings").permissions, [Permission.SETTINGS_UPDATE]);
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

test("toggleScopeGroup turns a whole area on or off and keeps parents and children consistent", () => {
	const groups = groupAppScopes(SAMPLE_SCOPES, SAMPLE_SCOPES.map((item) => item.code));
	const teams = groups.find((group) => group.area === "teams");
	const on = toggleScopeGroup([], teams, true, SAMPLE_SCOPES);
	assert.deepEqual(on, ["teams.create", "teams.update", "teams.delete"]);
	const off = toggleScopeGroup([...on, "matches.update"], teams, false, SAMPLE_SCOPES);
	assert.deepEqual(off, ["matches.update"]);
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

test("filterByTerm matches an item's name, code or description, or its whole group's title", () => {
	const groups = [
		{ key: "m", title: "Matches", items: [{ code: "match.live", name: "Match live", description: "Went live" }] },
		{ key: "l", title: "League", items: [{ code: "team.created", name: "Team created", description: "Team added" }] },
	];
	assert.equal(filterByTerm(groups, "", ["name"]), groups);
	assert.deepEqual(filterByTerm(groups, "TEAM", ["name", "code", "description"]).map((g) => g.key), ["l"]);
	assert.deepEqual(filterByTerm(groups, "matches", ["name"]).map((g) => g.items.length), [1]);
	assert.deepEqual(filterByTerm(groups, "zzz", ["name"]), []);
});

test("headerNameError accepts real header names and refuses reserved or malformed ones", () => {
	assert.equal(headerNameError("Authorization"), "");
	assert.equal(headerNameError("X-Api-Key"), "");
	assert.notEqual(headerNameError(""), "");
	assert.notEqual(headerNameError("Bad Name"), "");
	assert.notEqual(headerNameError("Content-Type"), "");
	assert.notEqual(headerNameError("host"), "");
	assert.notEqual(headerNameError("X-CPL-Signature-256"), "");
});

test("webhookUrlError wants https, and allows http only for localhost", () => {
	assert.equal(webhookUrlError("https://example.com/hooks/cpl"), "");
	assert.equal(webhookUrlError("http://localhost:8787/hook"), "");
	assert.notEqual(webhookUrlError(""), "");
	assert.notEqual(webhookUrlError("example.com/hook"), "");
	assert.notEqual(webhookUrlError("http://example.com/hook"), "");
	assert.notEqual(webhookUrlError("https://user:secret@example.com/hook"), "");
});

test("authPayload sends the credential for the chosen type, nothing when kept, and none to remove", () => {
	assert.deepEqual(authPayload({ ...blankAuth(), type: "none" }), { auth_type: "none" });
	assert.deepEqual(authPayload({ ...blankAuth(), type: "bearer", token: " abc " }), {
		auth_type: "bearer",
		auth_token: "abc",
	});
	assert.deepEqual(authPayload({ ...blankAuth(), type: "basic", username: "bot", password: " p w " }), {
		auth_type: "basic",
		auth_username: "bot",
		auth_password: " p w ",
	});
	assert.deepEqual(authPayload({ ...blankAuth(), type: "header", headerName: "X-Api-Key", headerValue: "v" }), {
		auth_type: "header",
		auth_header_name: "X-Api-Key",
		auth_header_value: "v",
	});
	assert.deepEqual(authPayload({ ...blankAuth(), type: "bearer", keep: true }), {});
});

test("authError names the first missing credential field and is quiet when complete or kept", () => {
	assert.equal(authError(blankAuth()), "");
	assert.notEqual(authError({ ...blankAuth(), type: "bearer" }), "");
	assert.equal(authError({ ...blankAuth(), type: "bearer", token: "t" }), "");
	assert.notEqual(authError({ ...blankAuth(), type: "basic", username: "bot" }), "");
	assert.notEqual(authError({ ...blankAuth(), type: "basic", username: "a:b", password: "x" }), "");
	assert.notEqual(authError({ ...blankAuth(), type: "header", headerName: "Host", headerValue: "v" }), "");
	assert.notEqual(authError({ ...blankAuth(), type: "header", headerName: "X-Key" }), "");
	assert.equal(authError({ ...blankAuth(), type: "bearer", keep: true }), "");
});

test("a webhook with a stored credential starts with it kept, and a plain one starts with none", () => {
	assert.deepEqual(authFromWebhook({ auth_type: "header", auth_header_name: "X-Key" }), {
		...blankAuth(),
		type: "header",
		headerName: "X-Key",
		keep: true,
	});
	assert.equal(authFromWebhook({ auth_type: "none" }).keep, false);
	assert.equal(authFromWebhook(null).type, "none");
	assert.equal(authSummary({ auth_type: "header", auth_header_name: "X-Key" }), "X-Key header");
	assert.equal(authSummary({ auth_type: "none" }), "");
});

test("server times without a zone are read as UTC", () => {
	assert.equal(parseServerTime("2026-11-21T10:00:00").toISOString(), "2026-11-21T10:00:00.000Z");
	assert.equal(parseServerTime("2026-11-21T10:00:00Z").toISOString(), "2026-11-21T10:00:00.000Z");
	assert.equal(parseServerTime("2026-11-21T15:30:00+05:30").toISOString(), "2026-11-21T10:00:00.000Z");
	assert.equal(parseServerTime(null), null);
	assert.equal(parseServerTime("not a date"), null);
});

test("relativeTime speaks in minutes, hours and days, past and future", () => {
	const now = Date.parse("2026-11-21T10:00:00Z");
	assert.equal(relativeTime("2026-11-21T09:59:40", now), "just now");
	assert.equal(relativeTime("2026-11-21T09:55:00", now), "5 min ago");
	assert.equal(relativeTime("2026-11-21T07:00:00", now), "3 h ago");
	assert.equal(relativeTime("2026-11-19T10:00:00", now), "2 d ago");
	assert.equal(relativeTime("2026-11-24T10:00:00", now), "in 3 d");
	assert.equal(relativeTime("", now), "");
});

const hook = (extra) => ({ id: 1, name: "Hook", url: "https://a.example", is_active: true, failure_count: 0, ...extra });

test("webhookStatus tells paused, failing, healthy and new apart", () => {
	assert.equal(webhookStatus(hook({ is_active: false })), "paused");
	assert.equal(webhookStatus(hook({ failure_count: 2 })), "failing");
	assert.equal(webhookStatus(hook({ last_status_code: 500 })), "failing");
	assert.equal(webhookStatus(hook({ last_status_code: 200, last_delivered_at: "2026-11-21T10:00:00" })), "healthy");
	assert.equal(webhookStatus(hook()), "new");
});

test("summarizeWebhooks and filterWebhooks count and narrow the list", () => {
	const list = [
		hook({ id: 1, name: "Discord", url: "https://discord.example/x" }),
		hook({ id: 2, name: "Board", is_active: false }),
		hook({ id: 3, name: "Stats", failure_count: 3 }),
	];
	assert.deepEqual(summarizeWebhooks(list), { total: 3, active: 2, failing: 1 });
	assert.deepEqual(filterWebhooks(list, "discord", "all").map((item) => item.id), [1]);
	assert.deepEqual(filterWebhooks(list, "", "paused").map((item) => item.id), [2]);
	assert.deepEqual(filterWebhooks(list, "", "failing").map((item) => item.id), [3]);
	assert.equal(filterWebhooks(list, "", "all").length, 3);
});

const NOW = Date.parse("2026-11-21T10:00:00Z");
const app = (extra) => ({ id: 1, name: "App", key_prefix: "cpl_live_ab", is_active: true, permissions: [], ...extra });

test("appStatus reports expired before paused, and flags keys that expire within a week", () => {
	assert.equal(appStatus(app(), NOW), "active");
	assert.equal(appStatus(app({ is_active: false }), NOW), "paused");
	assert.equal(appStatus(app({ expires_at: "2026-11-20T10:00:00" }), NOW), "expired");
	assert.equal(appStatus(app({ is_active: false, expires_at: "2026-11-20T10:00:00" }), NOW), "expired");
	assert.equal(appStatus(app({ expires_at: "2026-11-25T10:00:00" }), NOW), "expiring");
	assert.equal(appStatus(app({ expires_at: "2027-03-01T10:00:00" }), NOW), "active");
});

test("summarizeApps and filterApps count and narrow the list", () => {
	const list = [
		app({ id: 1, name: "Sync" }),
		app({ id: 2, name: "Old", expires_at: "2026-11-01T00:00:00" }),
		app({ id: 3, name: "Soon", expires_at: "2026-11-23T00:00:00" }),
		app({ id: 4, name: "Off", is_active: false }),
	];
	assert.deepEqual(summarizeApps(list, NOW), { total: 4, active: 2, attention: 2 });
	assert.deepEqual(filterApps(list, "sync", "all", NOW).map((item) => item.id), [1]);
	assert.deepEqual(filterApps(list, "", "expired", NOW).map((item) => item.id), [2]);
	assert.deepEqual(filterApps(list, "", "expiring", NOW).map((item) => item.id), [3]);
	assert.deepEqual(filterApps(list, "cpl_live", "paused", NOW).map((item) => item.id), [4]);
});
