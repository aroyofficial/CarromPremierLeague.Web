import test from "node:test";
import assert from "node:assert/strict";
import { matchSummary, overviewTasks, seasonPhase } from "./overview.js";

const today = "2026-11-18";
const all = { seasonTeams: true, schedule: true, rosters: true, runMatches: true, publishGallery: true, viewAdmins: true };
const none = Object.fromEntries(Object.keys(all).map((key) => [key, false]));
const match = (id, status, date, extra = {}) => ({ id, status, scheduled_date: date, order: id, category: 1, ...extra });

test("the season stage comes from its dates", () => {
	assert.equal(seasonPhase({ start_date: "2026-11-20", end_date: "2026-12-20" }, today).key, "upcoming");
	assert.equal(seasonPhase({ start_date: "2026-11-20", end_date: "2026-12-20" }, today).detail, "Starts in 2 days");
	assert.equal(seasonPhase({ start_date: "2026-11-01", end_date: "2026-12-20" }, today).key, "running");
	assert.equal(seasonPhase({ start_date: "2026-10-01", end_date: "2026-11-01" }, today).key, "finished");
	assert.equal(seasonPhase(null, today).key, "none");
});

test("the match day lists today's matches and the next match date", () => {
	const summary = matchSummary(
		[match(1, 3, "2026-11-17"), match(2, 2, today), match(3, 1, today), match(4, 1, "2026-11-21"), match(5, 1, "2026-11-21"), match(6, 1, "2026-11-25")],
		today,
	);
	assert.equal(summary.total, 6);
	assert.equal(summary.played, 1);
	assert.deepEqual(summary.today.map((item) => item.id), [2, 3]);
	assert.equal(summary.live.length, 1);
	assert.equal(summary.nextDate, "2026-11-21");
	assert.equal(summary.nextCount, 2);
});

const busy = {
	season: { name: "Season 4" },
	phase: { key: "upcoming" },
	seasonTeams: [{ team_id: 1 }, { team_id: 2 }],
	rosters: [{ team_id: 1 }, { team_id: 1 }, { team_id: 2 }],
	matches: [match(1, 2, today), match(2, 1, "2026-11-10")],
	drafts: { count: 3, more: false },
	admins: [{ is_active: true, must_change_password: true }, { is_active: false, must_change_password: true }],
	today,
};

test("an admin with every permission sees every waiting task", () => {
	const ids = overviewTasks({ ...busy, can: all }).map((task) => task.id);
	assert.deepEqual(ids, ["season-teams", "roster-places", "matches-live", "matches-overdue", "gallery-drafts", "admins-first-sign-in"]);
});

test("an admin without permissions sees no tasks", () => {
	assert.deepEqual(overviewTasks({ ...busy, can: none }), []);
});

test("each task needs its own permission", () => {
	const only = (key) => overviewTasks({ ...busy, can: { ...none, [key]: true } }).map((task) => task.id);
	assert.deepEqual(only("rosters"), ["roster-places"]);
	assert.deepEqual(only("publishGallery"), ["gallery-drafts"]);
	assert.deepEqual(only("viewAdmins"), ["admins-first-sign-in"]);
	assert.deepEqual(only("runMatches"), ["matches-live", "matches-overdue"]);
});

test("a full upcoming season with no league matches asks for the schedule", () => {
	const teams = [1, 2, 3, 4].map((team_id) => ({ team_id }));
	const tasks = overviewTasks({ ...busy, seasonTeams: teams, rosters: [], matches: [], can: { ...none, schedule: true, seasonTeams: true } });
	assert.deepEqual(tasks.map((task) => task.id), ["season-schedule"]);
});
