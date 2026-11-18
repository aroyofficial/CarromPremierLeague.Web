import assert from "node:assert/strict";
import test from "node:test";

import { alertChoices, feedLinks, forgetFeed, matchCalendarAction, permissionLabel, readSavedFeeds, reconcileSaved, rememberFeed, savedFeed, serviceWorkerUrl, syncStateLabel, unsubscribeSettled, urlBase64ToUint8Array } from "./matchFollow.js";

function memoryStorage(initial = {}) {
	const items = { ...initial };
	return {
		getItem: (key) => (key in items ? items[key] : null),
		setItem: (key, value) => {
			items[key] = String(value);
		},
	};
}

test("a feed link is remembered per season and team and survives a reload", () => {
	const storage = memoryStorage();
	const season = { token: "s3", https_url: "https://api/calendar/feeds/s3.ics", webcal_url: "webcal://api/calendar/feeds/s3.ics" };
	const team = { token: "t9", https_url: "https://api/calendar/feeds/t9.ics", webcal_url: "webcal://api/calendar/feeds/t9.ics" };
	rememberFeed(storage, 3, null, season);
	rememberFeed(storage, 3, 9, team);
	const reloaded = memoryStorage({ "cpl-calendar-feeds": storage.getItem("cpl-calendar-feeds") });
	assert.deepEqual(savedFeed(reloaded, "3", null), season);
	assert.deepEqual(savedFeed(reloaded, 3, 9), team);
	assert.equal(savedFeed(reloaded, 4, null), null);
	forgetFeed(reloaded, 3, null);
	assert.equal(savedFeed(reloaded, 3, null), null);
	assert.deepEqual(savedFeed(reloaded, 3, 9), team);
	assert.deepEqual(readSavedFeeds(memoryStorage({ "cpl-calendar-feeds": "not json" })), {});
});

test("a dropped subscription is settled only when the server has no active row", () => {
	assert.equal(unsubscribeSettled({ response: { status: 404 } }), true);
	assert.equal(unsubscribeSettled({ response: { status: 400 } }), true);
	assert.equal(unsubscribeSettled({ response: { status: 500 } }), false);
	assert.equal(unsubscribeSettled(new Error("network")), false);
});

test("a match on a connected calendar can be removed, and a removed one added back", () => {
	assert.deepEqual(matchCalendarAction({ removed: false, on_calendar: true }), { action: "withdraw", label: "Remove this match" });
	assert.deepEqual(matchCalendarAction({ removed: false, on_calendar: false }), { action: "withdraw", label: "Remove this match" });
	assert.deepEqual(matchCalendarAction({ removed: true, on_calendar: false }), { action: "restore", label: "Add this match back" });
	assert.equal(matchCalendarAction(undefined), null);
});

test("after the worker rotates a subscription the page adopts the new endpoint", () => {
	const saved = { endpoint: "https://push.example/old", p256dh: "a", auth: "b" };
	const rotated = { endpoint: "https://push.example/new", keys: { p256dh: "c", auth: "d" } };
	assert.deepEqual(reconcileSaved(saved, rotated), {
		action: "replace",
		value: { endpoint: "https://push.example/new", p256dh: "c", auth: "d" },
	});
	assert.deepEqual(reconcileSaved(saved, { endpoint: saved.endpoint }), { action: "keep" });
	assert.deepEqual(reconcileSaved(saved, null), { action: "clear" });
	assert.deepEqual(reconcileSaved(null, rotated), { action: "keep" });
});

test("each calendar sync state has a plain label", () => {
	assert.equal(syncStateLabel("syncing"), "Syncing");
	assert.equal(syncStateLabel("update_pending"), "Update pending");
	assert.equal(syncStateLabel("synced"), "Synced");
	assert.equal(syncStateLabel("sync_failed"), "Sync failed. It will retry.");
	assert.equal(syncStateLabel("reauthorization_required"), "Reauthorization required");
	assert.equal(syncStateLabel(undefined), "Connected");
});

test("the service worker is told where the API is", () => {
	assert.equal(serviceWorkerUrl("/", "https://api.example/"), "/sw.js?api=https%3A%2F%2Fapi.example%2F");
	assert.equal(serviceWorkerUrl("/app", ""), "/app/sw.js");
});

test("a calendar subscription has an https link and a webcal link", () => {
	const links = feedLinks("https://api.example/calendar/feeds/abc.ics");
	assert.equal(links.https, "https://api.example/calendar/feeds/abc.ics");
	assert.equal(links.webcal, "webcal://api.example/calendar/feeds/abc.ics");
});

test("alert choices stay on unless the person turns one off", () => {
	assert.equal(alertChoices({}).notify_live, true);
	assert.equal(alertChoices({ notify_live: false }).notify_live, false);
	assert.equal(alertChoices({ notify_reminder: false }).notify_reminder, false);
});

test("the sync-problem alert is on by default and the permission text is plain", () => {
	assert.equal(alertChoices({}).notify_sync_problem, true);
	assert.equal(alertChoices({ notify_sync_problem: false }).notify_sync_problem, false);
	assert.match(permissionLabel("granted"), /allowed/);
	assert.match(permissionLabel("denied"), /blocked/);
	assert.match(permissionLabel("default"), /not been allowed yet/);
	assert.match(permissionLabel("default", false), /cannot show web push/);
});

test("a VAPID public key becomes the bytes the browser expects", () => {
	const bytes = urlBase64ToUint8Array("AQ");
	assert.equal(bytes.length, 1);
	assert.equal(bytes[0], 1);
});
