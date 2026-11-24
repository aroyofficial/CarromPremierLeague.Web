import { SeasonStatus } from "./constants.js";
import { parseServerTime } from "./integrations.js";
import { awaitsCompletion, hasToss, isLive, isReady } from "./widgetScore.js";

/** The standings card stays up long enough to read every row, and it plays the league music while it does. */
export const POINTS_TABLE_SEC = 30;

/** The bracket card stays up long enough to follow every path to the final. */
export const BRACKET_SEC = 20;
/** The tie-breaker card: each tied pair with the breaker that separated it, and any Golden Strike still to play. */
export const TIE_BREAKER_SEC = 20;
/** The champions card with the fireworks: long enough to enjoy the celebration. */
export const CHAMPION_SEC = 45;
/** The Golden Striker card's usual time, used when a flow saved without it has to show it for the champion story. */
const STATS_SEC = 15;

/**
 * Which bed the broadcast loops. "champion" is the celebration track: the champions card, and the points table once
 * the season is finished and has a winner. "standings" is the usual table music before that. Anything else is silent.
 */
export const broadcastMusic = (scene, snapshot) => {
	if (scene === "champion") return "champion";
	if (scene !== "points_table") return null;
	const table = snapshot?.points_table;
	const finished = table?.season_status === SeasonStatus.FINISHED;
	const hasWinner = table?.winner_id != null || Boolean(table?.winner_name);
	return finished && hasWinner ? "champion" : "standings";
};

export const TRANSITION_STYLES = Object.freeze([
	{ value: "reveal", label: "Reveal wipe", hint: "A soft-edged wipe reveals each card and wipes it away." },
	{ value: "flip", label: "Corner page flip", hint: "Each card unfolds from its corner like a turning page." },
]);

/** Shortest time a card may stay on screen. */
export const minSecForKind = (kind) => (kind === "points_table" ? POINTS_TABLE_SEC : 5);

export const ROTATION_CARDS = Object.freeze([
	{
		kind: "points_table",
		label: "Points Table",
		shortLabel: "Points",
		defaultSec: POINTS_TABLE_SEC,
		hint: "League standings with matches, wins, net coins, and points. Stays 30s with the league music.",
	},
	{
		kind: "stats",
		label: "Golden Striker & Stats",
		shortLabel: "Top Stats",
		defaultSec: 15,
		hint: "Top coin potters leaderboard with net coins and strikers.",
	},
	{
		kind: "bracket",
		label: "Knockout Bracket",
		shortLabel: "Bracket",
		defaultSec: BRACKET_SEC,
		hint: "The road to the final: who has qualified and who is still TBD. Appears once a team qualifies.",
	},
	{
		kind: "fixtures",
		label: "Fixtures & Results",
		shortLabel: "Fixtures",
		defaultSec: 15,
		hint: "Recent match results and upcoming fixtures in order.",
	},
	{
		kind: "last_result",
		label: "Last Match Result",
		shortLabel: "Last Result",
		defaultSec: 15,
		hint: "Full-time scorecard summary of the most recently finished match.",
	},
	{
		kind: "next_match",
		label: "Up Next Matchup",
		shortLabel: "Up Next",
		defaultSec: 15,
		hint: "Preview card for the next scheduled match with rosters and H2H.",
	},
	{
		kind: "clean_pause",
		label: "Clean Camera Pause",
		shortLabel: "Clean Pause",
		defaultSec: 10,
		hint: "Hides overlays for a few seconds so the raw camera view breathes.",
	},
]);

export const ROTATION_CARD_MAP = Object.freeze(Object.fromEntries(ROTATION_CARDS.map((card) => [card.kind, card])));

export const DIRECTOR_PIN_CARDS = Object.freeze([
	{ card: "points_table", label: "Points Table" },
	{ card: "stats", label: "Top Stats" },
	{ card: "bracket", label: "Knockout Bracket" },
	{ card: "fixtures", label: "Fixtures" },
	{ card: "match_result", label: "Last Result" },
	{ card: "next_match", label: "Up Next" },
	{ card: "live", label: "Live Scorebug" },
	{ card: "toss", label: "Toss Banner" },
	{ card: "scorecard", label: "Full Scorecard" },
]);

