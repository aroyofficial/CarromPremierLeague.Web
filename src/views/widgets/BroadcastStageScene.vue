<template>
	<div class="bc-root" :data-bc-accent="resolved.themeAccent || 'gold'">
		<Transition :name="transitionName" mode="out-in" appear>
			<div
				v-if="resolved.scene !== 'clean'"
				:key="sceneKey"
				class="bc-stage"
				:class="resolved.layout === 'lower_third' ? 'bc-stage-lower' : 'bc-stage-card'"
			>
				<WidgetLiveBar
					v-if="resolved.scene === 'live_bar' && resolved.bundle"
					:bundle="resolved.bundle"
					:season-name="seasonName"
					:clock="clock"
					:now-ms="nowMs"
					:show-clock="showClock"
					:show-player-strip="showPlayerStrip"
				/>
				<WidgetToss
					v-else-if="resolved.scene === 'toss'"
					:snapshot="snapshot"
					:bundle="resolved.bundle"
					:season-name="seasonName"
				/>
				<WidgetMatchReady
					v-else-if="resolved.scene === 'match_ready' && resolved.bundle"
					:bundle="resolved.bundle"
					:season-name="seasonName"
					:clock="clock"
					:mode="resolved.subMode || 'ready'"
				/>
				<WidgetMatchResult
					v-else-if="resolved.scene === 'match_result' && resolved.bundle"
					:bundle="resolved.bundle"
					:season-name="seasonName"
				/>
				<WidgetScorecard
					v-else-if="resolved.scene === 'scorecard'"
					:snapshot="snapshot"
					:bundle="resolved.bundle"
					:clock="clock"
					:now-ms="nowMs"
				/>
				<WidgetPointsTable v-else-if="resolved.scene === 'points_table'" :snapshot="snapshot" />
				<WidgetStats v-else-if="resolved.scene === 'stats'" :snapshot="snapshot" />
				<WidgetBracket v-else-if="resolved.scene === 'bracket'" :snapshot="bracketSnapshot" />
				<WidgetFixtures v-else-if="resolved.scene === 'fixtures'" :snapshot="snapshot" />
			</div>
		</Transition>
	</div>
</template>

<script setup>
import { computed, onBeforeUnmount, watch } from "vue";
import "@/assets/styles/broadcast.css";
import { pauseBgm, playBgm } from "@/utils/common";
import { BackgroundMusic } from "@/utils/constants";
import { resolveActiveScene, sampleKnockout } from "@/utils/widgetFlow";
import WidgetBracket from "./WidgetBracket.vue";
import WidgetFixtures from "./WidgetFixtures.vue";
import WidgetLiveBar from "./WidgetLiveBar.vue";
import WidgetMatchReady from "./WidgetMatchReady.vue";
import WidgetMatchResult from "./WidgetMatchResult.vue";
import WidgetPointsTable from "./WidgetPointsTable.vue";
import WidgetScorecard from "./WidgetScorecard.vue";
import WidgetStats from "./WidgetStats.vue";
import WidgetToss from "./WidgetToss.vue";

const props = defineProps({
	snapshot: { type: Object, default: null },
	flowOverride: { type: Object, default: null },
	previewScene: { type: String, default: null },
	nowMs: { type: Number, default: () => Date.now() },
	// Only the live widget page plays sound. Admin previews stay silent.
	audio: { type: Boolean, default: false },
});

const effectiveSnapshot = computed(() => {
	if (!props.snapshot) return null;
	if (!props.flowOverride) return props.snapshot;
	return { ...props.snapshot, flow: props.flowOverride };
});

const fallbackPreviewBundle = computed(() => {
	const snap = effectiveSnapshot.value;
	if (!snap) return null;
	const existing = snap.active_match || snap.next_scheduled_match || snap.last_completed_match;
	if (existing?.match) return existing;

	const firstMatch = snap.matches?.[0];
	const standings = snap.points_table?.standings || [];
	const team1 = firstMatch?.team1 || { id: 1, name: standings[0]?.team_name || "Carrom Kings", logo_url: standings[0]?.logo_url || null };
	const team2 = firstMatch?.team2 || { id: 2, name: standings[1]?.team_name || "Board Strikers", logo_url: standings[1]?.logo_url || null };

	return {
		match: {
			id: firstMatch?.id || 1,
			order: firstMatch?.order ?? firstMatch?.match_order ?? 1,
			category: firstMatch?.category || 1,
			status: 2,
			toss_outcome: 1,
			team1_points: 6,
			team2_points: 3,
			winning_team: team1,
			team1,
			team2,
			started_at: new Date(props.nowMs - 4 * 60_000).toISOString(),
		},
		players: {
			team1: [
				{ player_id: 1, name: "Player One", coins_pocketed: 4, opponent_coins_pocketed: 0, coins_fined: 0, opponent_coins_fined: 0, strikers_pocketed: 1 },
				{ player_id: 2, name: "Player Two", coins_pocketed: 2, opponent_coins_pocketed: 0, coins_fined: 0, opponent_coins_fined: 0, strikers_pocketed: 0 },
			],
			team2: [
				{ player_id: 3, name: "Player Three", coins_pocketed: 2, opponent_coins_pocketed: 0, coins_fined: 1, opponent_coins_fined: 0, strikers_pocketed: 0 },
				{ player_id: 4, name: "Player Four", coins_pocketed: 1, opponent_coins_pocketed: 0, coins_fined: 0, opponent_coins_fined: 0, strikers_pocketed: 0 },
			],
		},
		rosters: {
			team1: [
				{ player_id: 1, name: "Player One" },
				{ player_id: 2, name: "Player Two" },
			],
			team2: [
				{ player_id: 3, name: "Player Three" },
				{ player_id: 4, name: "Player Four" },
			],
		},
		head_to_head: { matches_played: 3, team1_wins: 2, team2_wins: 1 },
	};
});

