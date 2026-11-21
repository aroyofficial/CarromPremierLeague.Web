<template>
	<section class="bc-lower-third lb-shell">
		<header class="lb-head">
			<div class="bc-eyebrow">
				<span class="bc-league-pill">CPL</span>
				<span v-if="seasonName">{{ seasonName }}</span>
				<span v-if="seasonName" class="bc-dot"></span>
				<span>{{ matchLabel(match) }}</span>
				<span class="bc-dot"></span>
				<span class="lb-format">{{ matchFormatLabel(match.category, clock) }}</span>
			</div>

			<div class="lb-clock-group">
				<span class="bc-badge is-live">
					<span class="bc-live-dot"></span>
					{{ clockState.label || "LIVE" }}
				</span>
				<span v-if="showClock && clockState.timer" class="lb-timer" :class="{ 'is-urgent': clockState.urgent }">
					{{ clockState.timer }}
				</span>
			</div>
		</header>

		<div class="lb-deck">
			<div class="lb-team is-home">
				<div class="bc-crest">
					<BroadcastPicture :src="match.team1?.logo_url" :name="match.team1?.name" />
				</div>
				<div class="lb-team-meta">
					<div class="lb-team-row">
						<h2>{{ match.team1?.name || "TBD" }}</h2>
						<span v-if="tossSide === 'team1'" class="bc-toss-chip">Toss</span>
					</div>
					<div class="bc-pips" aria-hidden="true">
						<span v-for="(lit, idx) in homePips" :key="idx" class="bc-pip" :class="{ 'is-lit': lit }"></span>
					</div>
				</div>
			</div>

			<div class="lb-score-pod" :class="{ 'bc-score-bump': scoreBumped }">
				<span class="lb-score-num">{{ totals.team1 }}</span>
				<span class="lb-score-sep">:</span>
				<span class="lb-score-num">{{ totals.team2 }}</span>
			</div>

			<div class="lb-team is-away">
				<div class="lb-team-meta">
					<div class="lb-team-row">
						<span v-if="tossSide === 'team2'" class="bc-toss-chip">Toss</span>
						<h2>{{ match.team2?.name || "TBD" }}</h2>
					</div>
					<div class="bc-pips" aria-hidden="true">
						<span v-for="(lit, idx) in awayPips" :key="idx" class="bc-pip" :class="{ 'is-lit': lit }"></span>
					</div>
				</div>
				<div class="bc-crest">
					<BroadcastPicture :src="match.team2?.logo_url" :name="match.team2?.name" />
				</div>
			</div>
		</div>

		<div v-if="showPlayerStrip && (homePlayers.length || awayPlayers.length)" class="lb-strip">
			<div class="lb-strip-side">
				<div v-for="player in homePlayers" :key="player.player_id" class="lb-player-chip">
					<span class="lb-player-name">{{ player.name }}</span>
					<span class="lb-player-stat"><strong>{{ player.coins_pocketed }}</strong>c</span>
					<span v-if="player.opponent_coins_pocketed" class="lb-player-stat is-opp">+{{ player.opponent_coins_pocketed }}o</span>
					<span v-if="fineCoins(player)" class="lb-player-stat is-fine">-{{ fineCoins(player) }}f</span>
					<span v-if="player.strikers_pocketed" class="lb-player-stat">{{ player.strikers_pocketed }}s</span>
				</div>
			</div>
			<div class="lb-strip-divider"></div>
			<div class="lb-strip-side is-away">
				<div v-for="player in awayPlayers" :key="player.player_id" class="lb-player-chip">
					<span class="lb-player-name">{{ player.name }}</span>
					<span class="lb-player-stat"><strong>{{ player.coins_pocketed }}</strong>c</span>
					<span v-if="player.opponent_coins_pocketed" class="lb-player-stat is-opp">+{{ player.opponent_coins_pocketed }}o</span>
					<span v-if="fineCoins(player)" class="lb-player-stat is-fine">-{{ fineCoins(player) }}f</span>
					<span v-if="player.strikers_pocketed" class="lb-player-stat">{{ player.strikers_pocketed }}s</span>
				</div>
			</div>
		</div>
	</section>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { formatMatchClock } from "@/utils/widgetFlow";
import {
	coinPips,
	fineCoins,
	matchFormatLabel,
	matchLabel,
	scorecardTotals,
	tossWinnerSide,
} from "@/utils/widgetScore";
import BroadcastPicture from "./BroadcastPicture.vue";

