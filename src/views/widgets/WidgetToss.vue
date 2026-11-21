<template>
	<section class="toss-panel">
		<span class="toss-label">{{ matchLabel(match) }} · Toss</span>
		<div class="toss-teams">
			<div class="toss-team" :class="{ 'is-winner': winner === 'team1' }">
				<img v-if="match.team1?.logo_url" class="toss-logo" :src="match.team1.logo_url" alt="" />
				<h2>{{ match.team1?.name || "TBD" }}</h2>
			</div>
			<span class="toss-vs">vs</span>
			<div class="toss-team" :class="{ 'is-winner': winner === 'team2' }">
				<img v-if="match.team2?.logo_url" class="toss-logo" :src="match.team2.logo_url" alt="" />
				<h2>{{ match.team2?.name || "TBD" }}</h2>
			</div>
		</div>
		<p class="toss-line">{{ tossLine(match) }}</p>
	</section>
</template>

<script setup>
import { computed } from "vue";
import { TossOutcome } from "@/utils/constants";
import { matchLabel, tossLine } from "@/utils/widgetScore";

const props = defineProps({
	snapshot: { type: Object, required: true },
});

const match = computed(() => props.snapshot.match || {});
const winner = computed(() => {
	if (match.value.toss_outcome === TossOutcome.Team1Won) return "team1";
	if (match.value.toss_outcome === TossOutcome.Team2Won) return "team2";
	return null;
});
</script>

<style scoped>
.toss-panel {
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	width: 1400px;
	padding: 56px 64px;
	border-radius: 24px;
	text-align: center;
	background: rgba(8, 14, 28, 0.86);
	box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
}

.toss-label {
	font-size: 28px;
	font-weight: 600;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: #cbd5e1;
}

.toss-teams {
	display: grid;
	grid-template-columns: 1fr auto 1fr;
	align-items: center;
	gap: 32px;
	margin: 40px 0;
}

.toss-team {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 16px;
	padding: 24px;
	border-radius: 18px;
	opacity: 0.6;
	transition: opacity 0.3s ease;
}

.toss-team.is-winner {
	opacity: 1;
	background: rgba(250, 204, 21, 0.14);
	box-shadow: inset 0 0 0 3px #facc15;
}

.toss-team h2 {
	margin: 0;
	font-size: 56px;
	font-weight: 800;
}

.toss-logo {
	width: 120px;
	height: 120px;
	object-fit: contain;
}

.toss-vs {
	font-size: 34px;
	font-weight: 600;
	color: #94a3b8;
}

.toss-line {
	margin: 0;
	font-size: 40px;
	font-weight: 700;
	color: #facc15;
}
</style>
