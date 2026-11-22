<template>
	<section class="bc-card tb-panel">
		<header class="bc-topbar">
			<div class="bc-eyebrow">
				<span class="bc-league-pill">CPL</span>
				<span>{{ seasonName || "Season" }}</span>
				<span class="bc-dot"></span>
				<span>Tie-Breakers</span>
			</div>
			<span class="bc-badge is-gold">Standings</span>
		</header>

		<div class="tb-body">
			<article v-for="(group, gIndex) in groups" :key="`${group.first_place}-${group.last_place}`" class="tb-group bc-rise" :style="{ '--i': gIndex }">
				<header class="tb-group-head">
					<h3>
						Places {{ group.first_place }}<template v-if="group.last_place !== group.first_place">–{{ group.last_place }}</template>
						<span class="tb-level">level on {{ group.teams[0]?.points }} pts</span>
					</h3>
					<span class="bc-badge" :class="statusTone(group.status)">{{ statusText(group.status) }}</span>
				</header>

				<div class="tb-rows">
					<div v-for="team in group.teams" :key="team.team_id" class="tb-row">
						<span class="tb-rank">{{ team.rank }}</span>
						<div class="tb-team">
							<span class="bc-crest is-sm">
								<BroadcastPicture :src="team.team?.logo_url" :name="team.team?.name" />
							</span>
							<span class="tb-name">{{ team.team?.name || "TBD" }}</span>
						</div>
						<span class="tb-stat">
							{{ signed(team.net_points) }}
							<small>net</small>
						</span>
						<span class="tb-stat">{{ team.head_to_head_wins }}<small>h2h</small></span>
						<span class="tb-stat">{{ team.golden_strike_wins }}<small>GS</small></span>
					</div>
				</div>

				<ul class="tb-pairs">
					<li v-for="(pair, pIndex) in group.pairs" :key="pIndex" :class="pairTone(pair.status)">
						<span class="tb-pair-teams">{{ pair.upper?.name || "TBD" }} <em>over</em> {{ pair.lower?.name || "TBD" }}</span>
						<span class="tb-pair-why">{{ pairText(pair) }}</span>
					</li>
				</ul>

				<ul v-if="group.golden_strikes?.length" class="tb-strikes">
					<li v-for="strike in group.golden_strikes" :key="strike.match_id">
						<span class="tb-strike-tag">Golden Strike</span>
						<span>{{ strike.team1?.name || "TBD" }} vs {{ strike.team2?.name || "TBD" }}</span>
						<span class="tb-strike-result">{{ strikeText(strike) }}</span>
					</li>
				</ul>
			</article>
		</div>
	</section>
</template>

<script setup>
import { computed } from "vue";
import BroadcastPicture from "./BroadcastPicture.vue";

const props = defineProps({
	snapshot: { type: Object, required: true },
});

const seasonName = computed(() => props.snapshot?.season?.name || "");
const groups = computed(() => (props.snapshot?.tie_breakers?.groups || []).slice(0, 4));

const signed = (value) => {
	const num = Number(value || 0);
	return num > 0 ? `+${num}` : `${num}`;
};

const BREAKER_TEXT = {
	net_coins: "Separated on net coins",
	head_to_head: "Separated on head-to-head",
	golden_strike: "Separated by Golden Strike",
};

const pairText = (pair) => {
	if (pair.decided_by) return BREAKER_TEXT[pair.decided_by] || "Separated";
	if (pair.status === "golden_strike_pending") return "Level on every breaker · Golden Strike being played";
	return "Level on every breaker · Golden Strike to be scheduled";
};

const pairTone = (status) => (status === "decided" ? "is-decided" : "is-open");

const statusText = (status) => {
	if (status === "decided") return "Decided";
	if (status === "golden_strike_pending") return "Golden Strike";
	return "Golden Strike due";
};

const statusTone = (status) => (status === "decided" ? "is-gold" : "is-live");

const strikeText = (strike) => {
	if (strike.status === 3) return strike.winner ? `${strike.winner.name} won` : "Tied";
	if (strike.status === 2) return "LIVE";
	return "Scheduled";
};
</script>

<style scoped>
.tb-panel {
	width: 1460px;
}

.tb-body {
	display: grid;
	gap: 18px;
	padding: 24px 40px 34px;
}

.tb-group {
	padding: 18px 22px;
	border-radius: 16px;
	background: rgba(255, 255, 255, 0.04);
	border: 1px solid rgba(255, 255, 255, 0.08);
}

.tb-group-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	margin-bottom: 10px;
}

.tb-group-head h3 {
	margin: 0;
	font-size: 26px;
	font-weight: 800;
}

.tb-level {
	margin-left: 14px;
	font-size: 17px;
	font-weight: 600;
	color: var(--bc-muted);
}

.tb-rows {
	display: grid;
	gap: 6px;
}

.tb-row {
	display: grid;
	grid-template-columns: 56px minmax(0, 1fr) 120px 110px 110px;
	align-items: center;
	gap: 12px;
	padding: 6px 14px;
	border-radius: 12px;
	background: rgba(255, 255, 255, 0.03);
	font-size: 20px;
	font-weight: 700;
}

.tb-rank {
	font-size: 20px;
	font-weight: 900;
	color: var(--bc-accent-soft);
}

.tb-team {
	display: flex;
	align-items: center;
	gap: 12px;
	min-width: 0;
}

.tb-name {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.tb-stat {
	text-align: center;
}

.tb-stat small {
	display: block;
	font-size: 11px;
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: var(--bc-muted);
}

.tb-pairs,
.tb-strikes {
	list-style: none;
	margin: 12px 0 0;
	padding: 0;
	display: grid;
	gap: 6px;
}

.tb-pairs li,
.tb-strikes li {
	display: flex;
	align-items: baseline;
	gap: 12px;
	font-size: 18px;
}

.tb-pair-teams em {
	font-style: normal;
	color: var(--bc-muted);
	font-weight: 500;
}

.tb-pair-why {
	margin-left: auto;
	color: var(--bc-muted);
	font-size: 16px;
}

.tb-pairs li.is-decided .tb-pair-why {
	color: var(--bc-accent-soft);
}

.tb-pairs li.is-open .tb-pair-why {
	color: #fca5a5;
}

.tb-strike-tag {
	padding: 2px 8px;
	border-radius: 6px;
	background: var(--bc-accent);
	color: var(--bc-accent-ink);
	font-size: 12px;
	font-weight: 900;
	letter-spacing: 0.08em;
	text-transform: uppercase;
}

.tb-strike-result {
	margin-left: auto;
	font-weight: 800;
	color: var(--bc-accent-soft);
}
</style>
