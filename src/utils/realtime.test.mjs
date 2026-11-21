import assert from "node:assert/strict";
import test from "node:test";
import {
	acceptEvent,
	areaMatches,
	areaOf,
	areas,
	EVENT_TYPES,
	guarded,
	pollDelayMs,
	retryDelayMs,
} from "./realtimeRules.js";

test("an event is applied once", () => {
	const seen = new Set();
	const event = { eventVersion: 1, eventId: "abc" };
	assert.equal(acceptEvent(event, seen), true);
	assert.equal(acceptEvent(event, seen), false);
});

test("an unknown version or a missing id is ignored", () => {
	const seen = new Set();
	assert.equal(acceptEvent({ eventVersion: 2, eventId: "b" }, seen), false);
	assert.equal(acceptEvent({ eventVersion: 1 }, seen), false);
	assert.equal(acceptEvent(null, seen), false);
});

test("the seen list stays bounded", () => {
	const seen = new Set();
	for (let index = 0; index < 250; index += 1) acceptEvent({ eventVersion: 1, eventId: `e${index}` }, seen);
	assert.equal(seen.size, 200);
	assert.equal(seen.has("e0"), false);
	assert.equal(seen.has("e249"), true);
});

test("reconnect waits longer, then caps", () => {
	assert.equal(retryDelayMs(1), 2000);
	assert.equal(retryDelayMs(8), 30000);
});

test("a screen ignores writes it does not display", () => {
	const players = { eventVersion: 1, payload: { area: "players" } };
	const countries = { eventVersion: 1, payload: { area: "countries" } };
	assert.equal(areaMatches(players, areas.points), false);
	assert.equal(areaMatches(players, areas.schedule), true);
	assert.equal(areaMatches(countries, areas.players), true);
	assert.equal(areaMatches(countries, areas.stats), false);
	assert.equal(areaMatches({ eventVersion: 1, payload: {} }, areas.points), true);
	assert.equal(areaMatches(players, undefined), true);
});

test("every notice type reduces to one area", () => {
	assert.deepEqual(EVENT_TYPES, ["league.invalidated", "admin.invalidated", "admin.login_request.changed"]);
	assert.equal(areaOf({ eventType: "league.invalidated", payload: { area: "gallery" } }), "gallery");
	assert.equal(areaOf({ eventType: "admin.invalidated", payload: { area: "admins" } }), "admins");
	assert.equal(areaOf({ eventType: "admin.invalidated", payload: { area: "me" } }), "me");
	assert.equal(areaOf({ eventType: "admin.login_request.changed", payload: {} }), "loginRequest");
	assert.equal(areaOf({ eventType: "league.invalidated", payload: {} }), null);
});

test("admin notices reach only the screens that show that data", () => {
	const admins = { eventVersion: 1, eventType: "admin.invalidated", payload: { area: "admins" } };
	const me = { eventVersion: 1, eventType: "admin.invalidated", payload: { area: "me" } };
	const login = { eventVersion: 1, eventType: "admin.login_request.changed", payload: {} };
	const gallery = { eventVersion: 1, eventType: "league.invalidated", payload: { area: "gallery" } };
	assert.equal(areaMatches(admins, areas.adminUsers), true);
	assert.equal(areaMatches(admins, areas.adminPermissions), true);
	assert.equal(areaMatches(admins, areas.schedule), false);
	assert.equal(areaMatches(me, areas.adminProfile), true);
	assert.equal(areaMatches(me, areas.adminSecurity), true);
	assert.equal(areaMatches(me, areas.stores), true);
	assert.equal(areaMatches(me, areas.adminUsers), false);
	assert.equal(areaMatches(login, areas.loginRequest), true);
	assert.equal(areaMatches(login, areas.schedule), false);
	assert.equal(areaMatches(login, areas.adminDashboard), false);
	assert.equal(areaMatches(gallery, areas.gallery), true);
	assert.equal(areaMatches(gallery, areas.adminGallery), true);
	assert.equal(areaMatches(gallery, areas.points), false);
});

test("every area a screen watches is one the server can name", () => {
	const known = new Set([
		"matches", "seasons", "teams", "players", "countries", "rosters", "settings", "gallery", "widgets",
		"admins", "me", "loginRequest", "integrations",
	]);
	for (const [screen, watched] of Object.entries(areas)) {
		assert.ok(watched.length, `${screen} watches nothing`);
		for (const area of watched) assert.ok(known.has(area), `${screen} watches unknown area ${area}`);
	}
	const widgetNotice = { eventVersion: 1, eventType: "league.invalidated", payload: { area: "widgets" } };
	assert.equal(areaMatches(widgetNotice, areas.widget), true);
	assert.equal(areaMatches(widgetNotice, areas.schedule), false);
});

test("a refetch waits while the screen has unsaved edits", () => {
	let calls = 0;
	let dirty = true;
	const run = guarded(() => (calls += 1), () => dirty);
	run();
	assert.equal(calls, 0);
	dirty = false;
	run();
	assert.equal(calls, 1);
	const always = guarded(() => (calls += 1));
	always();
	assert.equal(calls, 2);
});

test("polling slows only while a stream is open", () => {
	assert.equal(pollDelayMs("open"), 60000);
	assert.equal(pollDelayMs("down"), 5000);
	assert.equal(pollDelayMs("off"), 5000);
	assert.equal(pollDelayMs("open", 4000, 30000), 30000);
	assert.equal(pollDelayMs("down", 4000, 30000), 4000);
});