// The scenes an admin can force on a season-flow preview to inspect each card's exact framing.
export const PREVIEW_SCENES = Object.freeze([
	{ value: "auto", label: "Auto Live" },
	{ value: "live_bar", label: "Live Bar" },
	{ value: "match_ready", label: "Ready" },
	{ value: "toss", label: "Toss" },
	{ value: "match_result", label: "Result" },
	{ value: "points_table", label: "Points" },
	{ value: "stats", label: "Stats" },
	{ value: "bracket", label: "Bracket" },
	{ value: "champion", label: "Champion" },
	{ value: "fixtures", label: "Fixtures" },
]);

let stepCounter = 0;
export const makeStepId = (kind = "step") => {
	stepCounter = (stepCounter + 1) % 100000;
	return `${kind}-${Date.now().toString(36)}-${stepCounter}`;
};

export const defaultFlowConfig = () => ({
	idle_mode: "loop",
	theme_accent: "gold",
	transition_style: "reveal",
	match_stages: {
		show_ready: true,
		show_toss: true,
		show_live: true,
		show_clock: true,
		show_player_strip: true,
		result_duration_sec: 20,
	},
	rotation: [
		{ id: "step-points", kind: "points_table", duration_sec: POINTS_TABLE_SEC, enabled: true },
		{ id: "step-stats", kind: "stats", duration_sec: 15, enabled: true },
		{ id: "step-bracket", kind: "bracket", duration_sec: BRACKET_SEC, enabled: true },
		{ id: "step-fixtures", kind: "fixtures", duration_sec: 15, enabled: true },
	],
	director: { mode: "auto", card: null, match_id: null, until_utc: null },
});

export const FLOW_PRESETS = Object.freeze([
	{
		id: "full_tv",
		label: "Full Tournament TV",
		description: "Ready -> Toss -> Live bar -> Result until marked complete -> loops Points, Stats, Bracket, Fixtures & Up Next.",
		build: () => ({
			...defaultFlowConfig(),
			idle_mode: "loop",
			rotation: [
				{ id: makeStepId("points"), kind: "points_table", duration_sec: POINTS_TABLE_SEC, enabled: true },
				{ id: makeStepId("stats"), kind: "stats", duration_sec: 15, enabled: true },
				{ id: makeStepId("bracket"), kind: "bracket", duration_sec: BRACKET_SEC, enabled: true },
				{ id: makeStepId("fixtures"), kind: "fixtures", duration_sec: 15, enabled: true },
				{ id: makeStepId("next"), kind: "next_match", duration_sec: 12, enabled: true },
			],
		}),
	},
	{
		id: "post_match_burst",
		label: "Clean Board Between Breaks",
		description: "Shows Result -> Points -> Stats once after each match, then keeps the camera clean until Ready.",
		build: () => ({
			...defaultFlowConfig(),
			idle_mode: "once_then_clean",
			rotation: [
				{ id: makeStepId("points"), kind: "points_table", duration_sec: POINTS_TABLE_SEC, enabled: true },
				{ id: makeStepId("stats"), kind: "stats", duration_sec: 15, enabled: true },
			],
		}),
	},
	{
		id: "intermission_loop",
		label: "Intermission Slate Loop",
		description: "Cycles Standings, Stats, Bracket, Fixtures, and a 10s clean camera breather.",
		build: () => ({
			...defaultFlowConfig(),
			idle_mode: "loop",
			rotation: [
				{ id: makeStepId("points"), kind: "points_table", duration_sec: POINTS_TABLE_SEC, enabled: true },
				{ id: makeStepId("stats"), kind: "stats", duration_sec: 15, enabled: true },
				{ id: makeStepId("bracket"), kind: "bracket", duration_sec: BRACKET_SEC, enabled: true },
				{ id: makeStepId("fixtures"), kind: "fixtures", duration_sec: 15, enabled: true },
				{ id: makeStepId("pause"), kind: "clean_pause", duration_sec: 10, enabled: true },
			],
		}),
	},
]);

