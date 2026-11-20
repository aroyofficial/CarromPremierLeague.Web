import test from "node:test";
import assert from "node:assert/strict";
import { championFromTable, championSeenKey, countdownSeason, currentShownSeason } from "./champion.js";

const standing = (team_id, team_name) => ({ team_id, team_name });

test("the current season is the newest one the site is showing", () => {
	const season = currentShownSeason([
		{ id: 4, name: "Season 4", show: false },
		{ id: 3, name: "Season 3", show: true },
		{ id: 2, name: "Season 2", show: true },
	]);
	assert.equal(season.id, 3);
	assert.equal(currentShownSeason([{ id: 1, show: false }]), null);
});

test("a champion exists only when the season is finished and the Final has a winner", () => {
	const standings = [standing(8, "Strikers"), standing(2, "Kings")];
	assert.equal(championFromTable({ season_status: 2, winner_id: 8, standings }), null);
	assert.equal(championFromTable({ season_status: 3, winner_id: null, standings }), null);
	assert.deepEqual(championFromTable({ season_status: 3, winner_id: 8, standings }), {
		teamId: 8,
		teamName: "Strikers",
	});
});

test("a finished season does not count down when no other visible season is coming", () => {
	const finished = { id: 3, name: "Season 3", show: true, start_date: "2099-01-01" };
	const hidden = { id: 4, name: "Season 4", show: false, start_date: "2099-06-01" };
	assert.equal(countdownSeason([finished], true), null);
	assert.equal(countdownSeason([hidden, finished], true), null);
	assert.equal(countdownSeason([finished], false).id, 3);
});

test("another visible season still counts down when the current one is finished", () => {
	const finished = { id: 4, name: "Season 4", show: true, start_date: "2099-01-01" };
	const coming = { id: 3, name: "Season 3", show: true, start_date: "2099-06-01" };
	assert.equal(countdownSeason([finished, coming], true).id, 3);
});

test("the dismissal is remembered per season and champion", () => {
	assert.equal(championSeenKey(3, 8), "cpl-champion:3:8");
	assert.notEqual(championSeenKey(3, 8), championSeenKey(2, 8));
});
