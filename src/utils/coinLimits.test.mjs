import test from "node:test";
import assert from "node:assert/strict";

import { bothTeamsReachedNine, coinBounds, isKnockoutCategoryId, teamScore } from "./coinLimits.js";

const row = (id, teamId, own, opponent = 0, single = 0, double = 0) => ({ id, teamId, own, opponent, single, double });

test("knockout categories are the final, eliminator and both qualifiers", () => {
	for (const id of [2, 3, 4, 5]) assert.equal(isKnockoutCategoryId(id), true, String(id));
	for (const id of [1, 6, 7, null]) assert.equal(isKnockoutCategoryId(id), false, String(id));
});

test("both teams on 9 is detected", () => {
	const rows = [row("a", 1, 9), row("b", 2, 9)];
	assert.equal(bothTeamsReachedNine(rows, [1, 2]), true);
	assert.equal(bothTeamsReachedNine([row("a", 1, 9), row("b", 2, 8)], [1, 2]), false);
	assert.equal(bothTeamsReachedNine([row("a", 1, 9)], [1]), false);
});

test("in a knockout match the second colour stops at 8 once the first is on 9", () => {
	const rows = [row("a", 1, 9), row("b", 2, 8)];
	const second = row("b", 2, 8);
	assert.equal(coinBounds(rows, second).ownMax, 9, "a league match still allows 9");
	assert.equal(coinBounds(rows, second, { knockout: true }).ownMax, 8);
	assert.equal(coinBounds(rows, row("a", 1, 9), { knockout: true }).ownMax, 9, "the colour already on 9 keeps its coins");
});

test("coins one team takes of the other colour also count toward the knockout cap", () => {
	// Team 1 is on 9 and team 2 on 8. Team 1 taking team 2's last coin would put team 2 on 9 as well.
	const rows = [row("a", 1, 9), row("b", 2, 8)];
	assert.equal(coinBounds(rows, rows[0]).opponentMax, 1, "a league match allows it");
	assert.equal(coinBounds(rows, rows[0], { knockout: true }).opponentMax, 0);
	// With team 1 on 5 that same coin is fine: only team 2 would be on 9.
	const rows2 = [row("a", 1, 5), row("b", 2, 8)];
	assert.equal(coinBounds(rows2, rows2[0], { knockout: true }).opponentMax, 1);
});

test("a knockout scorecard cannot be walked to 9-9 one counter at a time", () => {
	let rows = [row("a", 1, 8), row("b", 2, 8)];
	// Team 1 reaches 9.
	const a = coinBounds(rows, rows[0], { knockout: true });
	assert.equal(a.ownMax, 9);
	rows = [row("a", 1, 9), row("b", 2, 8)];
	assert.equal(teamScore(rows, 1), 9);
	// Team 2 can no longer rise to 9 by its own coins or by team 1 pocketing its coin.
	assert.equal(coinBounds(rows, rows[1], { knockout: true }).ownMax, 8);
	assert.equal(coinBounds(rows, rows[0], { knockout: true }).opponentMax, 0);
});
