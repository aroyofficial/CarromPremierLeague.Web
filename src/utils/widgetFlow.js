import { parseServerTime } from "./integrations.js";
import { hasToss, isLive, isReady } from "./widgetScore.js";

/** The standings card stays up long enough to read every row, and it plays the league music while it does. */
export const POINTS_TABLE_SEC = 30;

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
	{ card: "fixtures", label: "Fixtures" },
	{ card: "match_result", label: "Last Result" },
	{ card: "next_match", label: "Up Next" },
	{ card: "live", label: "Live Scorebug" },
	{ card: "toss", label: "Toss Banner" },
	{ card: "scorecard", label: "Full Scorecard" },
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
		{ id: "step-fixtures", kind: "fixtures", duration_sec: 15, enabled: true },
	],
	director: { mode: "auto", card: null, match_id: null, until_utc: null },
});

export const FLOW_PRESETS = Object.freeze([
	{
		id: "full_tv",
		label: "Full Tournament TV",
		description: "Ready -> Toss -> Live bar -> 20s Result -> loops Points, Stats, Fixtures & Up Next.",
		build: () => ({
			...defaultFlowConfig(),
			idle_mode: "loop",
			rotation: [
				{ id: makeStepId("points"), kind: "points_table", duration_sec: POINTS_TABLE_SEC, enabled: true },
				{ id: makeStepId("stats"), kind: "stats", duration_sec: 15, enabled: true },
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
		description: "Cycles Standings, Stats, Fixtures, and a 10s clean camera breather.",
		build: () => ({
			...defaultFlowConfig(),
			idle_mode: "loop",
			rotation: [
				{ id: makeStepId("points"), kind: "points_table", duration_sec: POINTS_TABLE_SEC, enabled: true },
				{ id: makeStepId("stats"), kind: "stats", duration_sec: 15, enabled: true },
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
		return {
			phase: done ? "time_up" : "extra",
			label: done ? "EXTRA TIME UP" : "EXTRA TIME",
			timer: formatClockSeconds(elapsed),
			urgent: extraSec - elapsed <= 60,
			active: true,
		};
	}

	const regStart = parseServerTime(match.started_at);
	if (regStart) {
		const elapsed = elapsedSeconds(regStart.getTime(), regSec, nowMs);
		const done = elapsed >= regSec;
		return {
			phase: done ? "time_up" : "regulation",
			label: done ? "TIME UP" : "LIVE",
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

export const isStepAvailable = (kind, snapshot) => {
	if (!snapshot) return false;
	if (kind === "clean_pause") return true;
	if (kind === "points_table") return Boolean(snapshot.points_table?.standings?.length);
	if (kind === "stats") return Boolean(snapshot.top_stats?.players?.length);
	if (kind === "fixtures") return Boolean(snapshot.matches?.length);
	if (kind === "last_result") return Boolean(snapshot.last_completed_match?.match);
	if (kind === "next_match") return Boolean(snapshot.next_scheduled_match?.match);
	return false;
};

const layoutForScene = (scene) => {
	if (scene === "clean") return "none";
	if (scene === "live_bar" || scene === "toss") return "lower_third";
	return "card";
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
			: { ...base, scene: "fixtures", layout: "card", bundle: null };
	}
	if (card === "match_result") {
		const target = pinned || snapshot.last_completed_match || snapshot.active_match;
		return target
			? { ...base, scene: "match_result", layout: "card", bundle: target }
			: { ...base, scene: "points_table", layout: "card", bundle: null };
	}
	if (card === "scorecard") {
		return fallbackActive
			? { ...base, scene: "scorecard", layout: "card", bundle: fallbackActive }
			: { ...base, scene: "points_table", layout: "card", bundle: null };
	}
	if (card === "points_table" || card === "stats" || card === "fixtures") {
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

	// 2. Active match: Live -> Toss -> Ready.
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

	// 3. Immediate Post-Match Result hold right after CompletedAt.
	const lastDone = snapshot.last_completed_match;
	const completedDate = parseServerTime(lastDone?.match?.completed_at);
	const completedMs = completedDate ? completedDate.getTime() : null;
	const holdSec = Math.max(0, Number(stages.result_duration_sec ?? 20));
	if (lastDone?.match && completedMs != null && holdSec > 0) {
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
	const availableSteps = (flow.rotation || []).filter((step) => step.enabled !== false && isStepAvailable(step.kind, snapshot));
	if (!availableSteps.length) {
		return { scene: "clean", layout: "none", bundle: null, progress: null, remainingSec: null, source: "idle_empty", themeAccent };
	}

	const totalMs = availableSteps.reduce((sum, step) => sum + step.duration_sec * 1000, 0);
	const anchorMs = completedMs != null ? completedMs + holdSec * 1000 : 0;
	const elapsedMs = Math.max(0, nowMs - anchorMs);

	if (flow.idle_mode === "once_then_clean") {
		if (completedMs == null || elapsedMs >= totalMs) {
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
