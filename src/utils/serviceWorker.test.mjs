import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8");

// Runs public/sw.js against a stand-in for the browser's service worker global.
function loadWorker({ windows = [], fetchAnswers = {}, subscribeResult = null, chromium = true } = {}) {
	const listeners = {};
	const shown = [];
	const opened = [];
	const requests = [];
	const self = {
		navigator: chromium ? { userAgentData: { brands: [] } } : {},
		location: { href: "https://league.example/sw.js?api=https%3A%2F%2Fapi.example%2F", origin: "https://league.example" },
		addEventListener: (type, handler) => {
			listeners[type] = handler;
		},
		registration: {
			showNotification: async (title, options) => shown.push({ title, ...options }),
			pushManager: { subscribe: async (options) => ({ options, ...subscribeResult }) },
		},
		clients: {
			matchAll: async () => windows,
			openWindow: async (url) => opened.push(url),
		},
	};
	const fetch = async (url, init = {}) => {
		requests.push({ url, ...init });
		const body = fetchAnswers[url] || {};
		return { json: async () => body };
	};
	vm.runInNewContext(source, { self, URL, fetch, atob, Uint8Array, JSON });
	const dispatch = async (type, event) => {
		let pending;
		listeners[type]({ ...event, waitUntil: (promise) => (pending = promise) });
		await pending;
	};
	return { dispatch, shown, opened, requests };
}

function subscription(endpoint) {
	return { endpoint, toJSON: () => ({ endpoint, keys: { p256dh: "p-key", auth: "a-key" } }) };
}

test("a push shows one notification per match and event, linked to the match", async () => {
	const worker = loadWorker();
	const data = { json: () => ({ title: "Match live", body: "A vs B", tag: "match-12-live", url: "https://league.example/schedule#match-12" }) };
	await worker.dispatch("push", { data });
	assert.equal(worker.shown.length, 1);
	assert.equal(worker.shown[0].tag, "match-12-live");
	assert.equal(worker.shown[0].data.url, "https://league.example/schedule#match-12");
});

test("a push while the schedule page is in front sends an in-page notice and no system alert", async () => {
	const messages = [];
	const front = {
		url: "https://league.example/schedule",
		visibilityState: "visible",
		focused: true,
		postMessage: (message) => messages.push(message),
	};
	const worker = loadWorker({ windows: [front] });
	const data = { json: () => ({ title: "Match live", body: "A vs B", tag: "match-12-live", url: "https://league.example/schedule#match-12" }) };
	await worker.dispatch("push", { data });
	assert.deepEqual(worker.shown, []);
	// The worker runs in its own VM realm, so compare plain copies.
	assert.deepEqual(JSON.parse(JSON.stringify(messages)), [
		{ type: "cpl-push", title: "Match live", body: "A vs B", url: "https://league.example/schedule#match-12" },
	]);
});

test("outside Chromium a push always shows a system alert, even with the page in front", async () => {
	const front = {
		url: "https://league.example/schedule",
		visibilityState: "visible",
		focused: true,
		postMessage: () => assert.fail("Safari needs the system alert, not a silent in-page notice"),
	};
	const worker = loadWorker({ windows: [front], chromium: false });
	await worker.dispatch("push", { data: { json: () => ({ title: "Match live", tag: "match-12-live" }) } });
	assert.equal(worker.shown.length, 1);
	assert.equal(worker.shown[0].tag, "match-12-live");
});

test("a push while the page is hidden or in the background still shows a system alert", async () => {
	const hidden = { url: "https://league.example/", visibilityState: "hidden", focused: false, postMessage: () => assert.fail("no in-page message") };
	const worker = loadWorker({ windows: [hidden] });
	await worker.dispatch("push", { data: { json: () => ({ title: "Match live", tag: "match-12-live" }) } });
	assert.equal(worker.shown.length, 1);
	assert.equal(worker.shown[0].tag, "match-12-live");
});

test("a push with a body that is not JSON still shows a notification", async () => {
	const worker = loadWorker();
	await worker.dispatch("push", { data: { json: () => JSON.parse("not json"), text: () => "plain" } });
	assert.equal(worker.shown[0].body, "plain");
	assert.equal(worker.shown[0].title, "Carrom Premier League");
});

test("clicking an alert reuses an open schedule tab and moves it to the match", async () => {
	const navigated = [];
	const tab = {
		url: "https://league.example/schedule",
		focus: async () => tab,
		navigate: async (url) => navigated.push(url),
	};
	const worker = loadWorker({ windows: [tab] });
	await worker.dispatch("notificationclick", {
		notification: { close: () => undefined, data: { url: "https://league.example/schedule#match-12" } },
	});
	assert.deepEqual(navigated, ["https://league.example/schedule#match-12"]);
	assert.deepEqual(worker.opened, []);
});

test("clicking an alert opens the match when no tab is open", async () => {
	const worker = loadWorker();
	await worker.dispatch("notificationclick", {
		notification: { close: () => undefined, data: { url: "https://league.example/schedule#match-12" } },
	});
	assert.deepEqual(worker.opened, ["https://league.example/schedule#match-12"]);
});

test("a rotated subscription is registered and replaces the old endpoint", async () => {
	const worker = loadWorker();
	await worker.dispatch("pushsubscriptionchange", {
		oldSubscription: subscription("https://push.example/old"),
		newSubscription: subscription("https://push.example/new"),
	});
	assert.equal(worker.requests.length, 1);
	assert.equal(worker.requests[0].url, "https://api.example/notifications/subscriptions");
	const body = JSON.parse(worker.requests[0].body);
	assert.equal(body.endpoint, "https://push.example/new");
	assert.equal(body.replaces_endpoint, "https://push.example/old");
});

test("when the browser gives no new subscription the worker subscribes again with the published key", async () => {
	const worker = loadWorker({
		fetchAnswers: { "https://api.example/notifications/capabilities": { data: { push: { public_key: "AQ" } } } },
		subscribeResult: subscription("https://push.example/fresh"),
	});
	await worker.dispatch("pushsubscriptionchange", { oldSubscription: subscription("https://push.example/old"), newSubscription: null });
	assert.equal(worker.requests.length, 2);
	assert.equal(JSON.parse(worker.requests[1].body).endpoint, "https://push.example/fresh");
});

test("with push turned off on the server the worker does not resubscribe", async () => {
	const worker = loadWorker({
		fetchAnswers: { "https://api.example/notifications/capabilities": { data: { push: { public_key: null } } } },
	});
	await worker.dispatch("pushsubscriptionchange", { oldSubscription: subscription("https://push.example/old"), newSubscription: null });
	assert.equal(worker.requests.length, 1);
});