const props = defineProps({
	bundle: { type: Object, required: true },
	seasonName: { type: String, default: "" },
	clock: { type: Object, default: () => ({}) },
	nowMs: { type: Number, default: () => Date.now() },
	showClock: { type: Boolean, default: true },
	showPlayerStrip: { type: Boolean, default: true },
});

const match = computed(() => props.bundle?.match || {});
const players = computed(() => props.bundle?.players || { team1: [], team2: [] });
const homePlayers = computed(() => players.value.team1 || []);
const awayPlayers = computed(() => players.value.team2 || []);
const totals = computed(() => scorecardTotals(players.value));
const homePips = computed(() => coinPips(totals.value.team1));
const awayPips = computed(() => coinPips(totals.value.team2));
const tossSide = computed(() => tossWinnerSide(match.value));
const clockState = computed(() => formatMatchClock(match.value, props.clock, props.nowMs));

const scoreBumped = ref(false);
let bumpTimer = null;
watch(
	() => `${totals.value.team1}:${totals.value.team2}`,
	(_next, prev) => {
		if (!prev) return;
		scoreBumped.value = false;
		clearTimeout(bumpTimer);
		bumpTimer = setTimeout(() => {
			scoreBumped.value = true;
			bumpTimer = setTimeout(() => {
				scoreBumped.value = false;
			}, 750);
		}, 16);
	},
);
</script>

<style scoped>
.lb-shell {
	width: 1460px;
}

.lb-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 7px 24px;
	background: rgba(255, 255, 255, 0.035);
	border-bottom: 1px solid var(--bc-rim-soft);
}

.lb-format {
	color: var(--bc-sub);
	font-weight: 600;
}

.lb-clock-group {
	display: flex;
	align-items: center;
	gap: 12px;
}

.lb-timer {
	padding: 3px 13px;
	border-radius: 9px;
	background: rgba(15, 23, 42, 0.85);
	border: 1px solid var(--bc-accent-line);
	font-size: 22px;
	font-weight: 800;
	letter-spacing: 0.04em;
	color: var(--bc-accent-soft);
}

.lb-timer.is-urgent {
	border-color: rgba(248, 113, 113, 0.75);
	color: #fca5a5;
	box-shadow: 0 0 18px rgba(239, 68, 68, 0.35);
}

.lb-deck {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
	align-items: center;
	gap: 24px;
	padding: 10px 24px;
}

.lb-team {
	display: flex;
	align-items: center;
	gap: 14px;
	min-width: 0;
}

.lb-team.is-away {
	justify-content: flex-end;
	text-align: right;
}

.lb-team-meta {
	display: flex;
	flex-direction: column;
	gap: 6px;
	min-width: 0;
}

.lb-team.is-away .lb-team-meta {
	align-items: flex-end;
}

.lb-team-row {
	display: flex;
	align-items: center;
	gap: 10px;
	min-width: 0;
}

.lb-team h2 {
	margin: 0;
	font-size: 31px;
	font-weight: 800;
	line-height: 1.05;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.lb-score-pod {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 14px;
	min-width: 196px;
	padding: 7px 24px;
	border-radius: 15px;
	background: linear-gradient(180deg, rgba(245, 184, 46, 0.16) 0%, rgba(15, 23, 42, 0.92) 100%);
	border: 2px solid var(--bc-accent-line);
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.lb-score-num {
	font-size: 48px;
	font-weight: 900;
	line-height: 1;
	color: #ffffff;
}

.lb-score-sep {
	font-size: 34px;
	font-weight: 700;
	color: var(--bc-accent);
}

.lb-strip {
	display: grid;
	grid-template-columns: minmax(0, 1fr) 1px minmax(0, 1fr);
	align-items: center;
	gap: 18px;
	padding: 6px 24px 8px;
	background: rgba(2, 6, 18, 0.48);
	border-top: 1px solid var(--bc-rim-soft);
}

.lb-strip-divider {
	height: 20px;
	background: var(--bc-rim-soft);
}

.lb-strip-side {
	display: flex;
	align-items: center;
	gap: 14px;
	flex-wrap: wrap;
}

.lb-strip-side.is-away {
	justify-content: flex-end;
}

.lb-player-chip {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	padding: 4px 12px;
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.05);
	border: 1px solid rgba(255, 255, 255, 0.08);
	font-size: 16px;
}

.lb-player-name {
	font-weight: 600;
	color: #e2e8f0;
}

.lb-player-stat {
	color: var(--bc-accent-soft);
	font-weight: 600;
}

.lb-player-stat strong {
	font-weight: 800;
	color: #ffffff;
}

.lb-player-stat.is-opp {
	color: #86efac;
}

.lb-player-stat.is-fine {
	color: #fca5a5;
}
</style>