export const cloneFlowConfig = (raw) => {
	const base = defaultFlowConfig();
	if (!raw || typeof raw !== "object") return base;
	return {
		idle_mode: raw.idle_mode === "once_then_clean" ? "once_then_clean" : "loop",
		theme_accent: ["gold", "royal", "crimson"].includes(raw.theme_accent) ? raw.theme_accent : "gold",
		transition_style: raw.transition_style === "flip" ? "flip" : "reveal",
		match_stages: {
			...base.match_stages,
			...(raw.match_stages || {}),
		},
		rotation: Array.isArray(raw.rotation)
			? raw.rotation.map((step, idx) => {
					const kind = step.kind || "points_table";
					return {
						id: String(step.id || `step-${idx + 1}`),
						kind,
						// A saved flow that still says 20s for the points table is lifted to the 30s minimum.
						duration_sec: Math.min(180, Math.max(minSecForKind(kind), Number(step.duration_sec) || 15)),
						enabled: step.enabled !== false,
					};
				})
			: base.rotation,
		director: {
			...base.director,
			...(raw.director || {}),
		},
	};
};

/** Pure drag-and-drop list reorder. */
export const moveStep = (steps, fromIndex, toIndex) => {
	const list = [...(steps || [])];
	if (fromIndex < 0 || fromIndex >= list.length) return list;
	const clampedTo = Math.max(0, Math.min(list.length - 1, toIndex));
	if (fromIndex === clampedTo) return list;
	const [moved] = list.splice(fromIndex, 1);
	list.splice(clampedTo, 0, moved);
	return list;
};

/** Pure palette drop / insert into the rotation list (capped at 20 steps). */
export const insertStepAt = (steps, kind, index = null) => {
	const list = [...(steps || [])];
	if (list.length >= 20) return list;
	const meta = ROTATION_CARD_MAP[kind] || ROTATION_CARDS[0];
	const created = {
		id: makeStepId(meta.kind),
		kind: meta.kind,
		duration_sec: meta.defaultSec,
		enabled: true,
	};
	if (index == null || index < 0 || index >= list.length) {
		list.push(created);
	} else {
		list.splice(index, 0, created);
	}
	return list;
};

export const computeClockOffset = (serverNowIso, clientNowMs = Date.now()) => {
	const parsed = parseServerTime(serverNowIso);
	if (!parsed) return 0;
	return parsed.getTime() - clientNowMs;
};

/**
 * A server_now sample can only arrive late (by the time the response spent travelling), never early,
 * so the largest offset seen recently is the truest one. Keeps the clock from jumping on a slow refresh.
 */
export const trackClockOffset = (samples, offsetMs, clientNowMs = Date.now(), windowMs = 10 * 60_000) => {
	const kept = (samples || []).filter((sample) => clientNowMs - sample.at < windowMs).slice(-19);
	kept.push({ at: clientNowMs, offset: offsetMs });
	return { samples: kept, offset: Math.max(...kept.map((sample) => sample.offset)) };
};

const pad2 = (num) => String(Math.max(0, Math.floor(num))).padStart(2, "0");

export const formatClockSeconds = (totalSeconds) => {
	const clamped = Math.max(0, Math.ceil(totalSeconds));
	const minutes = Math.floor(clamped / 60);
	const seconds = clamped % 60;
	return `${pad2(minutes)}:${pad2(seconds)}`;
};

/**
 * Elapsed match clock. Same reading as the scorer's match card: seconds since started_at
 * (or extra_started_at once extra time has begun), capped at the period length. Both screens
 * use the same second boundary, so they tick together.
 */
const elapsedSeconds = (startMs, periodSec, nowMs) => {
	const remaining = Math.max(0, Math.ceil((startMs + periodSec * 1000 - nowMs) / 1000));
	return Math.max(0, periodSec - remaining);
};

