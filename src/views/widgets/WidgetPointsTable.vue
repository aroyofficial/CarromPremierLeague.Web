<template>
	<section class="bc-card pt-panel">
		<header class="bc-topbar">
			<div class="bc-eyebrow">
				<span class="bc-league-pill">CPL</span>
				<span>{{ seasonName || "Season" }}</span>
				<span class="bc-dot"></span>
				<span>Standings</span>
			</div>
			<span class="bc-badge is-gold">Points Table</span>
		</header>

		<div v-if="table.winner_name" class="pt-champion">
			<span class="pt-crown">CHAMPIONS</span>
			<strong>{{ table.winner_name }}</strong>
		</div>

		<div class="pt-body">
			<div class="pt-head-row">
				<span class="is-center">#</span>
				<span>Team</span>
				<span class="is-center">P</span>
				<span class="is-center">W</span>
				<span class="is-center">D</span>
				<span class="is-center">Net</span>
				<span class="is-center">Pts</span>
			</div>

			<div
				v-for="(row, index) in rows"
				:key="row.team_id"
				class="pt-row bc-rise"
				:class="{ 'is-leader': index === 0, 'is-qual': index < qualifierCut }"
				:style="{ '--i': index }"
			>
				<span class="pt-rank">{{ row.rank || index + 1 }}</span>
				<div class="pt-team">
					<span class="bc-crest" :class="rows.length > 8 ? 'is-sm' : 'is-md'">
						<BroadcastPicture :src="row.logo_url" :name="row.team_name" />
					</span>
					<span class="pt-team-name">{{ row.team_name }}</span>
				</div>
				<span class="is-center">{{ row.matches_played }}</span>
				<span class="is-center">{{ row.wins }}</span>
				<span class="is-center">{{ row.draws || 0 }}</span>
				<span class="is-center" :class="netTone(row.net_points)">{{ signedNet(row.net_points) }}</span>
				<span class="pt-pts">{{ row.points }}</span>
			</div>

			<p v-if="!rows.length" class="pt-empty">Teams for this season will appear here once assigned.</p>
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
const table = computed(() => props.snapshot?.points_table || { standings: [] });
const rows = computed(() => (table.value.standings || []).slice(0, 10));
const qualifierCut = computed(() => (rows.value.length >= 4 ? 3 : 2));

const signedNet = (val) => {
	const num = Number(val || 0);
	return num > 0 ? `+${num}` : `${num}`;
};

const netTone = (val) => {
	const num = Number(val || 0);
	if (num > 0) return "is-pos";
	if (num < 0) return "is-neg";
	return "";
};
</script>

<style scoped>
.pt-champion {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 14px;
	margin: 22px 40px 0;
	padding: 12px 24px;
	border-radius: 14px;
	background: linear-gradient(90deg, rgba(245, 184, 46, 0.14) 0%, rgba(245, 184, 46, 0.3) 50%, rgba(245, 184, 46, 0.14) 100%);
	border: 1px solid var(--bc-accent-line);
	font-size: 24px;
	color: var(--bc-accent-soft);
}

.pt-crown {
	padding: 3px 10px;
	border-radius: 6px;
	background: var(--bc-accent);
	color: var(--bc-accent-ink);
	font-size: 13px;
	font-weight: 900;
	letter-spacing: 0.1em;
}

.pt-body {
	padding: 24px 40px 34px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.pt-head-row,
.pt-row {
	display: grid;
	grid-template-columns: 64px minmax(0, 1fr) 86px 86px 86px 110px 110px;
	align-items: center;
	gap: 12px;
}

.pt-head-row {
	padding: 0 18px 8px;
	font-size: 15px;
	font-weight: 700;
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: var(--bc-muted);
}

.pt-row {
	padding: 9px 18px;
	border-radius: 14px;
	background: rgba(255, 255, 255, 0.04);
	border: 1px solid rgba(255, 255, 255, 0.07);
	font-size: 22px;
	font-weight: 700;
}

.pt-row.is-qual {
	border-left: 4px solid var(--bc-accent);
}

.pt-row.is-leader {
	background: linear-gradient(90deg, rgba(245, 184, 46, 0.16) 0%, rgba(255, 255, 255, 0.045) 70%);
	border-color: var(--bc-accent-line);
}

.pt-rank {
	display: inline-grid;
	place-items: center;
	width: 38px;
	height: 38px;
	margin: 0 auto;
	border-radius: 10px;
	background: rgba(255, 255, 255, 0.08);
	font-size: 19px;
	font-weight: 800;
}

.pt-row.is-leader .pt-rank {
	background: var(--bc-accent);
	color: var(--bc-accent-ink);
}

.pt-team {
	display: flex;
	align-items: center;
	gap: 16px;
	min-width: 0;
}

.pt-team-name {
	font-size: 25px;
	font-weight: 800;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.is-center {
	text-align: center;
}

.is-pos {
	color: #86efac;
}

.is-neg {
	color: #fca5a5;
}

.pt-pts {
	display: inline-grid;
	place-items: center;
	min-width: 64px;
	padding: 5px 14px;
	margin: 0 auto;
	border-radius: 10px;
	background: rgba(245, 184, 46, 0.18);
	border: 1px solid var(--bc-accent-line);
	font-size: 24px;
	font-weight: 900;
	color: var(--bc-accent-soft);
}

.pt-empty {
	margin: 24px 0;
	text-align: center;
	font-size: 22px;
	color: var(--bc-muted);
}
</style>
