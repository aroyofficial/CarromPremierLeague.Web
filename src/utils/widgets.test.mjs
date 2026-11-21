import assert from "node:assert/strict";
import test from "node:test";
import {
	filterWidgets,
	summarizeWidgets,
	widgetCreatePayload,
	widgetFormError,
	widgetState,
	widgetTargetText,
	widgetUrl,
} from "./widgets.js";

const sample = [
	{ id: 1, name: "Main scoreboard", widget_type: "scorecard", match_id: 4, token_prefix: "cpl_widget_Ab12", status: "active" },
	{ id: 2, name: "Season fixtures", widget_type: "fixtures", season_id: 2, token_prefix: "cpl_widget_Zz99", status: "expired" },
	{ id: 3, name: "Toss card", widget_type: "toss", match_id: 5, token_prefix: "cpl_widget_Qq77", status: "revoked" },
];

test("summary counts live links and the ones that are off", () => {
	assert.deepEqual(summarizeWidgets(sample), { total: 3, active: 1, off: 2 });
	assert.deepEqual(summarizeWidgets(null), { total: 0, active: 0, off: 0 });
});

test("filter matches status, name, prefix, and type", () => {
	assert.equal(filterWidgets(sample, "", "all").length, 3);
	assert.deepEqual(filterWidgets(sample, "", "expired").map((w) => w.id), [2]);
	assert.deepEqual(filterWidgets(sample, "scoreboard", "all").map((w) => w.id), [1]);
	assert.deepEqual(filterWidgets(sample, "zz99", "all").map((w) => w.id), [2]);
	assert.deepEqual(filterWidgets(sample, "toss", "all").map((w) => w.id), [3]);
});

test("unknown status falls back to turned off", () => {
	assert.equal(widgetState({ status: "weird" }), "revoked");
});

test("target text names the match or season", () => {
	assert.equal(widgetTargetText(sample[0]), "Match #4");
	assert.equal(widgetTargetText(sample[1]), "Season #2");
});

test("the link points at the public widget route and encodes the token", () => {
	assert.equal(widgetUrl("cpl_widget_abc", "https://cpl.example"), "https://cpl.example/widget/cpl_widget_abc");
	assert.equal(widgetUrl("a b/c", "https://cpl.example"), "https://cpl.example/widget/a%20b%2Fc");
});

test("form errors name the first missing piece", () => {
	assert.equal(widgetFormError({ name: " ", widgetType: "toss", matchId: 1 }), "Enter a name for this widget.");
	assert.equal(widgetFormError({ name: "x", widgetType: "scorecard", matchId: null }), "Choose a match.");
	assert.equal(widgetFormError({ name: "x", widgetType: "fixtures", seasonId: null }), "Choose a season.");
	assert.equal(widgetFormError({ name: "x", widgetType: "fixtures", seasonId: 2 }), "");
});

test("an expiry in the past is refused", () => {
	const now = Date.parse("2026-11-21T10:00:00Z");
	const past = new Date("2026-11-20T10:00:00Z");
	const future = new Date("2026-12-20T10:00:00Z");
	assert.equal(widgetFormError({ name: "x", widgetType: "toss", matchId: 1, expiresAt: past }, now), "The expiry must be in the future.");
	assert.equal(widgetFormError({ name: "x", widgetType: "toss", matchId: 1, expiresAt: future }, now), "");
});

test("payload sends only the target that matches the widget type", () => {
	const scorecard = widgetCreatePayload({ name: " Board ", widgetType: "scorecard", matchId: "7", seasonId: 3, expiresAt: null });
	assert.deepEqual(scorecard, { name: "Board", widget_type: "scorecard", match_id: 7, season_id: null, expires_at: null });

	const fixtures = widgetCreatePayload({ name: "Fx", widgetType: "fixtures", matchId: 7, seasonId: "3", expiresAt: null });
	assert.deepEqual(fixtures, { name: "Fx", widget_type: "fixtures", match_id: null, season_id: 3, expires_at: null });
});
