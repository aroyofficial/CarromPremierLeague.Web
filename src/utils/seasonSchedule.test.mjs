import assert from "node:assert/strict";
import test from "node:test";

import { scheduleButton } from "./seasonSchedule.js";

test("four upcoming teams with no matches can be scheduled", () => {
	assert.equal(scheduleButton(4, true, 0), "schedule");
});

test("an upcoming season that already has matches is rescheduled", () => {
	assert.equal(scheduleButton(6, true, 2), "reschedule");
	assert.equal(scheduleButton(6, true, 15), "reschedule");
});

test("fewer than four teams or a season that is not upcoming stays hidden", () => {
	assert.equal(scheduleButton(3, true, 0), null);
	assert.equal(scheduleButton(6, false, 0), null);
	assert.equal(scheduleButton(6, false, 15), null);
});
