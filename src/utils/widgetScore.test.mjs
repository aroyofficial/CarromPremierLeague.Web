import assert from "node:assert/strict";
import test from "node:test";
import { awaitsCompletion, fixtureWindow, isConcluded, resultLine, scorecardTotals, statusLabel, tossLine, matchLabel } from "./widgetScore.js";

const team1 = { id: 1, name: "Alpha", logo_url: null };
const team2 = { id: 2, name: "Beta", logo_url: null };

test("scorecard totals match the public schedule rule", () => {
	const totals = scorecardTotals({
		team1: [{ coins_pocketed: 5, opponent_coins_pocketed: 1, single_fines: 1, double_fines: 0, strikers_pocketed: 0 }],
		team2: [{ coins_pocketed: 3, opponent_coins_pocketed: 2, single_fines: 0, double_fines: 1, strikers_pocketed: 1 }],
	});
	// team1: 5 - 1 fine + team2's 2 opponent coins = 6
	// team2: 3 - 2 fine (double fine = 2 coins) + team1's 1 opponent coin = 2
	assert.deepEqual(totals, { team1: 6, team2: 2 });
});

test("a fine never takes a team below zero", () => {
	const totals = scorecardTotals({
		team1: [{ coins_pocketed: 0, single_fines: 3 }],
		team2: [],
	});
	assert.equal(totals.team1, 0);
});

test("a fine falls back to coins_fined when the split is empty", () => {
	const totals = scorecardTotals({
		team1: [{ coins_pocketed: 4, coins_fined: 2 }],
		team2: [],
	});
	assert.equal(totals.team1, 2);
});

test("status labels follow the match status", () => {
	assert.equal(statusLabel({ status: 2 }), "Live");
	assert.equal(statusLabel({ status: 3 }), "Final");
	assert.equal(statusLabel({ status: 1 }), "Upcoming");
});

test("toss line names the winner or waits", () => {
	assert.equal(tossLine({ toss_outcome: 1, team1 }), "Alpha won the toss");
	assert.equal(tossLine({ toss_outcome: 2, team2 }), "Beta won the toss");
	assert.equal(tossLine({ toss_outcome: 3, team1, team2 }), "Toss not decided yet");
});

test("result line names the winner and the margin", () => {
	assert.equal(resultLine({ status: 3, outcome: 2, team2, net_points: 4 }), "Beta won by 4 coins");
	assert.equal(resultLine({ status: 3, outcome: 3, team1, team2 }), "Tied · no winner decided");
	assert.equal(resultLine({ status: 3, outcome: 3, category: 1, team1, team2 }), "Match tied");
	assert.equal(resultLine({ status: 3, outcome: 3, category: 2, tied: true, team1, team2 }), "Tied · no winner decided");
	assert.equal(resultLine({ status: 1, outcome: 3, team1, team2 }), "");
});

test("a finished match awaits completion until concluded_at is set", () => {
	assert.equal(awaitsCompletion({ status: 3, concluded_at: null }), true);
	assert.equal(awaitsCompletion({ status: 3, concluded_at: "2026-11-21T12:00:00Z" }), false);
	// An API that does not report the field never holds a result.
	assert.equal(awaitsCompletion({ status: 3 }), false);
	assert.equal(awaitsCompletion({ status: 2, concluded_at: null }), false);
	assert.equal(isConcluded({ status: 3, concluded_at: "2026-11-21T12:00:00Z" }), true);
	assert.equal(isConcluded({ status: 3, concluded_at: null }), false);
});

test("league matches are labelled by number only", () => {
	assert.equal(matchLabel({ category: 1, order: 7 }), "Match 7");
	assert.equal(matchLabel({ category: 3, order: 2 }), "Eliminator · Match 2");
});

test("fixture window keeps the next open match in view", () => {
	const matches = Array.from({ length: 30 }, (_, index) => ({ id: index + 1, status: index < 20 ? 3 : 1 }));
	const window = fixtureWindow(matches, 12);
	assert.equal(window.length, 12);
	assert.ok(window.some((match) => match.status === 1), "an upcoming match is visible");
});

test("short fixture lists are returned whole", () => {
	const matches = [{ id: 1, status: 1 }, { id: 2, status: 1 }];
	assert.equal(fixtureWindow(matches, 12), matches);
});
