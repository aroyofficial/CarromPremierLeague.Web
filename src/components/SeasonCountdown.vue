<template>
	<div class="countdown" :class="{ 'is-live': isLive }" role="timer" :aria-label="ariaLabel">
		<template v-if="!isLive">
			<div v-for="unit in units" :key="unit.key" class="unit">
				<div class="ring-wrap">
					<svg class="ring" viewBox="0 0 100 100" aria-hidden="true">
						<circle class="ring-track" cx="50" cy="50" r="45" />
						<circle
							class="ring-progress"
							cx="50"
							cy="50"
							r="45"
							:style="{ strokeDashoffset: ringOffset(unit) }"
						/>
					</svg>
					<div class="digits">
						<Transition name="flip" mode="out-in">
							<span :key="unit.value" class="digit">{{ pad(unit.value) }}</span>
						</Transition>
					</div>
				</div>
				<span class="label">{{ unit.label }}</span>
			</div>
		</template>
		<div v-else class="live-banner">
			<span class="live-dot"></span>
			The season is live!
		</div>
	</div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";

const props = defineProps({
	target: {
		type: Number,
		required: true,
	},
});

const emit = defineEmits(["finished"]);

const RING_LENGTH = 2 * Math.PI * 45;
const now = ref(Date.now());
let timer = null;

const remaining = computed(() => Math.max(props.target - now.value, 0));
const isLive = computed(() => remaining.value === 0);

const units = computed(() => {
	const totalSeconds = Math.floor(remaining.value / 1000);
	return [
		{ key: "d", label: "Days", value: Math.floor(totalSeconds / 86400), max: 365 },
		{ key: "h", label: "Hours", value: Math.floor((totalSeconds % 86400) / 3600), max: 24 },
		{ key: "m", label: "Minutes", value: Math.floor((totalSeconds % 3600) / 60), max: 60 },
		{ key: "s", label: "Seconds", value: totalSeconds % 60, max: 60 },
	];
});

const ariaLabel = computed(() => {
	if (isLive.value) return "The season has started";
	const [d, h, m] = units.value;
	return `${d.value} days, ${h.value} hours and ${m.value} minutes until the season starts`;
});

const pad = (value) => String(value).padStart(2, "0");

const ringOffset = (unit) => {
	const fraction = Math.min(unit.value / unit.max, 1);
	return RING_LENGTH * (1 - fraction);
};

const stop = () => {
	if (timer) clearInterval(timer);
	timer = null;
};

watch(isLive, (live) => {
	if (live) {
		stop();
		emit("finished");
	}
});

onMounted(() => {
	if (!isLive.value) {
		timer = setInterval(() => {
			now.value = Date.now();
		}, 1000);
	}
});

onUnmounted(stop);
</script>

<style scoped lang="scss">
.countdown {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: clamp(10px, 3vw, 28px);
	width: 100%;
	max-width: 620px;
	margin: 0 auto;
}

.unit {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 10px;
}

.ring-wrap {
	position: relative;
	width: 100%;
	max-width: 130px;
	aspect-ratio: 1;
	border-radius: 50%;
	background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02));
	box-shadow:
		inset 0 0 0 1px rgba(255, 255, 255, 0.08),
		0 12px 30px rgba(0, 0, 0, 0.35);
	animation: breathe 4s ease-in-out infinite;
}

.unit:nth-child(2) .ring-wrap {
	animation-delay: 0.5s;
}
.unit:nth-child(3) .ring-wrap {
	animation-delay: 1s;
}
.unit:nth-child(4) .ring-wrap {
	animation-delay: 1.5s;
}

.ring {
	position: absolute;
	inset: 0;
	transform: rotate(-90deg);
}

.ring-track,
.ring-progress {
	fill: none;
	stroke-width: 5;
}

.ring-track {
	stroke: rgba(255, 255, 255, 0.08);
}

.ring-progress {
	stroke: var(--cpl-gold-400);
	stroke-linecap: round;
	stroke-dasharray: 282.743;
	transition: stroke-dashoffset 0.6s ease;
	filter: drop-shadow(0 0 6px rgba(255, 209, 102, 0.6));
}

.digits {
	position: absolute;
	inset: 0;
	display: grid;
	place-items: center;
	perspective: 400px;
}

.digit {
	display: inline-block;
	font-family: var(--cpl-font-display);
	font-weight: 800;
	font-size: clamp(22px, 6vw, 46px);
	color: #fff;
	font-variant-numeric: tabular-nums;
	text-shadow: 0 0 18px rgba(255, 209, 102, 0.35);
}

.label {
	font-size: clamp(10px, 2.4vw, 13px);
	letter-spacing: 0.16em;
	text-transform: uppercase;
	color: rgba(255, 255, 255, 0.65);
}

.live-banner {
	grid-column: 1 / -1;
	justify-self: center;
	display: inline-flex;
	align-items: center;
	gap: 12px;
	padding: 14px 26px;
	border-radius: 999px;
	font-family: var(--cpl-font-display);
	font-size: clamp(18px, 4vw, 26px);
	font-weight: 700;
	color: var(--cpl-navy-900);
	background: linear-gradient(135deg, var(--cpl-gold-400), var(--cpl-gold-500));
	box-shadow: 0 12px 32px rgba(245, 184, 46, 0.45);
	animation: pop-in 0.6s ease both;
}

.live-dot {
	width: 12px;
	height: 12px;
	border-radius: 50%;
	background: var(--cpl-red-500);
	animation: pulse 1.2s ease-in-out infinite;
}

.flip-enter-active,
.flip-leave-active {
	transition: transform 0.25s ease, opacity 0.25s ease;
}
.flip-enter-from {
	transform: rotateX(-90deg) translateY(-6px);
	opacity: 0;
}
.flip-leave-to {
	transform: rotateX(90deg) translateY(6px);
	opacity: 0;
}

@keyframes breathe {
	0%,
	100% {
		transform: translateY(0);
	}
	50% {
		transform: translateY(-6px);
	}
}

@keyframes pulse {
	0%,
	100% {
		box-shadow: 0 0 0 0 rgba(230, 57, 70, 0.6);
	}
	50% {
		box-shadow: 0 0 0 8px rgba(230, 57, 70, 0);
	}
}

@keyframes pop-in {
	0% {
		transform: scale(0.7);
		opacity: 0;
	}
	70% {
		transform: scale(1.05);
	}
	100% {
		transform: scale(1);
		opacity: 1;
	}
}

@media (max-width: 379.98px) {
	.countdown {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
	.ring-wrap {
		max-width: 110px;
	}
}
</style>
