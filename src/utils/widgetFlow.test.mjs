import assert from "node:assert/strict";
import test from "node:test";
import {
	POINTS_TABLE_SEC,
	ROTATION_CARD_MAP,
	TRANSITION_STYLES,
	cloneFlowConfig,
	computeClockOffset,
	defaultFlowConfig,
	formatMatchClock,
	insertStepAt,
	minSecForKind,
	moveStep,
	resolveActiveScene,
	trackClockOffset,
} from "./widgetFlow.js";

const baseSeasonFlow = (overrides = {}) => ({
	type: "season_flow",
	server_now: "2026-11-21T12:00:00Z",
	season: { id: 3, name: "Season 3" },
	clock: { regulation_minutes: 15, extra_minutes: 5 },
	flow: defaultFlowConfig(),
	matches: [{ id: 1, order: 1, status: 1, toss_outcome: 3 }],
	active_match: null,
	last_completed_match: null,
	next_scheduled_match: {
		match: { id: 2, order: 2, status: 1, toss_outcome: 3, team1: { id: 1, name: "Alpha" }, team2: { id: 2, name: "Beta" } },
		rosters: { team1: [], team2: [] },
		players: { team1: [], team2: [] },
	},
	points_table: { standings: [{ team_id: 1, team_name: "Alpha", points: 2 }] },
	top_stats: { matches_played: 1, players: [{ player_id: 10, name: "Ravi Kumar", net_coins: 6 }] },
	...overrides,
});

test("live match takes priority over break rotation and shows the lower-third scorebug", () => {
	const snap = baseSeasonFlow({
		active_match: {
			match: { id: 1, order: 1, status: 2, toss_outcome: 1, started_at: "2026-11-21T11:55:00Z" },
			players: { team1: [], team2: [] },
		},
	});
	const resolved = resolveActiveScene(snap, Date.parse("2026-11-21T12:00:00Z"));
	assert.equal(resolved.scene, "live_bar");
	assert.equal(resolved.layout, "lower_third");
	assert.equal(resolved.source, "match_live");
});

test("toss decided on a scheduled match precedes ready card", () => {
	const readyOnly = baseSeasonFlow({
		active_match: {
			match: { id: 1, order: 1, status: 1, toss_outcome: 3, ready_at: "2026-11-21T11:58:00Z" },
			rosters: { team1: [], team2: [] },
		},
	});
	assert.equal(resolveActiveScene(readyOnly, Date.parse("2026-11-21T12:00:00Z")).scene, "match_ready");

	const tossed = baseSeasonFlow({
		active_match: {
			match: { id: 1, order: 1, status: 1, toss_outcome: 2, ready_at: "2026-11-21T11:58:00Z" },
			rosters: { team1: [], team2: [] },
		},
	});
	const res = resolveActiveScene(tossed, Date.parse("2026-11-21T12:00:00Z"));
	assert.equal(res.scene, "toss");
	assert.equal(res.layout, "lower_third");
});

test("post-match result holds for result_duration_sec then steps through drag-and-drop rotation", () => {
	const completedIso = "2026-11-21T12:00:00Z";
	const snap = baseSeasonFlow({
		last_completed_match: {
			match: { id: 1, order: 1, status: 3, outcome: 1, net_points: 4, completed_at: completedIso },
			players: { team1: [], team2: [] },
		},
	});
	// Default: 20s result hold -> 30s points_table -> 15s stats -> 15s fixtures (60s loop)
	const at10s = resolveActiveScene(snap, Date.parse("2026-11-21T12:00:10Z"));
	assert.equal(at10s.scene, "match_result");
	assert.equal(at10s.source, "post_match");
	assert.equal(at10s.remainingSec, 10);

	const at25s = resolveActiveScene(snap, Date.parse("2026-11-21T12:00:25Z"));
	assert.equal(at25s.scene, "points_table");
	assert.equal(at25s.remainingSec, 25);

	// The standings card is still up 49 seconds in, then stats takes over.
	const at49s = resolveActiveScene(snap, Date.parse("2026-11-21T12:00:49Z"));
	assert.equal(at49s.scene, "points_table");

	const at55s = resolveActiveScene(snap, Date.parse("2026-11-21T12:00:55Z"));
	assert.equal(at55s.scene, "stats");

	const at70s = resolveActiveScene(snap, Date.parse("2026-11-21T12:01:10Z"));
	assert.equal(at70s.scene, "fixtures");

	// Wraps back around to points_table in loop mode (20 + 60 + 3 = 83s).
	const at83s = resolveActiveScene(snap, Date.parse("2026-11-21T12:01:23Z"));
	assert.equal(at83s.scene, "points_table");
});

