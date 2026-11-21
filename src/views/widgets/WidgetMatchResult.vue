<template>
	<section class="bc-card res-panel">
		<header class="bc-topbar">
			<div class="bc-eyebrow">
				<span class="bc-league-pill">CPL</span>
				<span v-if="seasonName">{{ seasonName }}</span>
				<span v-if="seasonName" class="bc-dot"></span>
				<span>{{ matchLabel(match) }}</span>
			</div>
			<span class="bc-badge is-final">{{ match.golden_strike ? "Golden Strike Result" : "Full Time" }}</span>
		</header>

		<div class="res-hero">
			<div class="res-team" :class="{ 'is-winner': match.outcome === 1 }">
				<div class="bc-crest is-lg bc-pop" style="--i: 0">
					<BroadcastPicture :src="match.team1?.logo_url" :name="match.team1?.name" />
				</div>
				<div class="res-team-copy">
					<h2>{{ match.team1?.name || "TBD" }}</h2>
					<div class="bc-pips" aria-hidden="true">
						<span v-for="(lit, idx) in coinPips(totals.team1)" :key="idx" class="bc-pip" :class="{ 'is-lit': lit }"></span>
					</div>
				</div>
			</div>

			<div class="res-score-box">
				<div class="res-score">
					<span>{{ totals.team1 }}</span>
					<span class="res-dash">–</span>
					<span>{{ totals.team2 }}</span>
				</div>
			</div>

			<div class="res-team is-away" :class="{ 'is-winner': match.outcome === 2 }">
				<div class="res-team-copy">
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

		<div v-if="resultLine(match)" class="res-banner bc-rise" style="--i: 3">
			<span>{{ resultLine(match) }}</span>
		</div>

		<div class="res-columns">
			<div v-for="side in sides" :key="side.key" class="res-col">
				<h3>{{ side.team?.name || "TBD" }}</h3>
				<div class="res-rows">
					<div
						v-for="(player, idx) in side.players"
						:key="player.player_id"
						class="res-player-row bc-rise"
						:style="{ '--i': idx + 4 }"
					>
						<div class="res-player-id">
							<span class="bc-avatar">
								<BroadcastPicture :src="player.avatar_url" :name="player.name" shape="avatar" />
							</span>
							<span class="res-player-name">{{ player.name }}</span>
						</div>
						<div class="res-stats">
							<span><strong>{{ player.coins_pocketed }}</strong> Coins</span>
							<span v-if="player.opponent_coins_pocketed" class="is-opp">+{{ player.opponent_coins_pocketed }} Opp</span>
							<span class="is-muted">{{ fineCoins(player) }} Fines</span>
							<span class="is-muted">{{ player.strikers_pocketed }} Str</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>
</template>

<script setup>
import { computed } from "vue";
import { coinPips, fineCoins, matchLabel, resultLine, scorecardTotals } from "@/utils/widgetScore";
import BroadcastPicture from "./BroadcastPicture.vue";

const props = defineProps({
	bundle: { type: Object, required: true },
	seasonName: { type: String, default: "" },
});

const match = computed(() => props.bundle?.match || {});
const players = computed(() => props.bundle?.players || { team1: [], team2: [] });
const totals = computed(() => scorecardTotals(players.value));
const sides = computed(() => [
	{ key: "team1", team: match.value.team1, players: players.value.team1 || [] },
	{ key: "team2", team: match.value.team2, players: players.value.team2 || [] },
]);
</script>

<style scoped>
.res-hero {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
	align-items: center;
	gap: 28px;
	padding: 32px 44px 24px;
}

.res-team {
	display: flex;
	align-items: center;
	gap: 20px;
}

.res-team.is-away {
	justify-content: flex-end;
	text-align: right;
}

.res-team-copy {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.res-team.is-away .res-team-copy {
	align-items: flex-end;
}

.res-team h2 {
	margin: 0;
	font-size: 40px;
	font-weight: 800;
	line-height: 1.1;
}

.res-team.is-winner h2 {
	color: var(--bc-accent-soft);
}

.res-score-box {
	padding: 14px 36px;
	border-radius: 20px;
	background: linear-gradient(180deg, rgba(245, 184, 46, 0.2) 0%, rgba(15, 23, 42, 0.92) 100%);
	border: 2px solid var(--bc-accent-line);
}

.res-score {
	display: flex;
	align-items: center;
	gap: 18px;
	font-size: 76px;
	font-weight: 900;
	line-height: 1;
}

.res-dash {
	color: var(--bc-accent);
}

.res-banner {
	margin: 0 44px 24px;
	padding: 12px 24px;
	border-radius: 14px;
	background: linear-gradient(90deg, rgba(245, 184, 46, 0.14) 0%, rgba(245, 184, 46, 0.26) 50%, rgba(245, 184, 46, 0.14) 100%);
	border: 1px solid var(--bc-accent-line);
	text-align: center;
	font-size: 26px;
	font-weight: 800;
	letter-spacing: 0.03em;
	color: var(--bc-accent-soft);
}

.res-columns {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 28px;
	padding: 0 44px 36px;
}

.res-col h3 {
	margin: 0 0 12px;
	font-size: 20px;
	font-weight: 700;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--bc-muted);
}

.res-rows {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.res-player-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	padding: 12px 18px;
	border-radius: 14px;
	background: rgba(255, 255, 255, 0.045);
	border: 1px solid rgba(255, 255, 255, 0.08);
}

.res-player-id {
	display: flex;
	align-items: center;
	gap: 12px;
}

.res-player-name {
	font-size: 22px;
	font-weight: 700;
}

.res-stats {
	display: flex;
	align-items: center;
	gap: 14px;
	font-size: 18px;
	font-weight: 600;
	color: var(--bc-accent-soft);
}

.res-stats strong {
	font-size: 22px;
	font-weight: 800;
	color: #ffffff;
}

.res-stats .is-opp {
	color: #86efac;
}

.res-stats .is-muted {
	color: var(--bc-sub);
}
</style>
