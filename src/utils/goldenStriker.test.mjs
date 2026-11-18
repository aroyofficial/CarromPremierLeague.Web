import test from "node:test";
import assert from "node:assert/strict";
import { NO_MATCH_SCHEDULED, showGoldenStriker, strikerEmptyMessage } from "./goldenStriker.js";

test("the golden striker stays hidden until a match is played", () => {
	assert.equal(showGoldenStriker({ matchesPlayed: 0, players: [] }), false);
	assert.equal(showGoldenStriker({ matchesPlayed: 0, players: [{ player_id: 1 }] }), false);
	assert.equal(strikerEmptyMessage("No match has been played in this season.", { matchesPlayed: 0, players: [] }), "No match has been played in this season.");
	assert.equal(strikerEmptyMessage("old message", { matchesPlayed: 0, players: [] }), NO_MATCH_SCHEDULED);
});

test("a played match with a scorecard shows the golden striker", () => {
	assert.equal(showGoldenStriker({ matchesPlayed: 1, players: [{ player_id: 1 }] }), true);
	assert.equal(showGoldenStriker({ matchesPlayed: 1, players: [] }), false);
	assert.equal(showGoldenStriker({ matchesPlayed: null, players: [{ player_id: 1 }] }), true);
});
