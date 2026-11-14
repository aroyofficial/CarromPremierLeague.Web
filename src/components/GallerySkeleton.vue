<template>
	<div class="gallery-skeleton" :class="{ 'is-still': still, 'is-compact': compact }" aria-hidden="true">
		<div v-if="!compact" class="skeleton-chips">
			<span v-for="chip in 4" :key="chip" class="skeleton-block skeleton-chip"></span>
		</div>
		<div v-if="!compact" class="skeleton-block skeleton-hero"></div>
		<div class="skeleton-grid">
			<span
				v-for="(ratio, index) in ratios"
				:key="index"
				class="skeleton-block skeleton-tile"
				:style="{ aspectRatio: ratio }"
			></span>
		</div>
	</div>
</template>

<script setup>
import { onMounted, ref } from "vue";

defineProps({
	compact: { type: Boolean, default: false },
});

const ratios = ["4 / 3", "3 / 4", "1 / 1", "16 / 9", "3 / 4", "4 / 5", "1 / 1", "5 / 4"];
const still = ref(false);

onMounted(() => {
	still.value = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
});
</script>

<style scoped>
.gallery-skeleton {
	display: flex;
	flex-direction: column;
	gap: 18px;
}

.skeleton-chips {
	display: flex;
	gap: 8px;
	overflow: hidden;
}

.skeleton-block {
	background: linear-gradient(90deg, #e7edf6 25%, #f8fafc 50%, #e7edf6 75%);
	background-size: 200% 100%;
	animation: gallery-shimmer 1.2s ease-in-out infinite;
}

.skeleton-chip {
	width: 112px;
	height: 36px;
	border-radius: 999px;
	flex: 0 0 auto;
}

.skeleton-hero {
	width: 100%;
	aspect-ratio: 16 / 7;
	border-radius: 18px;
	max-height: 420px;
}

.skeleton-grid {
	columns: 4 180px;
	column-gap: 12px;
}

.skeleton-tile {
	display: block;
	width: 100%;
	margin-bottom: 12px;
	border-radius: 14px;
	break-inside: avoid;
}

.is-still .skeleton-block,
.gallery-skeleton.is-still .skeleton-block {
	animation: none;
}

@media (prefers-reduced-motion: reduce) {
	.skeleton-block {
		animation: none;
	}
}

@keyframes gallery-shimmer {
	from {
		background-position: 100% 0;
	}
	to {
		background-position: -100% 0;
	}
}
</style>
