import { Routes } from "./constants.js";
import { parseServerTime } from "./integrations.js";
import { defaultFlowConfig } from "./widgetFlow.js";

export const WIDGET_TYPES = Object.freeze([
	{
		value: "season_flow",
		label: "Season broadcast flow",
		target: "season",
		badge: "Recommended",
		hint: "One smart overlay for the whole season: auto-follows Ready -> Toss -> Live lower-third -> Post-match result -> drag-and-drop Points Table, Stats & Fixtures.",
	},
	{
		value: "scorecard",
		label: "Match scorecard",
		target: "match",
		hint: "Pin a full broadcast scorecard for one specific match.",
	},
	{
		value: "toss",
		label: "Match toss",
		target: "match",
		hint: "Pin the toss ceremony banner for one specific match.",
	},
	{
		value: "points_table",
		label: "Points table",
		target: "season",
		hint: "Pin the live season league standings card.",
	},
	{
		value: "stats",
		label: "Golden Striker & stats",
		target: "season",
		hint: "Pin the top coin potters leaderboard for a season.",
	},
	{
		value: "fixtures",
		label: "Season fixtures",
		target: "season",
		hint: "Pin the season schedule and results slate.",
	},
]);

export const WIDGET_STATUS_LABEL = Object.freeze({
	active: "Live link",
	expired: "Expired",
	revoked: "Turned off",
});

export const WIDGET_TYPE_LABEL = Object.freeze(Object.fromEntries(WIDGET_TYPES.map((type) => [type.value, type.label])));

export const widgetTargetKind = (type) => WIDGET_TYPES.find((item) => item.value === type)?.target || "match";

// The server decides the status; this only keeps the label set in one place.
export const widgetState = (widget) => (widget?.status in WIDGET_STATUS_LABEL ? widget.status : "revoked");

export const summarizeWidgets = (widgets) => {
	const list = Array.isArray(widgets) ? widgets : [];
	return {
		total: list.length,
		active: list.filter((widget) => widgetState(widget) === "active").length,
		flows: list.filter((widget) => widget.widget_type === "season_flow" && widgetState(widget) === "active").length,
		off: list.filter((widget) => widgetState(widget) !== "active").length,
	};
};

export const filterWidgets = (widgets, search, status) => {
	const needle = String(search || "").trim().toLowerCase();
	return (Array.isArray(widgets) ? widgets : []).filter((widget) => {
		if (status && status !== "all" && widgetState(widget) !== status) return false;
		if (!needle) return true;
		return [widget.name, widget.token_prefix, WIDGET_TYPE_LABEL[widget.widget_type]].some((value) =>
			String(value ?? "").toLowerCase().includes(needle),
		);
	});
};

export const widgetTargetText = (widget, seasonsById = null) => {
	if (widgetTargetKind(widget?.widget_type) === "season") {
		const seasonName = seasonsById?.get?.(widget?.season_id);
		return seasonName || `Season #${widget?.season_id}`;
	}
	return `Match #${widget?.match_id}`;
};

// The full link exists only when a token is issued; the list keeps the prefix alone.
export const widgetUrl = (token, origin = globalThis.location?.origin || "") =>
	`${origin}${Routes.WIDGET}/${encodeURIComponent(token)}`;

/** Returns an error message, or "" when the form can be saved. */
export const widgetFormError = ({ name, widgetType, matchId, seasonId, expiresAt, flowConfig, editing = false }, now = Date.now()) => {
	if (!String(name || "").trim()) return "Enter a name for this widget.";
	// A widget's target is fixed once it exists, so editing checks only the name, flow, and expiry.
	if (!editing) {
		if (!widgetType) return "Choose what the widget shows.";
		if (widgetTargetKind(widgetType) === "season" && !seasonId) return "Choose a season.";
		if (widgetTargetKind(widgetType) === "match" && !matchId) return "Choose a match.";
	}
	if (widgetType === "season_flow" && flowConfig) {
		const steps = Array.isArray(flowConfig.rotation) ? flowConfig.rotation : [];
		if (steps.length > 20) return "A season flow can have at most 20 rotation cards.";
		for (const step of steps) {
			const dur = Number(step.duration_sec);
			if (!Number.isFinite(dur) || dur < 5 || dur > 180) {
				return "Each rotation card duration must be between 5 and 180 seconds.";
			}
		}
	}
	if (expiresAt) {
		const when = parseServerTime(expiresAt) || new Date(expiresAt);
		if (when.getTime() <= now) return "The expiry must be in the future.";
	}
	return "";
};

export const widgetCreatePayload = ({ name, widgetType, matchId, seasonId, expiresAt, flowConfig }) => {
	const isSeason = widgetTargetKind(widgetType) === "season";
	const payload = {
		name: String(name).trim(),
		widget_type: widgetType,
		match_id: isSeason ? null : Number(matchId),
		season_id: isSeason ? Number(seasonId) : null,
		expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
	};
	if (widgetType === "season_flow") {
		payload.flow_config = flowConfig || defaultFlowConfig();
	}
	return payload;
};
