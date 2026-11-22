<template>
	<section class="bc-card br-panel">
		<header class="bc-topbar">
			<div class="bc-eyebrow">
				<span class="bc-league-pill">CPL</span>
				<span>{{ seasonName || "Season" }}</span>
				<span class="bc-dot"></span>
				<span>{{ eyebrow }}</span>
			</div>
			<span class="bc-badge is-gold">Knockout</span>
		</header>

		<div v-if="champion" class="br-champion">
			<span class="br-crown">CHAMPIONS</span>
			<strong>{{ champion.name }}</strong>
		</div>

		<div class="br-body">
			<div class="br-grid" :class="`is-${format}`">
				<article
					v-for="(slot, index) in slots"
					:key="slot.key"
					class="br-match bc-rise"
					:class="[`area-${slot.key}`, { 'is-final': slot.key === 'final', 'is-live': slot.status === 2 }]"
					:style="{ '--i': index }"
				>
					<header class="br-match-head">
						<span class="br-match-name">{{ slot.label }}</span>
						<span v-if="slot.status === 2" class="br-state is-live">LIVE</span>
						<span v-else-if="slot.status === 3" class="br-state">{{ slot.tied ? "TIED" : "FT" }}</span>
						<span v-else class="br-state is-soon">{{ slot.sides.every((side) => side.team) ? "UP NEXT" : "TBD" }}</span>
					</header>

					<div
						v-for="(side, sideIndex) in slot.sides"
						:key="sideIndex"
						class="br-side"
						:class="{ 'is-tbd': !side.team, 'is-winner': side.is_winner, 'is-out': isOut(slot, side) }"
					>
						<span class="bc-crest is-md">
							<BroadcastPicture v-if="side.team" :src="side.team.logo_url" :name="side.team.name" />
							<span v-else class="br-tbd-mark">?</span>
						</span>
						<span class="br-side-text">
							<span class="br-side-name">{{ side.team ? side.team.name : "TBD" }}</span>
							<span class="br-source">{{ side.source }}</span>
						</span>
					</div>

					<footer v-if="advances[slot.key]" class="br-advance">
						<span v-for="path in advances[slot.key]" :key="path.who">{{ path.who }} &rarr; {{ path.to }}</span>
					</footer>
				</article>
			</div>

			<p v-if="format === 'eliminator'" class="br-note">#1 goes straight to the final.</p>
			<p v-else-if="format === 'full'" class="br-note">
				#1 and #2 play Qualifier 1. The Qualifier 1 loser gets a second chance against the Eliminator winner.
			</p>
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
const knockout = computed(() => props.snapshot?.knockout || {});
const format = computed(() => knockout.value.format || "final");
const slots = computed(() => knockout.value.slots || []);
const champion = computed(() => knockout.value.champion || null);

const eyebrow = computed(() => (champion.value ? "Season Champions" : "Road to the Final"));

// Where the winner (and the loser) of each match goes next.
const ADVANCES = {
	final: {},
	eliminator: {
		eliminator: [{ who: "Winner", to: "Final" }],
	},
	full: {
		qualifier1: [
			{ who: "Winner", to: "Final" },
			{ who: "Loser", to: "Qualifier 2" },
		],
		eliminator: [{ who: "Winner", to: "Qualifier 2" }],
		qualifier2: [{ who: "Winner", to: "Final" }],
	},
};
const advances = computed(() => ADVANCES[format.value] || {});

// A finished match dims the side that went out. Qualifier 1's loser is not out, it plays Qualifier 2.
const isOut = (slot, side) => {
	if (slot.status !== 3 || slot.tied || !side.team || side.is_winner) return false;
	return !(slot.key === "qualifier1" && format.value === "full");
};
</script>

<style scoped>
.br-champion {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 14px;
	margin: 22px 40px 0;
	padding: 12px 24px;
	border-radius: 14px;
	background: linear-gradient(90deg, rgba(245, 184, 46, 0.14) 0%, rgba(245, 184, 46, 0.3) 50%, rgba(245, 184, 46, 0.14) 100%);
	border: 1px solid var(--bc-accent-line);
	font-size: 26px;
	color: var(--bc-accent-soft);
}

.br-crown {
	padding: 3px 10px;
	border-radius: 6px;
	background: var(--bc-accent);
	color: var(--bc-accent-ink);
	font-size: 13px;
	font-weight: 900;
	letter-spacing: 0.1em;
}

