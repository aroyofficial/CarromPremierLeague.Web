import assert from "node:assert/strict";
import test from "node:test";

import { listenForForegroundPush } from "./foregroundPush.js";

function fakeContainer() {
	const listeners = [];
	return {
		addEventListener: (type, handler) => listeners.push({ type, handler }),
		removeEventListener: (type, handler) => {
			const index = listeners.findIndex((item) => item.type === type && item.handler === handler);
			if (index >= 0) listeners.splice(index, 1);
		},
		emit: (data) => listeners.forEach((item) => item.handler({ data })),
		count: () => listeners.length,
	};
}

test("an in-page push notice is shown with its title and body", () => {
	const container = fakeContainer();
	const shown = [];
	listenForForegroundPush(container, (message) => shown.push(message));
	container.emit({ type: "cpl-push", title: "Match live", body: "A vs B" });
	container.emit({ type: "cpl-push", title: "Schedule updated" });
	assert.deepEqual(shown, ["Match live: A vs B", "Schedule updated"]);
});

test("messages that are not in-page push notices are ignored", () => {
	const container = fakeContainer();
	const shown = [];
	listenForForegroundPush(container, (message) => shown.push(message));
	container.emit(null);
	container.emit({ type: "something-else", title: "x" });
	container.emit({ type: "cpl-push", title: 42 });
	assert.deepEqual(shown, []);
});

test("the returned function stops listening", () => {
	const container = fakeContainer();
	const shown = [];
	const stop = listenForForegroundPush(container, (message) => shown.push(message));
	stop();
	assert.equal(container.count(), 0);
	container.emit({ type: "cpl-push", title: "Match live" });
	assert.deepEqual(shown, []);
});

test("without a service worker container nothing is attached and nothing throws", () => {
	const stop = listenForForegroundPush(undefined, () => assert.fail("no message expected"));
	assert.equal(typeof stop, "function");
	stop();
});
