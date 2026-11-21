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
			<div class="fx-head" aria-hidden="true">
				<span>Date</span>
				<span>Match</span>
				<span class="fx-head-fixture">Fixture</span>
				<span>Status</span>
			</div>

			<div
				v-for="(match, index) in rows"
				:key="match.id"
				class="fx-row bc-rise"
				:class="{ 'is-live': isLive(match), 'is-played': isPlayed(match), 'is-next': match.id === nextOpenId }"
				:style="{ '--i': index }"
			>
				<span class="fx-date">{{ dateLabel(match.scheduled_date) }}</span>
				<span class="fx-order">{{ matchLabel(match) }}</span>

				<div class="fx-fixture">
					<div class="fx-side is-home" :class="{ 'is-winner': match.outcome === 1 }">
						<span class="fx-name">{{ match.team1?.name || "TBD" }}</span>
						<span class="bc-crest is-sm">
							<BroadcastPicture :src="match.team1?.logo_url" :name="match.team1?.name" />
						</span>
					</div>
					<span class="fx-vs">vs</span>
					<div class="fx-side is-away" :class="{ 'is-winner': match.outcome === 2 }">
						<span class="bc-crest is-sm">
							<BroadcastPicture :src="match.team2?.logo_url" :name="match.team2?.name" />
						</span>
						<span class="fx-name">{{ match.team2?.name || "TBD" }}</span>
					</div>
				</div>

				<div class="fx-state">
					<span v-if="isLive(match)" class="bc-badge is-live">
						<span class="bc-live-dot"></span>Live Now
					</span>
					<span v-else-if="match.id === nextOpenId" class="bc-badge is-gold">Up Next</span>
					<span v-else class="fx-status">{{ resultLine(match) || statusLabel(match) }}</span>
				</div>
			</div>

			<p v-if="!rows.length" class="fx-empty">No fixtures scheduled yet.</p>
		</div>
	</section>
</template>

<script setup>
import { computed } from "vue";
import dayjs from "@/plugins/dayjs";
import { fixtureWindow, isLive, isPlayed, matchLabel, resultLine, statusLabel } from "@/utils/widgetScore";
import BroadcastPicture from "./BroadcastPicture.vue";

const props = defineProps({
	snapshot: { type: Object, required: true },
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
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 20px 40px 30px;
}

/* One shared grid for the header and every row keeps the columns aligned. */
.fx-head,
.fx-row {
	display: grid;
	grid-template-columns: 138px 112px minmax(0, 1fr) 250px;
	align-items: center;
	column-gap: 18px;
}

.fx-head {
	padding: 0 18px 4px;
	font-size: 14px;
	font-weight: 700;
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: var(--bc-muted);
}

.fx-head-fixture {
	text-align: center;
}

.fx-row {
	min-height: 66px;
	padding: 9px 18px;
	border-radius: 14px;
	background: rgba(255, 255, 255, 0.04);
	border: 1px solid rgba(255, 255, 255, 0.07);
	font-size: 21px;
}

.fx-row.is-next {
	background: rgba(245, 184, 46, 0.11);
	border-color: var(--bc-accent-line);
}

.fx-row.is-live {
	background: rgba(239, 68, 68, 0.14);
	border-color: rgba(248, 113, 113, 0.45);
}

.fx-date {
	color: var(--bc-sub);
	font-weight: 600;
}

.fx-order {
	font-weight: 700;
	color: var(--bc-accent-soft);
}

/* Both teams get an equal share of the row, and a long name wraps inside its own half. */
.fx-fixture {
	display: grid;
	grid-template-columns: minmax(0, 1fr) 36px minmax(0, 1fr);
	align-items: center;
	column-gap: 12px;
	min-width: 0;
}

.fx-side {
	display: flex;
	align-items: center;
	gap: 12px;
	min-width: 0;
}

.fx-side.is-home {
	justify-content: flex-end;
	text-align: right;
}

.fx-side.is-away {
	justify-content: flex-start;
	text-align: left;
}

.fx-name {
	min-width: 0;
	font-weight: 700;
	line-height: 1.15;
	overflow-wrap: anywhere;
	text-wrap: balance;
}

.fx-side.is-winner .fx-name {
	color: var(--bc-accent-soft);
}

.fx-vs {
	text-align: center;
	color: var(--bc-muted);
	font-size: 15px;
	font-weight: 600;
	text-transform: uppercase;
}

.fx-state {
	min-width: 0;
}

.fx-status {
	display: block;
	color: var(--bc-accent-soft);
	font-size: 19px;
	font-weight: 700;
	line-height: 1.2;
	overflow-wrap: anywhere;
	text-wrap: balance;
}

.fx-empty {
	margin: 28px 0;
	color: var(--bc-muted);
	font-size: 22px;
	font-style: italic;
	text-align: center;
}
</style>
