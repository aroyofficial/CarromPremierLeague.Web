import assert from "node:assert/strict";
import test from "node:test";

import { tossFrameState, tossPlan } from "./tossSpin.js";

test("a toss lasts between five and eight seconds and names one winner", () => {
	for (let index = 0; index < 20; index += 1) {
		const plan = tossPlan();
		assert.ok(plan.duration >= 5000 && plan.duration <= 8000);
		assert.ok(plan.winner === 1 || plan.winner === 2);
	}
});

test("the coin lands on the winner's face", () => {
	const team1 = tossPlan(() => 0.1);
	const team2 = tossPlan(() => 0.9);
	assert.equal(team1.winner, 1);
	assert.equal(team2.winner, 2);
	assert.equal(tossFrameState(team1, team1.duration).angle % 360, 0);
	assert.equal(tossFrameState(team2, team2.duration).angle % 360, 180);
	assert.equal(tossFrameState(team1, team1.duration).done, true);
	assert.equal(tossFrameState(team1, 0).done, false);
});
