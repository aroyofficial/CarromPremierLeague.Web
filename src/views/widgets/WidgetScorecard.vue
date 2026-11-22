<template>
	<section class="bc-card sc-panel">
		<header class="bc-topbar">
			<div class="bc-eyebrow">
				<span class="bc-league-pill">CPL</span>
				<span class="sc-label">{{ matchLabel(match) }}</span>
			</div>
			<div class="sc-head-right">
				<span v-if="clockState.active && clockState.timer" class="sc-clock">{{ clockState.timer }}</span>
				<span class="bc-badge" :class="badgeClass">
					<span v-if="isLive(match)" class="bc-live-dot"></span>
					{{ statusLabel(match) }}
				</span>
			</div>
		</header>

		<div class="sc-teams">
			<div class="sc-team">
				<div class="bc-crest is-lg bc-pop" style="--i: 0">
					<BroadcastPicture :src="match.team1?.logo_url" :name="match.team1?.name" />
				</div>
				<div class="sc-team-meta">
					<h2>{{ match.team1?.name || "TBD" }}</h2>
					<div class="bc-pips" aria-hidden="true">
						<span v-for="(lit, idx) in coinPips(totals.team1)" :key="idx" class="bc-pip" :class="{ 'is-lit': lit }"></span>
					</div>
				</div>
			</div>

			<div class="sc-score">
				<span>{{ totals.team1 }}</span>
				<span class="sc-dash">–</span>
				<span>{{ totals.team2 }}</span>
			</div>

			<div class="sc-team is-away">
				<div class="sc-team-meta">
					<h2>{{ match.team2?.name || "TBD" }}</h2>
					<div class="bc-pips" aria-hidden="true">
						<span v-for="(lit, idx) in coinPips(totals.team2)" :key="idx" class="bc-pip" :class="{ 'is-lit': lit }"></span>
					</div>
				</div>
				<div class="bc-crest is-lg bc-pop" style="--i: 0">
					<BroadcastPicture :src="match.team2?.logo_url" :name="match.team2?.name" />
				</div>
			</div>
		</div>

		<p class="sc-toss">{{ tossLine(match) }}</p>

		<div class="sc-tables">
			<div v-for="side in sides" :key="side.key" class="sc-table">
				<h3>{{ side.team?.name || "TBD" }}</h3>
				<table>
					<thead>
						<tr>
							<th>Player</th>
							<th>Coins</th>
							<th>Opp.</th>
							<th>Fines</th>
							<th>Strikers</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="player in side.players" :key="player.player_id">
							<td class="sc-name">{{ firstName(player) }}</td>
							<td>{{ player.coins_pocketed }}</td>
							<td>{{ player.opponent_coins_pocketed }}</td>
							<td>{{ fineCoins(player) }}</td>
							<td>{{ player.strikers_pocketed }}</td>
						</tr>
						<tr v-if="!side.players.length">
							<td colspan="5" class="sc-empty">Lineup awaiting confirmation</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>

		<p v-if="resultLine(match)" class="sc-result">{{ resultLine(match) }}</p>
	</section>
</template>

<script setup>
import { computed } from "vue";
import { formatMatchClock } from "@/utils/widgetFlow";
import {
	coinPips,
	fineCoins,
	firstName,
	isLive,
	isPlayed,
	matchLabel,
	resultLine,
	scorecardTotals,
	statusLabel,
	tossLine,
} from "@/utils/widgetScore";
import BroadcastPicture from "./BroadcastPicture.vue";

const props = defineProps({
	snapshot: { type: Object, default: null },
	bundle: { type: Object, default: null },
	clock: { type: Object, default: () => ({}) },
	nowMs: { type: Number, default: () => Date.now() },
});

const match = computed(() => props.bundle?.match || props.snapshot?.match || {});
const playersSource = computed(() => props.bundle?.players || props.snapshot?.players || { team1: [], team2: [] });
const totals = computed(() => scorecardTotals(playersSource.value));
const clockState = computed(() => formatMatchClock(match.value, props.clock || props.snapshot?.clock || {}, props.nowMs));
const badgeClass = computed(() => {
	if (isLive(match.value)) return "is-live";
	if (isPlayed(match.value)) return "is-final";
	return "is-gold";
});
const sides = computed(() => [
	{ key: "team1", team: match.value.team1, players: playersSource.value?.team1 || [] },
	{ key: "team2", team: match.value.team2, players: playersSource.value?.team2 || [] },
]);
</script>

<style scoped>
.sc-head-right {
	display: flex;
	align-items: center;
	gap: 14px;
}

.sc-clock {
	padding: 5px 14px;
	border-radius: 10px;
	background: rgba(15, 23, 42, 0.85);
	border: 1px solid var(--bc-accent-line);
	font-size: 24px;
	font-weight: 800;
	color: var(--bc-accent-soft);
}

.sc-teams {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
	align-items: center;
	gap: 28px;
	padding: 28px 44px 12px;
}

.sc-team {
	display: flex;
	align-items: center;
	gap: 20px;
}

.sc-team.is-away {
	justify-content: flex-end;
	text-align: right;
}

.sc-team-meta {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.sc-team.is-away .sc-team-meta {
	align-items: flex-end;
}

.sc-team h2 {
	margin: 0;
	font-size: 40px;
	font-weight: 800;
	line-height: 1.1;
}

.sc-score {
	display: flex;
	align-items: center;
	gap: 18px;
	padding: 12px 32px;
	border-radius: 20px;
	background: linear-gradient(180deg, rgba(245, 184, 46, 0.18) 0%, rgba(15, 23, 42, 0.92) 100%);
	border: 2px solid var(--bc-accent-line);
	font-size: 76px;
	font-weight: 900;
	line-height: 1;
}

.sc-dash {
	color: var(--bc-accent);
}

.sc-toss {
	margin: 8px 0 20px;
	text-align: center;
	font-size: 21px;
	font-weight: 600;
	color: var(--bc-accent-soft);
}

.sc-tables {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 28px;
	padding: 0 44px 32px;
}

.sc-table {
	padding: 18px 20px;
	border-radius: 16px;
	background: rgba(255, 255, 255, 0.035);
	border: 1px solid rgba(255, 255, 255, 0.08);
}

.sc-table h3 {
	margin: 0 0 10px;
	font-size: 20px;
	font-weight: 700;
	letter-spacing: 0.06em;
	text-transform: uppercase;
	color: var(--bc-accent-soft);
}

.sc-table table {
	width: 100%;
	border-collapse: collapse;
	font-size: 21px;
}

.sc-table th,
.sc-table td {
	padding: 9px 8px;
	text-align: center;
	border-bottom: 1px solid rgba(148, 163, 184, 0.16);
}

.sc-table tr:last-child td {
	border-bottom: none;
}

.sc-table th {
	font-size: 14px;
	font-weight: 700;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--bc-muted);
}

.sc-name {
	text-align: left !important;
	font-weight: 700;
	color: #f8fafc;
}

.sc-empty {
	color: var(--bc-muted);
	font-style: italic;
}

.sc-result {
	margin: 0 44px 30px;
	padding: 12px 20px;
	border-radius: 12px;
	background: rgba(245, 184, 46, 0.16);
	border: 1px solid var(--bc-accent-line);
	text-align: center;
	font-size: 24px;
	font-weight: 800;
	color: var(--bc-accent-soft);
}
</style>
