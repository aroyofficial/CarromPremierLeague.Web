<template>
	<canvas v-show="active" ref="sky" class="page-fireworks" :class="{ 'is-contained': Boolean(size) }" aria-hidden="true"></canvas>
</template>

<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { explode, rocketLaunch, shellsToLaunch, stepRocket, stepSpark } from "@/utils/fireworks";

const rgb = (hex) => {
	const value = hex.replace("#", "");
	return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
};

const rayPath = (spark) =>
	spark.trail && spark.trail.length > 1
		? spark.trail
		: [
				{ x: spark.originX, y: spark.originY },
				{ x: spark.x, y: spark.y },
			];

const strokePath = (ctx, path) => {
	ctx.beginPath();
	ctx.moveTo(path[0].x, path[0].y);
	for (let i = 1; i < path.length; i += 1) ctx.lineTo(path[i].x, path[i].y);
	ctx.stroke();
};

/** Glitter sits on the ray head, and only in the moment before that head fades. */
const paintHeadGlitter = (ctx, next, now, alpha) => {
	const arriving = Math.min(1, Math.max(0, (0.32 - alpha) / 0.1));
	const leaving = Math.min(1, Math.max(0, alpha / 0.08));
	const strength = arriving * leaving;
	if (strength < 0.05) return;
	const seed = next.originX * 0.013 + next.originY * 0.017;
	ctx.fillStyle = `rgba(255, 253, 248, ${strength})`;
	ctx.beginPath();
	ctx.arc(next.x, next.y, 1.35, 0, Math.PI * 2);
	ctx.fill();
	for (let i = 0; i < 5; i += 1) {
		const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(now / 55 + seed + i * 1.4));
		const angle = (Math.PI * 2 * i) / 5 + seed;
		const dist = 1.8 + (i % 2) * 1.6;
		ctx.fillStyle = `rgba(255, 248, 220, ${strength * twinkle})`;
		ctx.beginPath();
		ctx.arc(next.x + Math.cos(angle) * dist, next.y + Math.sin(angle) * dist, 0.75, 0, Math.PI * 2);
		ctx.fill();
	}
};

const paintRay = (ctx, next, now) => {
	const [r, g, b] = rgb(next.colour);
	const alpha = Math.max(next.life, 0);
	const path = rayPath(next);
	ctx.lineCap = "round";
	ctx.lineJoin = "round";
	ctx.lineWidth = 1.25;
	for (let i = 1; i < path.length; i += 1) {
		const t = i / (path.length - 1);
		ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * (0.1 + 0.9 * t * t)})`;
		ctx.beginPath();
		ctx.moveTo(path[i - 1].x, path[i - 1].y);
		ctx.lineTo(path[i].x, path[i].y);
		ctx.stroke();
	}
	if (alpha > 0.32) {
		ctx.fillStyle = `rgba(255, 253, 248, ${alpha})`;
		ctx.beginPath();
		ctx.arc(next.x, next.y, 1.7, 0, Math.PI * 2);
		ctx.fill();
		return;
	}
	paintHeadGlitter(ctx, next, now, alpha);
};

const paintClimb = (ctx, rocket) => {
	const trail = rocket.trail || [];
	const [r, g, b] = rgb("#ffb43a");
	ctx.lineCap = "round";
	ctx.lineJoin = "round";
	if (trail.length > 1) {
		ctx.strokeStyle = "rgba(255, 120, 30, 0.22)";
		ctx.lineWidth = 8;
		strokePath(ctx, trail);
		for (let i = 1; i < trail.length; i += 1) {
			const t = i / (trail.length - 1);
			ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.12 + 0.88 * t * t})`;
			ctx.lineWidth = 1 + t * 1.8;
			ctx.beginPath();
			ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
			ctx.lineTo(trail[i].x, trail[i].y);
			ctx.stroke();
		}
	}
	ctx.fillStyle = "rgba(255, 214, 120, 0.35)";
	ctx.beginPath();
	ctx.arc(rocket.x, rocket.y, 6, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = "#fffdf8";
	ctx.beginPath();
	ctx.arc(rocket.x, rocket.y, 2.1, 0, Math.PI * 2);
	ctx.fill();
};