const resolved = computed(() => {
	const snap = effectiveSnapshot.value;
	if (!snap) {
		return { scene: "clean", layout: "none", bundle: null, progress: null, themeAccent: "gold" };
	}

	const themeAccent = snap.flow?.theme_accent || "gold";
	if (props.previewScene && props.previewScene !== "auto") {
		const kind = props.previewScene;
		if (kind === "clean" || kind === "clean_pause") {
			return { scene: "clean", layout: "none", bundle: null, progress: null, themeAccent };
		}
		if (kind === "live" || kind === "live_bar") {
			const base = snap.active_match || fallbackPreviewBundle.value;
			const liveBundle = base
				? {
						...base,
						match: {
							...base.match,
							status: 2,
							started_at: base.match.started_at || new Date(props.nowMs - 180_000).toISOString(),
						},
					}
				: null;
			return { scene: "live_bar", layout: "lower_third", bundle: liveBundle, progress: null, themeAccent };
		}
		if (kind === "toss") {
			const base = snap.active_match || snap.next_scheduled_match || fallbackPreviewBundle.value;
			const tossBundle = base
				? {
						...base,
						match: {
							...base.match,
							toss_outcome: base.match.toss_outcome && base.match.toss_outcome !== 3 ? base.match.toss_outcome : 1,
						},
					}
				: null;
			return { scene: "toss", layout: "lower_third", bundle: tossBundle, progress: null, themeAccent };
		}
		if (kind === "match_ready" || kind === "next_match") {
			const base = snap.next_scheduled_match || snap.active_match || fallbackPreviewBundle.value;
			return {
				scene: "match_ready",
				layout: "card",
				bundle: base,
				subMode: kind === "next_match" ? "up_next" : "ready",
				progress: null,
				themeAccent,
			};
		}
		if (kind === "match_result" || kind === "last_result") {
			const base = snap.last_completed_match || fallbackPreviewBundle.value;
			const doneBundle = base
				? {
						...base,
						match: {
							...base.match,
							status: 3,
							winning_team: base.match.winning_team || base.match.team1,
						},
					}
				: null;
			return { scene: "match_result", layout: "card", bundle: doneBundle, progress: 0.35, themeAccent };
		}
		if (kind === "scorecard") {
			return { scene: "scorecard", layout: "card", bundle: snap.active_match || fallbackPreviewBundle.value, progress: null, themeAccent };
		}
		return { scene: kind, layout: "card", bundle: null, progress: 0.35, themeAccent };
	}

	return resolveActiveScene(snap, props.nowMs);
});

// An admin preview of the bracket card shows a sample while no team has qualified, so the card can still be checked.
const bracketSnapshot = computed(() => {
	const snap = effectiveSnapshot.value;
	if (!snap || !props.previewScene || snap.knockout?.has_teams) return snap;
	return { ...snap, knockout: sampleKnockout(snap.points_table?.standings || []) };
});

const seasonName = computed(() => effectiveSnapshot.value?.season?.name || "");
const clock = computed(() => effectiveSnapshot.value?.clock || {});
const showClock = computed(() => effectiveSnapshot.value?.flow?.match_stages?.show_clock !== false);
const showPlayerStrip = computed(() => effectiveSnapshot.value?.flow?.match_stages?.show_player_strip !== false);
const sceneKey = computed(() => `${resolved.value.scene}:${resolved.value.subMode || ""}:${resolved.value.bundle?.match?.id || ""}`);
const transitionName = computed(() => (effectiveSnapshot.value?.flow?.transition_style === "flip" ? "bc-flip" : "bc-reveal"));

// The standings card plays the same looping background music as the Points Table page.
const wantsMusic = computed(() => props.audio && resolved.value.scene === "points_table");

const retryOnGesture = () => {
	window.removeEventListener("pointerdown", retryOnGesture);
	window.removeEventListener("keydown", retryOnGesture);
	if (wantsMusic.value) startMusic();
};

const disarmGesture = () => {
	window.removeEventListener("pointerdown", retryOnGesture);
	window.removeEventListener("keydown", retryOnGesture);
};

async function startMusic() {
	await playBgm(BackgroundMusic.Match, 1800);
	const element = document.getElementById(BackgroundMusic.Match);
	// A plain browser tab blocks sound until the page is touched; a streaming browser source does not.
	if (wantsMusic.value && (!element || element.paused)) {
		window.addEventListener("pointerdown", retryOnGesture);
		window.addEventListener("keydown", retryOnGesture);
	}
}

function stopMusic() {
	disarmGesture();
	return pauseBgm(BackgroundMusic.Match, 900);
}

watch(
	wantsMusic,
	(on, wasOn) => {
		if (on) startMusic();
		else if (wasOn) stopMusic();
	},
	{ immediate: true },
);

onBeforeUnmount(() => {
	if (!props.audio) return;
	disarmGesture();
	pauseBgm(BackgroundMusic.Match, 300);
});
</script>
