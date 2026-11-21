<template>
	<section class="sc-panel">
		<header class="sc-head">
			<span class="sc-label">{{ matchLabel(match) }}</span>
			<span class="sc-status" :class="`is-${statusLabel(match).toLowerCase()}`">{{ statusLabel(match) }}</span>
		</header>

		<div class="sc-teams">
			<div class="sc-team">
				<img v-if="match.team1?.logo_url" class="sc-logo" :src="match.team1.logo_url" alt="" />
				<h2>{{ match.team1?.name || "TBD" }}</h2>
			</div>
			<div class="sc-score">
				<span>{{ totals.team1 }}</span>
				<span class="sc-dash">–</span>
				<span>{{ totals.team2 }}</span>
			</div>
			<div class="sc-team is-away">
				<img v-if="match.team2?.logo_url" class="sc-logo" :src="match.team2.logo_url" alt="" />
				<h2>{{ match.team2?.name || "TBD" }}</h2>
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
							<td class="sc-name">{{ player.name }}</td>
							<td>{{ player.coins_pocketed }}</td>
							<td>{{ player.opponent_coins_pocketed }}</td>
							<td>{{ fineCoins(player) }}</td>
							<td>{{ player.strikers_pocketed }}</td>
						</tr>
						<tr v-if="!side.players.length">
							<td colspan="5" class="sc-empty">No stats yet</td>
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
import { fineCoins, matchLabel, resultLine, scorecardTotals, statusLabel, tossLine } from "@/utils/widgetScore";

const props = defineProps({
	snapshot: { type: Object, required: true },
});

const match = computed(() => props.snapshot.match || {});
const totals = computed(() => scorecardTotals(props.snapshot.players));
const sides = computed(() => [
	{ key: "team1", team: match.value.team1, players: props.snapshot.players?.team1 || [] },
	{ key: "team2", team: match.value.team2, players: props.snapshot.players?.team2 || [] },
]);
</script>

<style scoped>
.sc-panel {
	position: absolute;
	left: 80px;
	top: 60px;
	width: 1760px;
	padding: 36px 44px;
	border-radius: 20px;
	background: rgba(8, 14, 28, 0.86);
	box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
}

.sc-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 18px;
}

.sc-label {
	font-size: 26px;
	font-weight: 600;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: #cbd5e1;
}

.sc-status {
	padding: 6px 18px;
	border-radius: 999px;
	font-size: 22px;
	font-weight: 700;
	background: #334155;
}

.sc-status.is-live {
	background: #dc2626;
}

.sc-status.is-final {
	background: #16a34a;
}

.sc-teams {
	display: grid;
	grid-template-columns: 1fr auto 1fr;
	align-items: center;
	gap: 24px;
}

.sc-team {
	display: flex;
	align-items: center;
	gap: 18px;
}

.sc-team.is-away {
	flex-direction: row-reverse;
	text-align: right;
}

.sc-team h2 {
	margin: 0;
	font-size: 50px;
	font-weight: 800;
	line-height: 1.1;
}

.sc-logo {
	width: 96px;
	height: 96px;
	object-fit: contain;
	flex: none;
}

.sc-score {
	display: flex;
	align-items: center;
	gap: 18px;
	font-size: 120px;
	font-weight: 800;
	font-variant-numeric: tabular-nums;
	line-height: 1;
}

.sc-dash {
	color: #94a3b8;
}

.sc-toss {
	margin: 14px 0 22px;
	text-align: center;
	font-size: 26px;
	color: #e2e8f0;
}

.sc-tables {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 32px;
}

.sc-table h3 {
	margin: 0 0 10px;
	font-size: 28px;
	font-weight: 700;
}

.sc-table table {
	width: 100%;
	border-collapse: collapse;
	font-size: 24px;
	font-variant-numeric: tabular-nums;
}

.sc-table th,
.sc-table td {
	padding: 8px 10px;
	text-align: center;
	border-bottom: 1px solid rgba(148, 163, 184, 0.25);
}

.sc-table th {
	font-size: 19px;
	font-weight: 600;
	text-transform: uppercase;
	color: #94a3b8;
}

.sc-name {
	text-align: left !important;
	font-weight: 600;
}

.sc-empty {
	color: #94a3b8;
	font-style: italic;
}

.sc-result {
	margin: 22px 0 0;
	text-align: center;
	font-size: 30px;
	font-weight: 700;
	color: #facc15;
}
</style>
