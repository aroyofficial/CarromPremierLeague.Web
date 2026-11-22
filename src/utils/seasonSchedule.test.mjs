import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_ROUNDS, MAX_ROUNDS, clampRounds, leagueMatchCount, roundsWords, scheduleButton } from "./seasonSchedule.js";

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

test("each pair meets once unless the admin asks for more", () => {
	assert.equal(DEFAULT_ROUNDS, 1);
	assert.equal(clampRounds(undefined), 1);
	assert.equal(clampRounds(null), 1);
	assert.equal(clampRounds(""), 1);
	assert.equal(clampRounds("abc"), 1);
});

test("the number of meetings is a whole number the API accepts", () => {
	assert.equal(clampRounds(0), 1);
	assert.equal(clampRounds(-3), 1);
	assert.equal(clampRounds(2), 2);
	assert.equal(clampRounds("3"), 3);
	assert.equal(clampRounds(2.9), 2);
	assert.equal(clampRounds(99), MAX_ROUNDS);
});

test("the dialog counts the league matches for every pair of teams", () => {
	assert.equal(leagueMatchCount(6), 15);
	assert.equal(leagueMatchCount(6, 1), 15);
	assert.equal(leagueMatchCount(6, 2), 30);
	assert.equal(leagueMatchCount(4, 3), 18);
	assert.equal(leagueMatchCount(6, 99), 15 * MAX_ROUNDS);
	assert.equal(leagueMatchCount(0, 2), 0);
	assert.equal(leagueMatchCount(1, 2), 0);
	assert.equal(leagueMatchCount(undefined, 2), 0);
});

test("the number of meetings reads in plain words", () => {
	assert.equal(roundsWords(1), "once");
	assert.equal(roundsWords(2), "twice");
	assert.equal(roundsWords(3), "3 times");
	assert.equal(roundsWords(0), "once");
});
