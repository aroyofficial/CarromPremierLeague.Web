import assert from "node:assert/strict";
import test from "node:test";
import { createHub } from "./realtimeHub.js";

const fakeConnect = () => {
	const opened = [];
	const connect = (options) => {
		const connection = { ...options, closed: false };
		opened.push(connection);
		return () => {
			connection.closed = true;
		};
	};
	return { opened, connect };
};

const hubWith = (on = true) => {
	const fake = fakeConnect();
	const hub = createHub({ available: () => on, streamUrl: (path) => `https://api.test/${path}`, connect: fake.connect });
	return { hub, opened: fake.opened };
};

const notice = (eventType, area) => ({ eventVersion: 1, eventId: `${eventType}-${area}`, eventType, payload: area ? { area } : {} });

test("a signed-out tab reads the public stream once for every screen", async () => {
	const { hub, opened } = hubWith();
	hub.watch({ areas: ["matches"] });
	hub.watch({ areas: ["teams"] });
	assert.equal(opened.length, 1);
	assert.equal(await opened[0].url(), "https://api.test/realtime/public");
	assert.deepEqual(opened[0].events, ["league.invalidated", "admin.invalidated", "admin.login_request.changed"]);
	assert.equal(hub.mode(), "public");
});

test("a signed-in tab switches to the admin stream with a fresh ticket, and back on sign-out", async () => {
	const { hub, opened } = hubWith();
	hub.watch({ areas: ["matches"] });
	hub.setTicketSource(async () => "t 1");
	assert.equal(opened.length, 2);
	assert.equal(opened[0].closed, true);
	assert.equal(await opened[1].url(), "https://api.test/realtime/admin?ticket=t%201");
	assert.equal(hub.mode(), "admin");
	hub.setTicketSource(null);
	assert.equal(opened.length, 3);
	assert.equal(opened[1].closed, true);
	assert.equal(await opened[2].url(), "https://api.test/realtime/public");
});

test("no ticket means no admin connection attempt", async () => {
	const { hub, opened } = hubWith();
	hub.setTicketSource(async () => null);
	hub.watch({ areas: ["me"] });
	assert.equal(await opened[0].url(), null);
});

test("the same ticket source does not reconnect", () => {
	const { hub, opened } = hubWith();
	const source = async () => "x";
	hub.watch({ areas: ["matches"] });
	hub.setTicketSource(source);
	hub.setTicketSource(source);
	assert.equal(opened.length, 2);
});

test("each listener hears only the areas it watches", () => {
	const { hub, opened } = hubWith();
	const heard = { schedule: [], users: [], handoff: [] };
	hub.watch({ areas: ["matches", "teams"], onEvent: (body) => heard.schedule.push(body.payload.area) });
	hub.watch({ areas: ["admins"], onEvent: (body) => heard.users.push(body.payload.area) });
	hub.watch({ areas: ["loginRequest"], onEvent: (body) => heard.handoff.push(body.eventType) });
	const deliver = opened[0].onEvent;
	deliver(notice("league.invalidated", "matches"));
	deliver(notice("admin.invalidated", "admins"));
	deliver(notice("admin.login_request.changed"));
	deliver(notice("league.invalidated", "gallery"));
	assert.deepEqual(heard.schedule, ["matches"]);
	assert.deepEqual(heard.users, ["admins"]);
	assert.deepEqual(heard.handoff, ["admin.login_request.changed"]);
});

test("state reaches every listener, and the last one to leave closes the stream", () => {
	const { hub, opened } = hubWith();
	const states = [];
	const stopA = hub.watch({ areas: ["matches"], onState: (state) => states.push(`a:${state}`) });
	const stopB = hub.watch({ areas: ["teams"], onState: (state) => states.push(`b:${state}`) });
	opened[0].onState("open");
	assert.deepEqual(states.slice(-2), ["a:open", "b:open"]);
	stopA();
	assert.equal(opened[0].closed, false);
	stopB();
	assert.equal(opened[0].closed, true);
	assert.equal(hub.state(), "off");
});

test("with realtime off nothing connects and screens are told so", () => {
	const { hub, opened } = hubWith(false);
	const states = [];
	hub.watch({ areas: ["matches"], onState: (state) => states.push(state) });
	hub.setTicketSource(async () => "t");
	assert.equal(opened.length, 0);
	assert.deepEqual(states, ["off", "off"]);
});
