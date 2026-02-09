<template>
	<div class="stopwatch-container">
		<svg viewBox="0 0 100 120" class="stopwatch-svg">
			<rect x="40" y="5" width="20" height="8" rx="2" fill="#333" />
			<rect x="44" y="13" width="12" height="5" fill="#333" />
			<rect
				x="75"
				y="18"
				width="8"
				height="6"
				rx="1"
				fill="#333"
				transform="rotate(45 75 18)"
			/>

			<circle
				cx="50"
				cy="60"
				r="42"
				fill="#fff"
				stroke="#333"
				stroke-width="2"
			/>
			<circle
				cx="50"
				cy="60"
				r="38"
				fill="none"
				stroke="#333"
				stroke-width="1"
			/>

			<line
				v-for="n in 12"
				:key="n"
				x1="50"
				y1="24"
				x2="50"
				y2="28"
				stroke="#333"
				stroke-width="1.5"
				:transform="`rotate(${n * 30} 50 60)`"
			/>

			<line
				x1="50"
				y1="60"
				x2="50"
				y2="30"
				stroke="#2C3E50"
				stroke-width="2.5"
				stroke-linecap="round"
				:style="{
					transform: `rotate(${handRotation}deg)`,
					transformOrigin: '50px 60px',
					transition: isRunning ? 'none' : 'transform 0.5s ease',
				}"
			/>

			<circle cx="50" cy="60" r="3" fill="#333" />
		</svg>

		<div class="display">
			<h2 class="timer-text">{{ formattedTime }}</h2>
			<p class="status">{{ isRunning ? "Counting Down..." : "Ready" }}</p>
		</div>

		<div class="controls">
			<button @click="toggleTimer" :class="{ 'btn-stop': isRunning }">
				{{ isRunning ? "Stop" : "Start" }}
			</button>
			<button @click="resetTimer">Reset</button>
		</div>
	</div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from "vue";

const props = defineProps({
	minutes: { type: Number, default: 5 },
});

const totalSeconds = computed(() => props.minutes * 60);
const remainingSeconds = ref(props.minutes * 60);
const isRunning = ref(false);
let interval = null;

const handRotation = computed(() => {
	const minutesLeft = remainingSeconds.value / 60;
	return minutesLeft * 6;
});

const formattedTime = computed(() => {
	const m = Math.floor(remainingSeconds.value / 60);
	const s = remainingSeconds.value % 60;
	return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
});

const toggleTimer = () => {
	if (isRunning.value) {
		clearInterval(interval);
		isRunning.value = false;
	} else {
		if (remainingSeconds.value <= 0) resetTimer();
		isRunning.value = true;
		interval = setInterval(() => {
			if (remainingSeconds.value > 0) {
				remainingSeconds.value--;
			} else {
				stopTimer();
			}
		}, 1000);
	}
};

const stopTimer = () => {
	clearInterval(interval);
	isRunning.value = false;
};

const resetTimer = () => {
	stopTimer();
	remainingSeconds.value = totalSeconds.value;
};

watch(
	() => props.minutes,
	(newVal) => {
		remainingSeconds.value = newVal * 60;
	},
);

onUnmounted(() => clearInterval(interval));
</script>

<style scoped>
.stopwatch-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 1rem;
	background: #f9f9f9;
	padding: 2rem;
	border-radius: 20px;
	width: fit-content;
}

.stopwatch-svg {
	width: 240px;
	filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
}

.timer-text {
	font-family: "Courier New", Courier, monospace;
	font-size: 3rem;
	margin: 0;
	color: #333;
}

.status {
	margin: 0;
	color: #888;
	font-weight: bold;
	text-transform: uppercase;
	letter-spacing: 1px;
}

.controls {
	display: flex;
	gap: 10px;
}

button {
	padding: 10px 25px;
	border-radius: 8px;
	border: none;
	background: #333;
	color: white;
	font-weight: bold;
	cursor: pointer;
	transition: opacity 0.2s;
}

button:hover {
	opacity: 0.8;
}

.btn-stop {
	background: #e74c3c;
}
</style>