.br-body {
	padding: 30px 40px 34px;
	display: flex;
	flex-direction: column;
	gap: 22px;
}

.br-grid {
	display: grid;
	align-items: center;
	gap: 28px 64px;
}

.br-grid.is-final {
	grid-template-columns: minmax(0, 560px);
	grid-template-areas: "final";
	justify-content: center;
}

.br-grid.is-eliminator {
	grid-template-columns: repeat(2, minmax(0, 1fr));
	grid-template-areas: "eliminator final";
}

.br-grid.is-full {
	grid-template-columns: repeat(3, minmax(0, 1fr));
	grid-template-areas:
		"qualifier1 qualifier2 final"
		"eliminator qualifier2 final";
}

.area-qualifier1 { grid-area: qualifier1; }
.area-eliminator { grid-area: eliminator; }
.area-qualifier2 { grid-area: qualifier2; }
.area-final { grid-area: final; }

.br-match {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 14px 16px 16px;
	border-radius: 18px;
	background: rgba(255, 255, 255, 0.045);
	border: 1px solid rgba(255, 255, 255, 0.09);
}

.br-match.is-final {
	background: linear-gradient(160deg, rgba(245, 184, 46, 0.16) 0%, rgba(255, 255, 255, 0.05) 70%);
	border-color: var(--bc-accent-line);
}

.br-match.is-live {
	border-color: rgba(248, 113, 113, 0.7);
	box-shadow: 0 0 26px var(--bc-live-glow);
}

/* A short bar joins each match to the column it feeds. */
.br-grid.is-full .br-match:not(.is-final)::after,
.br-grid.is-eliminator .br-match.area-eliminator::after {
	content: "";
	position: absolute;
	top: 50%;
	left: 100%;
	width: 64px;
	height: 2px;
	background: linear-gradient(90deg, var(--bc-accent-line), transparent);
}

.br-match-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 0 4px 4px;
}

.br-match-name {
	font-size: 20px;
	font-weight: 800;
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: var(--bc-accent-soft);
}

.br-state {
	padding: 2px 10px;
	border-radius: 999px;
	background: rgba(148, 163, 184, 0.18);
	font-size: 14px;
	font-weight: 800;
	letter-spacing: 0.1em;
	color: var(--bc-muted);
}

.br-state.is-live {
	background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
	color: #ffffff;
}

.br-state.is-soon {
	color: var(--bc-ink);
}

.br-side {
	display: flex;
	align-items: center;
	gap: 14px;
	padding: 8px 12px;
	border-radius: 12px;
	background: rgba(255, 255, 255, 0.05);
	border: 1px solid rgba(255, 255, 255, 0.07);
	font-size: 24px;
	font-weight: 800;
	min-width: 0;
}

/* Three columns leave less room for a long team name. */
.br-grid.is-full .br-side {
	gap: 10px;
	padding: 8px 10px;
	font-size: 21px;
}

.br-side.is-winner {
	background: linear-gradient(90deg, rgba(34, 197, 94, 0.22) 0%, rgba(255, 255, 255, 0.05) 80%);
	border-color: rgba(74, 222, 128, 0.5);
}

.br-side.is-out {
	opacity: 0.5;
}

.br-side.is-tbd {
	border-style: dashed;
	color: var(--bc-muted);
}

.br-side-text {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-width: 0;
	line-height: 1.15;
}

.br-side-name {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

/* Where the place comes from: a table place, or the match that feeds it. */
.br-source {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	font-size: 13px;
	font-weight: 800;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--bc-accent-soft);
	opacity: 0.85;
}

.br-tbd-mark {
	display: grid;
	place-items: center;
	width: 100%;
	height: 100%;
	border-radius: 50%;
	border: 2px dashed rgba(255, 255, 255, 0.28);
	font-size: 22px;
	color: var(--bc-muted);
}

.br-advance {
	display: flex;
	flex-wrap: wrap;
	gap: 4px 16px;
	padding: 2px 4px 0;
	font-size: 15px;
	font-weight: 700;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	color: var(--bc-muted);
}

.br-note {
	margin: 0;
	text-align: center;
	font-size: 19px;
	font-weight: 600;
	color: var(--bc-muted);
}
</style>