export const formatMatchClock = (match, clockSettings = {}, nowMs = Date.now()) => {
	if (!match) return { phase: "idle", label: "", timer: "", urgent: false, active: false };
	if (match.category === 7 || match.golden_strike) {
		return { phase: "golden_strike", label: "GOLDEN STRIKE", timer: "GS", urgent: true, active: isLive(match) };
	}
	if (!isLive(match)) {
		return { phase: "idle", label: "", timer: "", urgent: false, active: false };
	}

	const regSec = Math.round(Number(clockSettings?.regulation_minutes || 15) * 60);
	const extraSec = Math.round(Number(clockSettings?.extra_minutes || 5) * 60);

	const extraStart = parseServerTime(match.extra_started_at);
	if (extraStart) {
		const elapsed = elapsedSeconds(extraStart.getTime(), extraSec, nowMs);
		const done = elapsed >= extraSec;
		// Level after extra time: the scorer is deciding whether to go to a Golden Strike.
		const deciding = done && match.level === true;
		return {
			phase: deciding ? "decision" : done ? "time_up" : "extra",
			label: deciding ? "LEVEL · GOLDEN STRIKE?" : done ? "EXTRA TIME UP" : "EXTRA TIME",
			timer: formatClockSeconds(elapsed),
			urgent: extraSec - elapsed <= 60,
			active: true,
		};
	}

	const regStart = parseServerTime(match.started_at);
	if (regStart) {
		const elapsed = elapsedSeconds(regStart.getTime(), regSec, nowMs);
		const done = elapsed >= regSec;
		// Level when regulation ends: the scorer is deciding whether to play extra time.
		const deciding = done && match.level === true;
		return {
			phase: deciding ? "decision" : done ? "time_up" : "regulation",
			label: deciding ? "LEVEL · EXTRA TIME?" : done ? "TIME UP" : "LIVE",
			timer: formatClockSeconds(elapsed),
			urgent: regSec - elapsed <= 120,
			active: true,
		};
	}

	return {
		phase: "regulation",
		label: "LIVE",
		timer: "00:00",
		urgent: false,
		active: true,
	};
};

const LEAGUE_CATEGORY_ID = 1;
const FINAL_CATEGORY_ID = 2;
const ELIMINATOR_CATEGORY_ID = 3;
const KNOCKOUT_THEME_CATEGORY_IDS = [3, 4, 5];

/**
 * Broadcast look for the stage of the competition: the Final, the other knockout matches (and the bracket),
 * or null for the league stage, which keeps the flow's own accent.
 */
export const stageThemeFor = (resolved) => {
	if (!resolved) return null;
	if (resolved.scene === "champion") return "final";
	if (resolved.scene === "bracket") return "knockout";
	const category = Number(resolved.bundle?.match?.category);
	if (category === FINAL_CATEGORY_ID) return "final";
	if (KNOCKOUT_THEME_CATEGORY_IDS.includes(category)) return "knockout";
	return null;
};

/** Every league match is played. From then on the table and the fixtures list say nothing new; the bracket does. */
export const isLeagueStageDone = (snapshot) => Boolean(snapshot?.top_stats?.is_league_stage_completed);

/**
 * A finished match's scoreboard stays on the stream, except two that the bracket already covers:
 * the last league match once the league is over, and the eliminator once it has been played.
 */
export const showsFinishedResult = (snapshot) => {
	const match = snapshot?.last_completed_match?.match;
	if (!match) return false;
	const category = Number(match.category);
	if (category === ELIMINATOR_CATEGORY_ID) return false;
	if (category === LEAGUE_CATEGORY_ID && isLeagueStageDone(snapshot)) return false;
	return true;
};