const props = defineProps({
	active: { type: Boolean, default: false },
	// A fixed stage ({ width, height }), such as the 1920x1080 broadcast frame. Without it the sky fills the window.
	size: { type: Object, default: null },
});

const sky = ref(null);
// A broadcast overlay is video, not a page, so a fixed stage always plays its show.
const reducedMotion = () => !props.size && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

let frame = 0;
let rockets = [];
let sparks = [];
let launchAt = 0;
let launchIndex = 0;
let lastNow = 0;

const paint = (now) => {
	const canvas = sky.value;
	if (!canvas || !props.active || reducedMotion()) return;
	const dt = lastNow ? Math.min((now - lastNow) / (1000 / 60), 2) : 1;
	lastNow = now;
	const ctx = canvas.getContext("2d");
	const width = canvas.clientWidth;
	const height = canvas.clientHeight;
	ctx.clearRect(0, 0, width, height);

	if (now >= launchAt && shellsToLaunch({ rockets, sparks }) === 1) {
		const across = 0.1 + ((launchIndex * 0.61803398875) % 1) * 0.8;
		rockets.push(rocketLaunch({ width, height, index: launchIndex, across }));
		launchIndex += 1;
		launchAt = now + 900;
	}

	rockets = rockets.flatMap((rocket) => {
		const next = stepRocket(rocket, dt);
		if (next.done) {
			sparks.push(...explode(next));
			return [];
		}
		paintClimb(ctx, next);
		return [next];
	});

	sparks = sparks.flatMap((spark) => {
		const next = stepSpark(spark, dt);
		if (next.life <= 0) return [];
		paintRay(ctx, next, now);
		return [next];
	});

	frame = requestAnimationFrame(paint);
};

const fitCanvas = () => {
	const canvas = sky.value;
	if (!canvas) return;
	const ratio = Math.min(window.devicePixelRatio || 1, 2);
	const width = props.size?.width || window.innerWidth;
	const height = props.size?.height || window.innerHeight;
	canvas.width = Math.floor(width * ratio);
	canvas.height = Math.floor(height * ratio);
	canvas.style.width = `${width}px`;
	canvas.style.height = `${height}px`;
	const ctx = canvas.getContext("2d");
	ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
};

const stopShow = () => {
	cancelAnimationFrame(frame);
	rockets = [];
	sparks = [];
	launchIndex = 0;
	launchAt = 0;
	lastNow = 0;
	const canvas = sky.value;
	if (!canvas) return;
	const ctx = canvas.getContext("2d");
	ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
};

const startShow = () => {
	stopShow();
	if (!props.active || reducedMotion()) return;
	fitCanvas();
	frame = requestAnimationFrame(paint);
};

watch(
	() => props.active,
	async (active) => {
		await nextTick();
		if (active) startShow();
		else stopShow();
	},
);

onMounted(() => {
	if (props.active) startShow();
});

const onResize = () => {
	if (props.active) fitCanvas();
};

window.addEventListener("resize", onResize);

onUnmounted(() => {
	stopShow();
	window.removeEventListener("resize", onResize);
});
</script>

<style scoped>
.page-fireworks {
	position: fixed;
	inset: 0;
	z-index: 40;
	width: 100%;
	height: 100%;
	pointer-events: none;
}

/* Inside the broadcast frame the sky sits over the card, on the frame's own pixels. */
.page-fireworks.is-contained {
	position: absolute;
	inset: auto;
	left: 0;
	top: 0;
	z-index: 20;
	pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
	.page-fireworks:not(.is-contained) {
		display: none;
	}
}
</style>
