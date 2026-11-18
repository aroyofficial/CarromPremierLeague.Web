import assert from "node:assert/strict";
import test from "node:test";

import { startBlockedUntilScheduledDay } from "./scheduledStart.js";

test("a match can start on any day while the setting is off", () => {
	assert.equal(
		startBlockedUntilScheduledDay({
			enabled: false,
			scheduledDate: "2026-12-27",
			today: "2026-12-26",
		}),
		false,
	);
});

test("a match starts on its scheduled date and not on another day", () => {
	assert.equal(
		startBlockedUntilScheduledDay({
			enabled: true,
			scheduledDate: "2026-12-27",
			today: "2026-12-27",
		}),
		false,
	);
	assert.equal(
		startBlockedUntilScheduledDay({
			enabled: true,
			scheduledDate: "2026-12-27T00:00:00",
			today: "2026-12-26",
		}),
		true,
	);
	assert.equal(
		startBlockedUntilScheduledDay({
			enabled: true,
			scheduledDate: "2026-12-27",
			today: "2026-12-28",
		}),
		true,
	);
});