export const isStepAvailable = (kind, snapshot) => {
	if (!snapshot) return false;
	if (kind === "clean_pause") return true;
	if (kind === "points_table") return !isLeagueStageDone(snapshot) && Boolean(snapshot.points_table?.standings?.length);
	if (kind === "stats") return Boolean(snapshot.top_stats?.players?.length);
	if (kind === "fixtures") return !isLeagueStageDone(snapshot) && Boolean(snapshot.matches?.length);
	if (kind === "bracket") return Boolean(snapshot.knockout?.has_teams);
	if (kind === "tie_breakers") return Boolean(snapshot.tie_breakers?.league_complete && snapshot.tie_breakers?.groups?.length);
	if (kind === "champion") return Boolean(snapshot.knockout?.champion);
	if (kind === "last_result") return showsFinishedResult(snapshot);
	if (kind === "next_match") return Boolean(snapshot.next_scheduled_match?.match);
	return false;
};

/**
 * Once a team has qualified the bracket belongs on air, even for a saved flow that predates the card.
 * It joins right after the stats card (or the points table, or last) unless the rotation already has it.
 */
export const withBracketStep = (rotation, snapshot) => {
	const steps = rotation || [];
	if (!steps.length || !snapshot?.knockout?.has_teams) return steps;
	if (steps.some((step) => step.kind === "bracket")) return steps;
	const anchor = steps.findLastIndex((step) => step.kind === "stats" || step.kind === "points_table");
	const bracket = { id: "step-bracket-auto", kind: "bracket", duration_sec: BRACKET_SEC, enabled: true };
	const at = anchor < 0 ? steps.length : anchor + 1;
	return [...steps.slice(0, at), bracket, ...steps.slice(at)];
};

/**
 * Once the league is finished and teams are level for a knockout place, the tie-breaker card goes on air
 * ahead of the bracket, so viewers see why the bracket still has TBD places. Like the bracket, it needs no
 * rotation setup: it joins only when there is a tie to show.
 */
export const withTieBreakerStep = (rotation, snapshot) => {
	const steps = rotation || [];
	if (!steps.length || !isStepAvailable("tie_breakers", snapshot)) return steps;
	if (steps.some((step) => step.kind === "tie_breakers")) return steps;
	const tieBreakers = { id: "step-tie-breakers-auto", kind: "tie_breakers", duration_sec: TIE_BREAKER_SEC, enabled: true };
	const bracketAt = steps.findIndex((step) => step.kind === "bracket");
	const at = bracketAt >= 0 ? bracketAt : steps.length;
	return [...steps.slice(0, at), tieBreakers, ...steps.slice(at)];
};

/**
 * Once the Final has a winner the season's champions go on air first, with fireworks. Like the bracket, the card
 * needs no rotation setup. The Final's own scoreboard still holds the screen until it is marked complete, so the
 * champions arrive right after it.
 */
export const withChampionStep = (rotation, snapshot) => {
	const steps = rotation || [];
	if (!isStepAvailable("champion", snapshot)) return steps;
	if (steps.some((step) => step.kind === "champion")) return steps;
	const champion = { id: "step-champion-auto", kind: "champion", duration_sec: CHAMPION_SEC, enabled: true };
	return [champion, ...steps];
};

/**
 * With a champion decided the broadcast tells the season's story in a fixed order: the champions, how they got
 * there (the road to the final), then the Golden Striker. Both follow the champions card directly and are always
 * on, whatever the saved rotation says; their saved times are kept. The rest of the rotation carries on after them.
 */
export const withSeasonStorySteps = (rotation, snapshot) => {
	const steps = withChampionStep(rotation, snapshot);
	if (!isStepAvailable("champion", snapshot)) return steps;
	const championAt = steps.findIndex((step) => step.kind === "champion");
	if (championAt < 0) return steps;
	const story = [
		{ kind: "bracket", id: "step-bracket-auto", duration_sec: BRACKET_SEC },
		{ kind: "stats", id: "step-stats-auto", duration_sec: STATS_SEC },
	].map((fallback) => {
		const saved = steps.find((step) => step.kind === fallback.kind);
		return { ...fallback, ...(saved || {}), enabled: true };
	});
	const rest = steps.filter((step, index) => index !== championAt && step.kind !== "bracket" && step.kind !== "stats");
	return [steps[championAt], ...story, ...rest];
};

