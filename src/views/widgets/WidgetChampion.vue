<template>
	<section class="bc-card ch-panel">
		<header class="bc-topbar">
			<div class="bc-eyebrow">
				<span class="bc-league-pill">CPL</span>
				<span>{{ seasonName }}</span>
				<span class="bc-dot"></span>
				<span>The Final</span>
			</div>
			<span class="bc-badge is-gold">Champions</span>
		</header>

		<div class="ch-body">
			<svg class="ch-trophy bc-pop" viewBox="0 0 64 64" aria-hidden="true">
				<path
					d="M18 6h28v4h8c0 10-4 17-12 19-2 4-5 6-8 7v8h8v5H22v-5h8v-8c-3-1-6-3-8-7-8-2-12-9-12-19h8V6Zm-4 8c0 6 2 10 6 12-1-3-2-7-2-12h-4Zm36 0c0 5-1 9-2 12 4-2 6-6 6-12h-4Z"
					fill="currentColor"
				/>
			</svg>
			<p class="ch-kicker bc-rise" style="--i: 1">{{ seasonName }} Champions</p>
			<div class="bc-crest ch-crest bc-pop" style="--i: 2">
				<BroadcastPicture :src="champion.logo_url" :name="champion.name" />
			</div>
			<h1 class="ch-name bc-rise" style="--i: 4">{{ champion.name }}</h1>
			<p v-if="subline" class="ch-sub bc-rise" style="--i: 6">{{ subline }}</p>
		</div>
	</section>
</template>

<script setup>
import { computed } from "vue";
import BroadcastPicture from "./BroadcastPicture.vue";

const props = defineProps({
	snapshot: { type: Object, required: true },
});

const champion = computed(() => props.snapshot?.knockout?.champion || { name: "Champions", logo_url: null });
const seasonName = computed(() => props.snapshot?.season?.name || "Season");

// "Beat Dum Dum Diamonds by 4 coins", taken from the Final's own slot.
const subline = computed(() => {
	const final = (props.snapshot?.knockout?.slots || []).find((slot) => slot.key === "final");
	const winnerId = champion.value.id;
	const loser = (final?.sides || []).map((side) => side.team).find((team) => team && team.id !== winnerId);
	if (!loser) return "Winners of the Final";
	const margin = final.net_points != null ? ` by ${final.net_points} coins` : "";
	return `Beat ${loser.name} in the Final${margin}`;
});
</script>

<style scoped>
.ch-panel {
	width: 1180px;
}

.ch-body {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 14px;
	padding: 30px 60px 52px;
	text-align: center;
}

.ch-trophy {
	width: 96px;
	height: 96px;
	color: var(--bc-accent);
	filter: drop-shadow(0 0 22px var(--bc-accent-glow));
}

.ch-kicker {
	margin: 0;
	font-size: 26px;
	font-weight: 800;
	letter-spacing: 0.22em;
	text-transform: uppercase;
	color: var(--bc-accent-soft);
}

.ch-crest {
	width: 230px;
	height: 230px;
	filter: drop-shadow(0 0 40px var(--bc-accent-glow));
}

.ch-crest :deep(.bc-initials) {
	font-size: 84px;
}

.ch-name {
	margin: 4px 0 0;
	font-size: 84px;
	font-weight: 900;
	line-height: 1.05;
	letter-spacing: 0.01em;
	background: linear-gradient(180deg, #ffffff 0%, var(--bc-accent-soft) 100%);
	-webkit-background-clip: text;
	background-clip: text;
	color: transparent;
}

.ch-sub {
	margin: 0;
	font-size: 28px;
	font-weight: 700;
	color: var(--bc-sub);
}
</style>