test("the points table always stays up for 30 seconds, even in a flow saved with a shorter time", () => {
	assert.equal(POINTS_TABLE_SEC, 30);
	assert.equal(minSecForKind("points_table"), 30);
	assert.equal(minSecForKind("stats"), 5);
	assert.equal(defaultFlowConfig().rotation[0].duration_sec, 30);
	assert.equal(ROTATION_CARD_MAP.points_table.defaultSec, 30);
	assert.equal(insertStepAt([], "points_table")[0].duration_sec, 30);

	const saved = cloneFlowConfig({
		rotation: [
			{ id: "p", kind: "points_table", duration_sec: 20, enabled: true },
			{ id: "s", kind: "stats", duration_sec: 8, enabled: true },
		],
	});
	assert.equal(saved.rotation[0].duration_sec, 30);
	assert.equal(saved.rotation[1].duration_sec, 8);

	const snap = baseSeasonFlow({ flow: { rotation: [{ id: "p", kind: "points_table", duration_sec: 20, enabled: true }, { id: "s", kind: "stats", duration_sec: 15, enabled: true }] } });
	const at29s = resolveActiveScene(snap, 29_000);
	assert.equal(at29s.scene, "points_table");
	assert.equal(at29s.remainingSec, 1);
	assert.equal(resolveActiveScene(snap, 31_000).scene, "stats");
});

test("a flow reveals its scenes by default and keeps the page flip when it is chosen", () => {
	assert.equal(defaultFlowConfig().transition_style, "reveal");
	assert.equal(cloneFlowConfig(null).transition_style, "reveal");
	assert.equal(cloneFlowConfig({ transition_style: "flip" }).transition_style, "flip");
	assert.equal(cloneFlowConfig({ transition_style: "spin" }).transition_style, "reveal");
	assert.deepEqual(TRANSITION_STYLES.map((style) => style.value), ["reveal", "flip"]);
});

test("once_then_clean plays the rotation once after a match and then leaves a clean camera feed", () => {
	const flow = defaultFlowConfig();
	flow.idle_mode = "once_then_clean";
	const snap = baseSeasonFlow({
		flow,
		last_completed_match: {
			match: { id: 1, order: 1, status: 3, outcome: 1, completed_at: "2026-11-21T12:00:00Z" },
			players: { team1: [], team2: [] },
		},
	});
	assert.equal(resolveActiveScene(snap, Date.parse("2026-11-21T12:00:30Z")).scene, "points_table");
	// 20s hold + 60s rotation = 80s -> at 85s it goes clean.
	const afterCycle = resolveActiveScene(snap, Date.parse("2026-11-21T12:01:25Z"));
	assert.equal(afterCycle.scene, "clean");
	assert.equal(afterCycle.source, "idle_clean");
});

test("empty stats before Match 1 is skipped automatically in rotation", () => {
	const flow = defaultFlowConfig();
	flow.rotation = [
		{ id: "s1", kind: "stats", duration_sec: 15, enabled: true },
		{ id: "s2", kind: "fixtures", duration_sec: 15, enabled: true },
	];
	const snap = baseSeasonFlow({
		flow,
		top_stats: { matches_played: 0, players: [] },
	});
	const resolved = resolveActiveScene(snap, Date.parse("2026-11-21T12:00:05Z"));
	assert.equal(resolved.scene, "fixtures");
});

