import assert from "node:assert/strict";
import test from "node:test";
import { acceptEvent, areaMatches, areas, pollDelayMs, retryDelayMs } from "./realtimeRules.js";

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

test("polling slows only while a stream is open", () => {
	assert.equal(pollDelayMs("open"), 60000);
	assert.equal(pollDelayMs("down"), 5000);
	assert.equal(pollDelayMs("off"), 5000);
	assert.equal(pollDelayMs("open", 4000, 30000), 30000);
	assert.equal(pollDelayMs("down", 4000, 30000), 4000);
});
