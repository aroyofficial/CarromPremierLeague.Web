<template>
	<div v-if="visible" id="countdown-wrapper" :class="{ fade: isFading }">
		<span
			id="countdown-value"
			:key="value"
			:style="{ color: currentColor }"
			class="bounce"
		>
			{{ value }}
		</span>
	</div>
</template>

<script setup>
import { ref, watch, onUnmounted, computed } from "vue";
import { pauseBgm, playBgm } from "../utils/common";
import { BackgroundMusic } from "../utils/constants";

const props = defineProps({
	start: {
		type: Boolean,
		required: true,
	},
});

const emit = defineEmits(["countdown-finished"]);

const value = ref(10);
const visible = ref(false);
const isFading = ref(false);

let interval = null;

const colors = [
	"#ff4d4d",
	"#ff914d",
	"#ffd93d",
	"#6eff3e",
	"#00f5ff",
	"#1e90ff",
	"#8a2be2",
	"#ff00ff",
	"#ff1744",
	"#ffcc00",
];

const currentColor = computed(() => {
	return colors[10 - value.value] || "#ffffff";
});

async function startCountdown() {
	await playBgm(BackgroundMusic.Countdown);
	reset();
	visible.value = true;

	interval = setInterval(() => {
		if (value.value > 1) {
			value.value--;
		} else {
			clearInterval(interval);
			isFading.value = true;

			setTimeout(() => {
				visible.value = false;
				emit("countdown-finished");
			}, 800);
		}
	}, 1000);
}

function stopCountdown() {
	if (interval) clearInterval(interval);
	reset();
}

function reset() {
	value.value = 10;
	isFading.value = false;
	visible.value = false;
}

watch(
	() => props.start,
	async (newVal) => {
		if (newVal) {
			await startCountdown();
		} else {
			stopCountdown();
		}
	},
	{ immediate: true },
);

onUnmounted(() => {
	if (interval) clearInterval(interval);
});
</script>

<style scoped>
#countdown-wrapper {
	position: fixed;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
}

#countdown-value {
	font-size: 80px;
	font-weight: 900;
	text-shadow: 0 0 25px rgba(255, 255, 255, 0.8);
	display: inline-block;
}

.bounce {
	animation: pop 0.6s ease;
}

@keyframes pop {
	0% {
		transform: scale(0.6);
	}
	40% {
		transform: scale(1.4);
	}
	60% {
		transform: scale(0.9);
	}
	80% {
		transform: scale(1.1);
	}
	100% {
		transform: scale(1);
	}
}

.fade {
	opacity: 0;
	transition: opacity 0.8s ease;
}
</style>