/** A made-up eight-team bracket for the admin preview: Qualifier 1 is set, the rest is still TBD. */
export const sampleKnockout = (standings = [], { decided = false } = {}) => {
	const names = ["Carrom Kings", "Board Strikers", "Queen Hunters", "Pocket Aces"];
	const team = (index) => {
		const row = standings[index];
		return { id: index + 1, name: row?.team_name || names[index], logo_url: row?.logo_url || null };
	};
	const side = (source, index = null) => ({ team: index == null ? null : team(index), source, is_winner: false });
	const slot = (key, label, sides) => ({ key, label, match_id: null, status: null, outcome: null, net_points: null, sides });
	if (decided) {
		// The Final is played and won by the top seed, so the champions card has something to show.
		const final = slot("final", "Final", [
			{ team: team(0), source: "#1", is_winner: true },
			{ team: team(1), source: "#2", is_winner: false },
		]);
		return { format: "full", has_teams: true, champion: team(0), slots: [{ ...final, net_points: 4 }] };
	}
	return {
		format: "full",
		has_teams: true,
		champion: null,
		slots: [
			slot("qualifier1", "Qualifier 1", [side("#1", 0), side("#2", 1)]),
			slot("eliminator", "Eliminator", [side("#3", 2), side("#4", 3)]),
			slot("qualifier2", "Qualifier 2", [side("Winner of Eliminator"), side("Loser of Qualifier 1")]),
			slot("final", "Final", [side("Winner of Qualifier 1"), side("Winner of Qualifier 2")]),
		],
	};
};

const layoutForScene = (scene) => {
	if (scene === "clean") return "none";
	if (scene === "live_bar" || scene === "toss") return "lower_third";
	return "card";
};

// What to show when a pinned card has nothing to show: the bracket once the league is over, otherwise the table.
const fallbackScene = (base, snapshot, preferred = "points_table") => {
	if (isLeagueStageDone(snapshot)) {
		return isStepAvailable("bracket", snapshot)
			? { ...base, scene: "bracket", layout: "card", bundle: null }
			: { ...base, scene: "clean", layout: "none", bundle: null };
	}
	return { ...base, scene: preferred, layout: "card", bundle: null };
};

const resolvePinnedScene = (director, snapshot, remainingSec, progress) => {
	const card = director.card;
	const pinned = snapshot.pinned_match;
	const fallbackActive = pinned || snapshot.active_match || snapshot.next_scheduled_match || snapshot.last_completed_match;

	const base = { source: "director", remainingSec, progress, stepId: null };
	if (card === "live") {
		return fallbackActive
			? { ...base, scene: "live_bar", layout: "lower_third", bundle: fallbackActive }
			: { ...base, scene: "clean", layout: "none", bundle: null };
	}
	if (card === "toss") {
		return fallbackActive
			? { ...base, scene: "toss", layout: "lower_third", bundle: fallbackActive }
			: { ...base, scene: "clean", layout: "none", bundle: null };
	}
	if (card === "match_ready" || card === "next_match") {
		const target = pinned || snapshot.next_scheduled_match || snapshot.active_match;
		return target
			? { ...base, scene: "match_ready", layout: "card", bundle: target, subMode: card === "next_match" ? "up_next" : "ready" }
			: fallbackScene(base, snapshot, "fixtures");
	}
	if (card === "match_result") {
		const target = pinned || snapshot.last_completed_match || snapshot.active_match;
		return target
			? { ...base, scene: "match_result", layout: "card", bundle: target }
			: fallbackScene(base, snapshot);
	}
	if (card === "scorecard") {
		return fallbackActive
			? { ...base, scene: "scorecard", layout: "card", bundle: fallbackActive }
			: fallbackScene(base, snapshot);
	}
	if (card === "bracket" && !isStepAvailable("bracket", snapshot)) {
		return fallbackScene(base, snapshot);
	}
	if (card === "points_table" || card === "stats" || card === "bracket" || card === "fixtures") {
		return { ...base, scene: card, layout: "card", bundle: null };
	}
	return { ...base, scene: "clean", layout: "none", bundle: null };
};

