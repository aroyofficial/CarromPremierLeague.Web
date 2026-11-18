import assert from "node:assert/strict";
import test from "node:test";

import { alertChoices, feedLinks, reconcileSaved, serviceWorkerUrl, syncStateLabel, urlBase64ToUint8Array } from "./matchFollow.js";

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

test("a VAPID public key becomes the bytes the browser expects", () => {
	const bytes = urlBase64ToUint8Array("AQ");
	assert.equal(bytes.length, 1);
	assert.equal(bytes[0], 1);
});
