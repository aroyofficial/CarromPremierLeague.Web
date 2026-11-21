<template>
	<section class="bc-card fx-panel">
		<header class="bc-topbar">
			<div class="bc-eyebrow">
				<span class="bc-league-pill">CPL</span>
				<span class="fx-season">{{ snapshot.season?.name || "Season" }}</span>
			</div>
			<span class="bc-badge is-gold">Fixtures &amp; Results</span>
		</header>

		<div class="fx-body">
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
					<tr
						v-for="match in rows"
						:key="match.id"
						:class="{ 'is-live': isLive(match), 'is-played': isPlayed(match), 'is-next': match.id === nextOpenId }"
					>
						<td class="fx-date">{{ dateLabel(match.scheduled_date) }}</td>
						<td class="fx-order">{{ matchLabel(match) }}</td>
						<td class="fx-fixture">
							<span class="fx-club">
								<span class="bc-crest is-sm">
									<img v-if="match.team1?.logo_url" :src="match.team1.logo_url" alt="" />
									<span v-else class="bc-crest-initials">{{ teamInitials(match.team1?.name) }}</span>
								</span>
								<span>{{ match.team1?.name || "TBD" }}</span>
							</span>
							<span class="fx-vs">vs</span>
							<span class="fx-club">
								<span class="bc-crest is-sm">
									<img v-if="match.team2?.logo_url" :src="match.team2.logo_url" alt="" />
									<span v-else class="bc-crest-initials">{{ teamInitials(match.team2?.name) }}</span>
								</span>
								<span>{{ match.team2?.name || "TBD" }}</span>
							</span>
						</td>
						<td>
							<span v-if="isLive(match)" class="bc-badge is-live">
								<span class="bc-live-dot"></span>Live Now
							</span>
							<span v-else-if="match.id === nextOpenId" class="bc-badge is-gold">Up Next</span>
							<span v-else class="fx-status">{{ resultLine(match) || statusLabel(match) }}</span>
						</td>
					</tr>
					<tr v-if="!rows.length">
						<td colspan="4" class="fx-empty">No fixtures scheduled yet.</td>
					</tr>
				</tbody>
			</table>
		</div>

		<div v-if="progress != null" class="bc-timer-track">
			<div class="bc-timer-fill" :style="{ width: `${Math.round((1 - progress) * 100)}%` }"></div>
		</div>
	</section>
</template>

<script setup>
import { computed } from "vue";
import dayjs from "@/plugins/dayjs";
import { fixtureWindow, isLive, isPlayed, matchLabel, resultLine, statusLabel, teamInitials } from "@/utils/widgetScore";

const props = defineProps({
	snapshot: { type: Object, required: true },
	progress: { type: Number, default: null },
});

const rows = computed(() => fixtureWindow(props.snapshot?.matches || [], 8));
const nextOpenId = computed(() => (props.snapshot?.matches || []).find((m) => !isPlayed(m) && !isLive(m))?.id ?? null);

const dateLabel = (value) => {
	const date = value ? dayjs(value) : null;
	return date?.isValid() ? date.format("ddd D MMM") : "TBC";
};
</script>

<style scoped>
.fx-body {
	padding: 20px 40px 30px;
}

table {
	width: 100%;
	border-collapse: separate;
	border-spacing: 0 8px;
	font-size: 21px;
}

th {
	padding: 0 14px 6px;
	text-align: left;
	font-size: 14px;
	font-weight: 700;
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: var(--bc-muted);
}

tbody tr {
	background: rgba(255, 255, 255, 0.04);
}

tbody td {
	padding: 10px 14px;
	border-top: 1px solid rgba(255, 255, 255, 0.07);
	border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

tbody td:first-child {
	border-left: 1px solid rgba(255, 255, 255, 0.07);
	border-radius: 12px 0 0 12px;
}

tbody td:last-child {
	border-right: 1px solid rgba(255, 255, 255, 0.07);
	border-radius: 0 12px 12px 0;
}

tr.is-next td {
	background: rgba(245, 184, 46, 0.11);
	border-color: var(--bc-accent-line);
}

tr.is-live td {
	background: rgba(239, 68, 68, 0.14);
	border-color: rgba(248, 113, 113, 0.45);
}

.fx-date {
	color: var(--bc-sub);
	font-weight: 600;
	width: 165px;
}

.fx-order {
	font-weight: 700;
	color: var(--bc-accent-soft);
	width: 210px;
}

.fx-fixture {
	display: flex;
	align-items: center;
	gap: 14px;
	font-weight: 700;
}

.fx-club {
	display: inline-flex;
	align-items: center;
	gap: 10px;
}

.fx-vs {
	color: var(--bc-muted);
	font-size: 16px;
	font-weight: 600;
	text-transform: uppercase;
}

.fx-status {
	color: var(--bc-accent-soft);
	font-weight: 700;
}

.fx-empty {
	padding: 28px;
	color: var(--bc-muted);
	font-style: italic;
	text-align: center;
}
</style>