/**
 * Deterministic scene resolver for both standalone widgets and season_flow overlays.
 * Given the same snapshot and synchronized UTC timestamp `nowMs`, every viewer resolves the exact same scene.
 */
export const resolveActiveScene = (snapshot, nowMs = Date.now()) => {
	if (!snapshot) {
		return { scene: "clean", layout: "none", bundle: null, progress: null, remainingSec: null, source: "empty", themeAccent: "gold" };
	}

	if (snapshot.type !== "season_flow") {
		const type = snapshot.type;
		if (type === "scorecard") {
			return {
				scene: "scorecard",
				layout: "card",
				bundle: { match: snapshot.match, players: snapshot.players, rosters: null, head_to_head: null },
				progress: null,
				remainingSec: null,
				source: "standalone",
				themeAccent: "gold",
			};
		}
		if (type === "toss") {
			return {
				scene: "toss",
				layout: "lower_third",
				bundle: { match: snapshot.match, players: null, rosters: snapshot.rosters, head_to_head: snapshot.head_to_head },
				progress: null,
				remainingSec: null,
				source: "standalone",
				themeAccent: "gold",
			};
		}
		return {
			scene: type,
			layout: layoutForScene(type),
			bundle: null,
			progress: null,
			remainingSec: null,
			source: "standalone",
			themeAccent: "gold",
		};
	}

	const flow = cloneFlowConfig(snapshot.flow);
	const themeAccent = flow.theme_accent || "gold";
	const stages = flow.match_stages;

	// 1. Live Director manual override (auto-reverts when until_utc expires).
	const director = flow.director || { mode: "auto" };
	if (director.mode && director.mode !== "auto") {
		const untilDate = parseServerTime(director.until_utc);
		const expired = untilDate ? nowMs >= untilDate.getTime() : false;
		if (!expired) {
			const remainingSec = untilDate ? Math.max(1, Math.ceil((untilDate.getTime() - nowMs) / 1000)) : null;
			if (director.mode === "clean") {
				return { scene: "clean", layout: "none", bundle: null, progress: null, remainingSec, source: "director", themeAccent };
			}
			if (director.mode === "pin" && director.card) {
				return { ...resolvePinnedScene(director, snapshot, remainingSec, null), themeAccent };
			}
		}
	}

	// The last finished match keeps its result on screen until an operator marks it complete (`concluded_at`).
	// An API that does not report `concluded_at` still gets the old timed hold after CompletedAt.
	const lastDone = snapshot.last_completed_match;
	const completedDate = parseServerTime(lastDone?.match?.completed_at);
	const completedMs = completedDate ? completedDate.getTime() : null;
	const concludedDate = parseServerTime(lastDone?.match?.concluded_at);
	const concludedMs = concludedDate ? concludedDate.getTime() : null;
	const holdSec = Math.max(0, Number(stages.result_duration_sec ?? 20));
	const resultVisible = showsFinishedResult(snapshot);
	const resultAwaitsCompletion = Boolean(resultVisible && lastDone?.match && holdSec > 0 && awaitsCompletion(lastDone.match));
	const heldResult = () => ({
		scene: "match_result",
		layout: "card",
		bundle: lastDone,
		progress: null,
		remainingSec: null,
		source: "post_match",
		themeAccent,
	});

	// 2. Active match: Live -> held result -> Toss -> Ready. A live match always wins, but marking the next
	//    match Ready or tossing it does not take the finished match's scoreboard off the screen.
	const active = snapshot.active_match;
	if (active?.match) {
		if (isLive(active.match)) {
			if (stages.show_live !== false) {
				return {
					scene: "live_bar",
					layout: "lower_third",
					bundle: active,
					progress: null,
					remainingSec: null,
					source: "match_live",
					themeAccent,
				};
			}
			return { scene: "clean", layout: "none", bundle: null, progress: null, remainingSec: null, source: "match_live_hidden", themeAccent };
		}
		if (resultAwaitsCompletion) return heldResult();
		if (active.match.status === 1 && hasToss(active.match) && stages.show_toss !== false) {
			return {
				scene: "toss",
				layout: "lower_third",
				bundle: active,
				progress: null,
				remainingSec: null,
				source: "match_toss",
				themeAccent,
			};
		}
		if (isReady(active.match) && stages.show_ready !== false) {
			return {
				scene: "match_ready",
				layout: "card",
				bundle: active,
				subMode: "ready",
				progress: null,
				remainingSec: null,
				source: "match_ready",
				themeAccent,
			};
		}
	}

	// 3. No match is on the table: the held result, or the timed hold for an API without `concluded_at`.
	if (resultAwaitsCompletion) return heldResult();
	const timedHold = resultVisible && lastDone?.match && lastDone.match.concluded_at === undefined;
	if (timedHold && completedMs != null && holdSec > 0) {
		const sinceDoneMs = nowMs - completedMs;
		if (sinceDoneMs >= 0 && sinceDoneMs < holdSec * 1000) {
			const holdMs = holdSec * 1000;
			return {
				scene: "match_result",
				layout: "card",
				bundle: lastDone,
				progress: Math.min(1, sinceDoneMs / holdMs),
				remainingSec: Math.max(1, Math.ceil((holdMs - sinceDoneMs) / 1000)),
				source: "post_match",
				themeAccent,
			};
		}
	}

	// 4. Drag-and-drop Rotation sequence.
	const availableSteps = withSeasonStorySteps(withTieBreakerStep(withBracketStep(flow.rotation, snapshot), snapshot), snapshot).filter(
		(step) => step.enabled !== false && isStepAvailable(step.kind, snapshot),
	);
	if (!availableSteps.length) {
		return { scene: "clean", layout: "none", bundle: null, progress: null, remainingSec: null, source: "idle_empty", themeAccent };
	}

	const totalMs = availableSteps.reduce((sum, step) => sum + step.duration_sec * 1000, 0);
	// The rotation starts when the result leaves the screen: at completion, or after the timed hold.
	const anchorKnown = concludedMs != null || completedMs != null;
	const anchorMs =
		concludedMs != null ? concludedMs : completedMs != null ? completedMs + (timedHold ? holdSec * 1000 : 0) : 0;
	const elapsedMs = Math.max(0, nowMs - anchorMs);

	if (flow.idle_mode === "once_then_clean") {
		if (!anchorKnown || elapsedMs >= totalMs) {
			return { scene: "clean", layout: "none", bundle: null, progress: null, remainingSec: null, source: "idle_clean", themeAccent };
		}
	}

	const cycleOffsetMs = flow.idle_mode === "once_then_clean" ? elapsedMs : elapsedMs % totalMs;
	let walked = 0;
	for (const step of availableSteps) {
		const stepMs = step.duration_sec * 1000;
		if (cycleOffsetMs < walked + stepMs) {
			const intoStep = cycleOffsetMs - walked;
			const progress = Math.min(1, intoStep / stepMs);
			const remainingSec = Math.max(1, Math.ceil((stepMs - intoStep) / 1000));
			if (step.kind === "clean_pause") {
				return { scene: "clean", layout: "none", bundle: null, progress, remainingSec, source: "rotation", stepId: step.id, themeAccent };
			}
			if (step.kind === "last_result") {
				return {
					scene: "match_result",
					layout: "card",
					bundle: snapshot.last_completed_match,
					progress,
					remainingSec,
					source: "rotation",
					stepId: step.id,
					themeAccent,
				};
			}
			if (step.kind === "next_match") {
				return {
					scene: "match_ready",
					layout: "card",
					bundle: snapshot.next_scheduled_match,
					subMode: "up_next",
					progress,
					remainingSec,
					source: "rotation",
					stepId: step.id,
					themeAccent,
				};
			}
			return {
				scene: step.kind,
				layout: "card",
				bundle: null,
				progress,
				remainingSec,
				source: "rotation",
				stepId: step.id,
				themeAccent,
			};
		}
		walked += stepMs;
	}

	return { scene: "clean", layout: "none", bundle: null, progress: null, remainingSec: null, source: "idle_fallback", themeAccent };
};
