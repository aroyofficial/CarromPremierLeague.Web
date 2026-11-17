<template>
	<div
		class="carrom-loader"
		:class="[`is-${resolvedTheme}`, { 'is-overlay': overlay }]"
		role="status"
		:aria-label="label"
	>
		<div class="stage">
			<svg class="board" viewBox="-8 -8 216 216" aria-hidden="true">
				<defs>
					<linearGradient :id="`${uid}-sheen`" x1="0" y1="0" x2="1" y2="0">
						<stop offset="0%" stop-color="#fff" stop-opacity="0" />
						<stop offset="50%" stop-color="#fff" stop-opacity="0.55" />
						<stop offset="100%" stop-color="#fff" stop-opacity="0" />
					</linearGradient>
					<filter :id="`${uid}-soft`" x="-80%" y="-80%" width="260%" height="260%">
						<feGaussianBlur stdDeviation="2.4" />
					</filter>
					<clipPath :id="`${uid}-clip`">
						<rect x="19" y="19" width="162" height="162" rx="8" />
					</clipPath>
				</defs>

				<rect
					x="4"
					y="4"
					width="192"
					height="192"
					rx="16"
					fill="none"
					stroke="#ffd166"
					stroke-width="2"
					stroke-linecap="round"
					stroke-dasharray="42 958"
					pathLength="1000"
					:opacity="pose.halo.opacity"
					:stroke-dashoffset="pose.halo.offset"
				/>
				<rect
					x="1"
					y="1"
					width="198"
					height="198"
					rx="17"
					fill="none"
					stroke="#bfe6ff"
					stroke-width="1.15"
					stroke-linecap="round"
					stroke-dasharray="22 978"
					pathLength="1000"
					:opacity="pose.haloCool.opacity"
					:stroke-dashoffset="pose.haloCool.offset"
				/>

				<rect x="10" y="10" width="180" height="180" rx="14" fill="#7a4424" />
				<rect x="19" y="19" width="162" height="162" rx="8" fill="#fed9a6" />

				<g :clip-path="`url(#${uid}-clip)`">
					<rect
						:x="pose.sheen.x"
						y="10"
						width="28"
						height="190"
						:fill="`url(#${uid}-sheen)`"
						:opacity="pose.sheen.opacity"
						transform="rotate(18 100 100)"
					/>
				</g>

				<g fill="none" stroke-linejoin="round" stroke-linecap="round">
					<path stroke="#1a1008" stroke-width="1.7" d="M54 38 H146 A16 16 0 0 1 162 54 V146 A16 16 0 0 1 146 162 H54 A16 16 0 0 1 38 146 V54 A16 16 0 0 1 54 38" />
					<path stroke="#6b4a28" stroke-width="1.7" d="M57 49 H143 A8 8 0 0 1 151 57 V143 A8 8 0 0 1 143 151 H57 A8 8 0 0 1 49 143 V57 A8 8 0 0 1 57 49" />
					<g fill="#d42028" stroke="#1a1008" stroke-width="1.15">
						<circle cx="54" cy="44" r="3.8" />
						<circle cx="146" cy="44" r="3.8" />
						<circle cx="146" cy="156" r="3.8" />
						<circle cx="54" cy="156" r="3.8" />
						<circle cx="44" cy="54" r="3.8" />
						<circle cx="156" cy="54" r="3.8" />
						<circle cx="156" cy="146" r="3.8" />
						<circle cx="44" cy="146" r="3.8" />
					</g>
				</g>
				<circle cx="100" cy="100" r="31" fill="none" stroke="#2a2118" stroke-width="1.5" />

				<g>
					<circle
						v-for="(glow, index) in glowSpots"
						:key="index"
						:cx="glow.x"
						:cy="glow.y"
						r="12"
						fill="#ffd166"
						:filter="`url(#${uid}-soft)`"
						:opacity="pose.glows[index]"
					/>
				</g>
				<g>
					<circle cx="25" cy="25" r="8.2" fill="#3c3936" />
					<circle cx="175" cy="25" r="8.2" fill="#3c3936" />
					<circle cx="25" cy="175" r="8.2" fill="#3c3936" />
					<circle cx="175" cy="175" r="8.2" fill="#3c3936" />
				</g>

				<g>
					<circle
						v-for="(ghost, index) in pose.ghosts"
						:key="index"
						r="10"
						fill="#f4efe6"
						:cx="ghost.x"
						:cy="ghost.y"
						:opacity="ghost.opacity"
					/>
				</g>
				<circle
					fill="none"
					stroke="#fff6d4"
					stroke-width="1.4"
					:cx="pose.flash.x"
					:cy="pose.flash.y"
					:r="pose.flash.r"
					:opacity="pose.flash.opacity"
				/>
				<g>
					<circle
						v-for="(spark, index) in pose.sparks"
						:key="index"
						r="1.4"
						fill="#ffd166"
						:cx="spark.x"
						:cy="spark.y"
						:opacity="spark.opacity"
					/>
				</g>
				<g>
					<circle
						v-for="(trail, index) in pose.queenTrail"
						:key="index"
						r="8"
						:fill="index === 0 ? '#ffd166' : '#ff5a72'"
						:cx="trail.x"
						:cy="trail.y"
						:opacity="trail.opacity"
					/>
				</g>

				<g class="queen" :transform="pieceTransform(pose.queen)" :opacity="pose.queen.opacity">
					<circle r="9" fill="#d42028" stroke="#1a1008" stroke-width="1.35" />
					<circle r="3.1" fill="none" stroke="#1a1008" stroke-width="1.15" />
				</g>
				<g class="striker" :transform="pieceTransform(pose.striker)">
					<circle r="10" fill="#f4efe6" stroke="#1a1008" stroke-width="1.25" />
					<circle r="4.2" fill="none" stroke="#1a1008" stroke-width="1" />
				</g>
			</svg>
		</div>
		<p v-if="text" class="loader-text">{{ text }}</p>
	</div>
