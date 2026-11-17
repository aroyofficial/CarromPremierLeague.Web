import assert from "node:assert/strict";
import test from "node:test";
import { CONNECT_TIMEOUT_MS, STALE_MS } from "./realtimeRules.js";
import { connect, keepFresh } from "./realtimeStream.js";

const fakeEnv = () => {
	const sources = [];
	const timers = new Map();
	let next = 1;
	class FakeSource {
		constructor(url) {
			this.url = url;
			this.handlers = {};
			this.closed = false;
			sources.push(this);
		}
		addEventListener(name, handler) {
			(this.handlers[name] ||= []).push(handler);
		}
		emit(name, data) {
			for (const handler of this.handlers[name] || []) handler({ data: data === undefined ? "" : JSON.stringify(data) });
		}
		close() {
			this.closed = true;
		}
	}
	const schedule = (fn, ms, repeat) => {
		const id = next++;
		timers.set(id, { fn, ms, repeat });
		return id;
	};
	return {
		sources,
		timers,
		EventSource: FakeSource,
		setTimeout: (fn, ms) => schedule(fn, ms, false),
		clearTimeout: (id) => timers.delete(id),
		setInterval: (fn, ms) => schedule(fn, ms, true),
		clearInterval: (id) => timers.delete(id),
		runTimeouts() {
			for (const [id, timer] of [...timers]) {
				if (timer.repeat) continue;
				timers.delete(id);
				timer.fn();
			}
		},
		intervals: () => [...timers.values()].filter((timer) => timer.repeat).map((timer) => timer.ms),
		fire(ms) {
			for (const [id, timer] of [...timers]) {
				if (timer.repeat || timer.ms !== ms) continue;
				timers.delete(id);
				timer.fn();
			}
		},
	};
};

const flush = () => new Promise((resolve) => setImmediate(resolve));
const notice = (id) => ({ eventId: id, eventVersion: 1, eventType: "league.invalidated" });

test("a notice is delivered once and the stream reports open", async () => {
	const env = fakeEnv();
	const events = [];
	const states = [];
	connect({ url: async () => "u", events: ["league.invalidated"], onEvent: (b) => events.push(b.eventId), onState: (s) => states.push(s), env });
	await flush();
	const [source] = env.sources;
	source.emit("open");
	source.emit("league.invalidated", notice("a"));
	source.emit("league.invalidated", notice("a"));
	source.emit("league.invalidated", notice("b"));
	assert.deepEqual(events, ["a", "b"]);
	assert.deepEqual(states, ["open"]);
});

test("a dropped stream reconnects after a backoff with a fresh url", async () => {
	const env = fakeEnv();
	const states = [];
	let calls = 0;
	connect({ url: async () => `u${++calls}`, events: [], onEvent: () => {}, onState: (s) => states.push(s), env });
	await flush();
	env.sources[0].emit("error");
	assert.equal(env.sources[0].closed, true);
	assert.deepEqual(states, ["down"]);
	env.runTimeouts();
	await flush();
	assert.equal(env.sources.length, 2);
	assert.equal(env.sources[1].url, "u2");
});

test("no ticket means retry later, not a broken stream", async () => {
	const env = fakeEnv();
	const states = [];
	connect({ url: async () => null, events: [], onEvent: () => {}, onState: (s) => states.push(s), env });
	await flush();
	assert.equal(env.sources.length, 0);
	assert.deepEqual(states, ["down"]);
	assert.equal(env.timers.size, 1);
});

test("a revoked stream stops for good", async () => {
	const env = fakeEnv();
	connect({ url: async () => "u", events: [], onEvent: () => {}, onState: () => {}, env });
	await flush();
	env.sources[0].emit("realtime.revoked");
	assert.equal(env.sources[0].closed, true);
	env.runTimeouts();
	await flush();
	assert.equal(env.sources.length, 1);
});

test("stop closes the stream and cancels the retry", async () => {
	const env = fakeEnv();
	const stop = connect({ url: async () => "u", events: [], onEvent: () => {}, onState: () => {}, env });
	await flush();
	env.sources[0].emit("error");
	stop();
	assert.equal(env.timers.size, 0);
});

test("a heartbeat keeps the stream open and does not refetch", async () => {
	const env = fakeEnv();
	const events = [];
	connect({ url: async () => "u", events: ["league.invalidated"], onEvent: (body) => events.push(body), onState: () => {}, env });
	await flush();
	env.sources[0].emit("open");
	const armed = [...env.timers.keys()];
	env.sources[0].emit("realtime.heartbeat");
	assert.equal(events.length, 0);
	assert.equal(env.sources[0].closed, false);
	assert.equal(env.timers.has(armed[0]), false);
	assert.equal([...env.timers.values()].some((timer) => timer.ms === STALE_MS), true);
});

test("silence closes the stream", async () => {
	const env = fakeEnv();
	const states = [];
	connect({ url: async () => "u", events: [], onEvent: () => {}, onState: (state) => states.push(state), env });
	await flush();
	env.sources[0].emit("open");
	env.fire(STALE_MS);
	assert.equal(env.sources[0].closed, true);
	assert.equal(states.at(-1), "down");
});

test("a connection that never opens is abandoned", async () => {
	const env = fakeEnv();
	const states = [];
	connect({ url: async () => "u", events: [], onEvent: () => {}, onState: (state) => states.push(state), env });
	await flush();
	env.fire(CONNECT_TIMEOUT_MS);
	assert.equal(env.sources[0].closed, true);
	assert.deepEqual(states, ["down"]);
});

test("polling slows while the stream is open and speeds up when it drops", () => {
	const env = fakeEnv();
	let handlers = null;
	let refreshes = 0;
	const stop = keepFresh(() => refreshes++, { watch: (h) => ((handlers = h), () => {}), env });
	assert.deepEqual(env.intervals(), [5000]);
	assert.equal(refreshes, 0);
	handlers.onState("open");
	assert.deepEqual(env.intervals(), [60000]);
	assert.equal(refreshes, 1);
	handlers.onEvent({});
	assert.equal(refreshes, 2);
	handlers.onState("open");
	assert.equal(refreshes, 2);
	handlers.onState("down");
	assert.deepEqual(env.intervals(), [5000]);
	assert.equal(refreshes, 3);
	stop();
	assert.deepEqual(env.intervals(), []);
});
