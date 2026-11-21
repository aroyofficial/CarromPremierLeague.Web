<template>
	<section class="bc-lower-third toss-panel">
		<header class="toss-head">
			<div class="bc-eyebrow">
				<span class="bc-league-pill">CPL</span>
				<span v-if="seasonName">{{ seasonName }}</span>
				<span v-if="seasonName" class="bc-dot"></span>
				<span class="toss-label">{{ matchLabel(match) }} · Coin Toss</span>
			</div>
			<span class="bc-badge is-gold">{{ winner ? "Toss Official" : "Awaiting Toss" }}</span>
		</header>

		<div class="toss-teams">
			<div class="toss-team" :class="{ 'is-winner': winner === 'team1', 'is-dimmed': winner === 'team2' }">
				<div class="bc-crest">
					<BroadcastPicture :src="match.team1?.logo_url" :name="match.team1?.name" />
				</div>
				<div class="toss-team-copy">
					<h2>{{ match.team1?.name || "TBD" }}</h2>
					<span v-if="winner === 'team1'" class="toss-role">Breaking First</span>
				</div>
			</div>

			<div class="toss-coin-emblem" aria-hidden="true">
				<div class="toss-coin-inner">TOSS</div>
			</div>

			<div class="toss-team is-away" :class="{ 'is-winner': winner === 'team2', 'is-dimmed': winner === 'team1' }">
				<div class="toss-team-copy">
					<h2>{{ match.team2?.name || "TBD" }}</h2>
					<span v-if="winner === 'team2'" class="toss-role">Breaking First</span>
				</div>
				<div class="bc-crest">
					<BroadcastPicture :src="match.team2?.logo_url" :name="match.team2?.name" />
				</div>
			</div>
		</div>

		<p class="toss-line">{{ tossLine(match) }}</p>
	</section>
</template>

<script setup>
import { computed } from "vue";
import { matchLabel, tossLine, tossWinnerSide } from "@/utils/widgetScore";
import BroadcastPicture from "./BroadcastPicture.vue";

const props = defineProps({
	snapshot: { type: Object, default: null },
	bundle: { type: Object, default: null },
	seasonName: { type: String, default: "" },
});

const match = computed(() => props.bundle?.match || props.snapshot?.match || {});
const winner = computed(() => tossWinnerSide(match.value));
</script>

<style scoped>
.toss-panel {
	width: 1440px;
}

.toss-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 13px 32px;
	background: rgba(255, 255, 255, 0.035);
	border-bottom: 1px solid var(--bc-rim-soft);
}

.toss-teams {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
	align-items: center;
	gap: 28px;
	padding: 20px 32px 14px;
}

.toss-team {
	display: flex;
	align-items: center;
	gap: 18px;
	padding: 14px 20px;
	border-radius: 18px;
	border: 1px solid transparent;
	transition: opacity 0.3s ease, background-color 0.3s ease;
}

.toss-team.is-away {
	justify-content: flex-end;
	text-align: right;
}

.toss-team.is-dimmed {
	opacity: 0.55;
}

.toss-team.is-winner {
	background: linear-gradient(135deg, rgba(245, 184, 46, 0.18) 0%, rgba(245, 184, 46, 0.05) 100%);
	border-color: var(--bc-accent-line);
	box-shadow: 0 0 28px rgba(245, 184, 46, 0.16);
}

.toss-team-copy {
	display: flex;
	flex-direction: column;
	gap: 4px;
	min-width: 0;
}

.toss-team h2 {
	margin: 0;
	font-size: 36px;
	font-weight: 800;
	line-height: 1.1;
}

.toss-role {
	font-size: 15px;
	font-weight: 700;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--bc-accent-soft);
}

.toss-coin-emblem {
	display: grid;
	place-items: center;
	width: 74px;
	height: 74px;
	border-radius: 50%;
	background: radial-gradient(circle at 35% 30%, #ffe699 0%, #f5b82e 55%, #b7791f 100%);
	box-shadow: 0 0 26px var(--bc-accent-glow), inset 0 2px 4px rgba(255, 255, 255, 0.65);
}

.toss-coin-inner {
	display: grid;
	place-items: center;
	width: 58px;
	height: 58px;
	border-radius: 50%;
	border: 2px dashed rgba(9, 16, 32, 0.55);
	font-size: 14px;
	font-weight: 900;
	letter-spacing: 0.08em;
	color: #091020;
}

.toss-line {
	margin: 0;
	padding: 0 32px 18px;
	text-align: center;
	font-size: 26px;
	font-weight: 800;
	letter-spacing: 0.02em;
	color: var(--bc-accent-soft);
}
</style>
