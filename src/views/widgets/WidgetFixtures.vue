<template>
	<section class="fx-panel">
		<header class="fx-head">
			<span class="fx-season">{{ snapshot.season?.name || "Season" }}</span>
			<span class="fx-title">Fixtures</span>
		</header>
		<table>
			<thead>
				<tr>
					<th>Date</th>
					<th>Match</th>
					<th>Fixture</th>
					<th>Status</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="match in rows" :key="match.id" :class="{ 'is-live': isLive(match), 'is-played': isPlayed(match) }">
					<td>{{ dateLabel(match.scheduled_date) }}</td>
					<td>{{ matchLabel(match) }}</td>
					<td class="fx-fixture">
						<span>{{ match.team1?.name || "TBD" }}</span>
						<span class="fx-vs">vs</span>
						<span>{{ match.team2?.name || "TBD" }}</span>
					</td>
					<td>
						<span class="fx-status">{{ resultLine(match) || statusLabel(match) }}</span>
					</td>
				</tr>
				<tr v-if="!rows.length">
					<td colspan="4" class="fx-empty">No fixtures scheduled yet.</td>
				</tr>
			</tbody>
		</table>
	</section>
</template>

<script setup>
import { computed } from "vue";
import dayjs from "@/plugins/dayjs";
import { fixtureWindow, isLive, isPlayed, matchLabel, resultLine, statusLabel } from "@/utils/widgetScore";

const props = defineProps({
	snapshot: { type: Object, required: true },
});

const rows = computed(() => fixtureWindow(props.snapshot.matches || [], 12));

const dateLabel = (value) => {
	const date = value ? dayjs(value) : null;
	return date?.isValid() ? date.format("ddd D MMM") : "TBC";
};
</script>

<style scoped>
.fx-panel {
	position: absolute;
	left: 80px;
	top: 60px;
	width: 1760px;
	padding: 36px 44px;
	border-radius: 20px;
	background: rgba(8, 14, 28, 0.86);
	box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
}

.fx-head {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	margin-bottom: 20px;
}

.fx-season {
	font-size: 26px;
	font-weight: 600;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: #cbd5e1;
}

.fx-title {
	font-size: 44px;
	font-weight: 800;
}

table {
	width: 100%;
	border-collapse: collapse;
	font-size: 26px;
	font-variant-numeric: tabular-nums;
}

th,
td {
	padding: 12px 14px;
	text-align: left;
	border-bottom: 1px solid rgba(148, 163, 184, 0.25);
}

th {
	font-size: 20px;
	font-weight: 600;
	text-transform: uppercase;
	color: #94a3b8;
}

tr.is-live td {
	color: #fca5a5;
	font-weight: 700;
}

tr.is-played td {
	color: #cbd5e1;
}

.fx-fixture {
	font-weight: 600;
}

.fx-vs {
	margin: 0 14px;
	color: #94a3b8;
	font-weight: 400;
}

.fx-status {
	color: #facc15;
	font-weight: 600;
}

.fx-empty {
	color: #94a3b8;
	font-style: italic;
	text-align: center;
}
</style>