</template>

<script>
let nextLoaderId = 0;
</script>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { theme as siteTheme } from "@/utils/theme";
import { pieceTransform, poseAt } from "@/utils/carromLoaderMotion";

const props = defineProps({
	overlay: { type: Boolean, default: false },
	theme: { type: String, default: "" },
	text: { type: String, default: "" },
});

const uid = `carrom-loader-${++nextLoaderId}`;
const glowSpots = [
	{ x: 25, y: 25 },
	{ x: 175, y: 25 },
	{ x: 175, y: 175 },
	{ x: 25, y: 175 },
];
const pose = ref(poseAt(0));
const resolvedTheme = computed(() =>
	props.theme === "light" || props.theme === "dark" ? props.theme : siteTheme.value,
);
const label = computed(() => props.text || "Loading");

let frame = 0;
let started = 0;

const tick = (now) => {
	pose.value = poseAt(now - started);
	frame = requestAnimationFrame(tick);
};

onMounted(() => {
	const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
	if (motion.matches) return;
	started = performance.now();
	frame = requestAnimationFrame(tick);
});

onUnmounted(() => {
	if (frame) cancelAnimationFrame(frame);
});
</script>

<style scoped>
.carrom-loader {
	display: grid;
	justify-items: center;
	align-content: center;
	gap: 14px;
}

.carrom-loader.is-overlay {
	position: fixed;
	inset: 0;
	z-index: 5000;
}

.carrom-loader.is-dark.is-overlay {
	background:
		radial-gradient(circle at 50% 46%, rgba(245, 184, 46, 0.08), transparent 22%),
		rgba(11, 20, 38, 0.94);
}

.carrom-loader.is-light.is-overlay {
	background:
		radial-gradient(circle at 50% 46%, rgba(245, 184, 46, 0.2), transparent 24%),
		rgba(246, 248, 252, 0.94);
}

.stage {
	width: 108px;
	height: 108px;
}

.is-dark .stage {
	filter:
		drop-shadow(0 0 2px rgba(255, 214, 120, 0.95))
		drop-shadow(0 0 7px rgba(245, 184, 46, 0.55))
		drop-shadow(0 0 14px rgba(245, 184, 46, 0.22));
}

.is-light .stage {
	filter:
		drop-shadow(0 8px 14px rgba(36, 24, 12, 0.16))
		drop-shadow(0 0 8px rgba(245, 184, 46, 0.28));
}

.board {
	width: 100%;
	height: 100%;
	overflow: visible;
}

.loader-text {
	margin: 0;
	max-width: 280px;
	font-size: 14px;
	line-height: 1.4;
	text-align: center;
}

.is-dark .loader-text {
	color: #ffd166;
}

.is-light .loader-text {
	color: #7a4424;
}
</style>