test("director pin overrides active play and reverts automatically once until_utc passes", () => {
	const flow = defaultFlowConfig();
	flow.director = { mode: "pin", card: "points_table", match_id: null, until_utc: "2026-11-21T12:00:20Z" };
	const snap = baseSeasonFlow({
		flow,
		active_match: { match: { id: 1, order: 1, status: 2, toss_outcome: 1, started_at: "2026-11-21T11:58:00Z" } },
	});
	const duringPin = resolveActiveScene(snap, Date.parse("2026-11-21T12:00:10Z"));
	assert.equal(duringPin.scene, "points_table");
	assert.equal(duringPin.source, "director");
	assert.equal(duringPin.remainingSec, 10);

	const afterExpiry = resolveActiveScene(snap, Date.parse("2026-11-21T12:00:21Z"));
	assert.equal(afterExpiry.scene, "live_bar");
	assert.equal(afterExpiry.source, "match_live");
});

test("synced match clock handles regulation, extra time, zero floor, Golden Strike, and clock skew", () => {
	const offset = computeClockOffset("2026-11-21T12:00:10Z", Date.parse("2026-11-21T12:00:00Z"));
	assert.equal(offset, 10_000);

	const reg = formatMatchClock(
		{ status: 2, category: 1, started_at: "2026-11-21T12:00:00Z" },
		{ regulation_minutes: 15, extra_minutes: 5 },
		Date.parse("2026-11-21T12:05:30Z"),
	);
	assert.equal(reg.timer, "05:30");
	assert.equal(reg.phase, "regulation");

	// A fraction of a second does not tick early: 5:30.900 still reads 05:30, the same as the scorer's clock.
	const midSecond = formatMatchClock(
		{ status: 2, category: 1, started_at: "2026-11-21T12:00:00Z" },
		{ regulation_minutes: 15 },
		Date.parse("2026-11-21T12:05:30.900Z"),
	);
	assert.equal(midSecond.timer, "05:30");

	// Naive server timestamps are UTC. Five and a half hours of local offset must not move the clock.
	const naive = formatMatchClock(
		{ status: 2, category: 1, started_at: "2026-11-21T12:00:00" },
		{ regulation_minutes: 15 },
		Date.parse("2026-11-21T12:05:30Z"),
	);
	assert.equal(naive.timer, "05:30");

	const fullTime = formatMatchClock(
		{ status: 2, category: 1, started_at: "2026-11-21T12:00:00Z" },
		{ regulation_minutes: 15 },
		Date.parse("2026-11-21T12:20:00Z"),
	);
	assert.equal(fullTime.timer, "15:00");
	assert.equal(fullTime.phase, "time_up");

	const extra = formatMatchClock(
		{ status: 2, category: 2, started_at: "2026-11-21T12:00:00Z", extra_started_at: "2026-11-21T12:15:00Z" },
		{ regulation_minutes: 15, extra_minutes: 5 },
		Date.parse("2026-11-21T12:19:20Z"),
	);
	assert.equal(extra.timer, "04:20");
	assert.equal(extra.phase, "extra");
	assert.equal(extra.urgent, true);

	// A slow refresh arrives with a staler server_now. The clock keeps the best recent sample instead of jumping back.
	let tracked = trackClockOffset([], -120, 1_000_000);
	tracked = trackClockOffset(tracked.samples, -900, 1_005_000);
	assert.equal(tracked.offset, -120);
	tracked = trackClockOffset(tracked.samples, -80, 1_010_000);
	assert.equal(tracked.offset, -80);
	// Old samples age out, so a real change in the server clock is picked up within the window.
	tracked = trackClockOffset(tracked.samples, -400, 1_010_000 + 10 * 60_000);
	assert.equal(tracked.offset, -400);

	const gs = formatMatchClock({ status: 2, category: 7 }, { regulation_minutes: 15 }, Date.now());
	assert.equal(gs.phase, "golden_strike");
	assert.equal(gs.timer, "GS");
});

test("drag-and-drop helpers reorder and insert steps cleanly", () => {
	const initial = [
		{ id: "a", kind: "points_table", duration_sec: 20, enabled: true },
		{ id: "b", kind: "stats", duration_sec: 15, enabled: true },
		{ id: "c", kind: "fixtures", duration_sec: 15, enabled: true },
	];
	const moved = moveStep(initial, 2, 0);
	assert.deepEqual(moved.map((s) => s.id), ["c", "a", "b"]);

	const inserted = insertStepAt(moved, "clean_pause", 1);
	assert.equal(inserted.length, 4);
	assert.equal(inserted[1].kind, "clean_pause");
	assert.equal(inserted[1].duration_sec, 10);
});
