import { Routes } from "./constants.js";
import { parseServerTime } from "./integrations.js";

export const WIDGET_TYPES = Object.freeze([
	{ value: "scorecard", label: "Live scorecard", target: "match", hint: "Team scores, each player's coins and fines, and the result." },
	{ value: "toss", label: "Toss", target: "match", hint: "Who won the toss, with both teams shown." },
	{ value: "fixtures", label: "Fixtures", target: "season", hint: "The season's fixtures, centred on the next match to play." },
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

export const widgetTargetText = (widget) => {
	if (widget?.widget_type === "fixtures") return `Season #${widget.season_id}`;
	return `Match #${widget?.match_id}`;
};

// The full link exists only when a token is issued; the list keeps the prefix alone.
export const widgetUrl = (token, origin = globalThis.location?.origin || "") =>
	`${origin}${Routes.WIDGET}/${encodeURIComponent(token)}`;

/** Returns an error message, or "" when the form can be saved. */
export const widgetFormError = ({ name, widgetType, matchId, seasonId, expiresAt, editing = false }, now = Date.now()) => {
	if (!String(name || "").trim()) return "Enter a name for this widget.";
	// A widget's target is fixed once it exists, so editing checks only the name and expiry.
	if (!editing) {
		if (!widgetType) return "Choose what the widget shows.";
		if (widgetTargetKind(widgetType) === "season" && !seasonId) return "Choose a season.";
		if (widgetTargetKind(widgetType) === "match" && !matchId) return "Choose a match.";
	}
	if (expiresAt) {
		const when = parseServerTime(expiresAt) || new Date(expiresAt);
		if (when.getTime() <= now) return "The expiry must be in the future.";
	}
	return "";
};

export const widgetCreatePayload = ({ name, widgetType, matchId, seasonId, expiresAt }) => {
	const fixtures = widgetTargetKind(widgetType) === "season";
	return {
		name: String(name).trim(),
		widget_type: widgetType,
		match_id: fixtures ? null : Number(matchId),
		season_id: fixtures ? Number(seasonId) : null,
		expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
	};
};
