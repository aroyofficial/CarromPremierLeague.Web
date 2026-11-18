<template>
	<div
		v-if="celebration"
		class="champion-show"
		role="dialog"
		aria-modal="true"
		aria-labelledby="champion-title"
		@click.self="dismiss"
	>
		<canvas ref="sky" class="champion-sky" aria-hidden="true"></canvas>
		<div class="champion-card">
			<p class="champion-kicker">Champions</p>
			<EntityImage
				:src="celebration.logo"
				:name="celebration.teamName"
				kind="team"
				class="champion-logo"
				:alt="`${celebration.teamName} logo`"
			/>
			<h2 id="champion-title">{{ celebration.teamName }}</h2>
			<p class="champion-season">{{ celebration.seasonName }}</p>
			<button ref="continueButton" type="button" class="champion-continue" @click="dismiss">Continue</button>
		</div>
	</div>
</template>

<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import EntityImage from "@/components/EntityImage.vue";
import { useSeasonStore } from "@/store/seasonStore";
import { useTeamStore } from "@/store/teamStore";
import { seasonService } from "@/services/seasonService";
import { Routes } from "@/utils/constants";
import { championFromTable, championSeenKey, currentShownSeason } from "@/utils/champion";
import { explode, rocketLaunch, stepRocket, stepSpark } from "@/utils/fireworks";
import { areas } from "@/utils/realtimeRules";
import { useLive } from "@/utils/useLive";

const route = useRoute();
const seasonStore = useSeasonStore();
const teamStore = useTeamStore();

const celebration = ref(null);
const sky = ref(null);
const continueButton = ref(null);

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const remembered = (seasonId, teamId) => {
	try {
		return sessionStorage.getItem(championSeenKey(seasonId, teamId)) === "1";
	} catch {
		return false;
	}
};

const remember = (seasonId, teamId) => {
	try {
		sessionStorage.setItem(championSeenKey(seasonId, teamId), "1");
	} catch {
		/* A private window can refuse storage. The show still closes. */
	}
};

const load = async () => {
	if (route.path.startsWith(Routes.ADMIN) || route.path === Routes.LOGIN) {
		celebration.value = null;
		return;
	}
	const season = currentShownSeason(seasonStore.seasons);
	if (!season) {
		celebration.value = null;
		return;
	}
	try {
		const response = await seasonService.getLeagueTable(season.id);
		const champion = championFromTable(response.data);
		if (!champion || remembered(season.id, champion.teamId)) {
			celebration.value = null;
			return;
		}
		const team = (teamStore.teams || []).find((item) => item.id === champion.teamId);
		const next = {
			seasonId: season.id,
			seasonName: season.name,
			teamId: champion.teamId,
			teamName: champion.teamName,
			logo: team?.logo_url || "",
		};
		const current = celebration.value;
		if (current && current.seasonId === next.seasonId && current.teamId === next.teamId && current.teamName === next.teamName) return;
		celebration.value = next;
	} catch (error) {
		console.error("Failed to load the season champion", error);
	}
};

const dismiss = () => {
	if (!celebration.value) return;
	remember(celebration.value.seasonId, celebration.value.teamId);
	celebration.value = null;
};

const onKey = (event) => {
	if (event.key === "Escape") dismiss();
};

let frame = 0;
let rockets = [];
let sparks = [];
let launchAt = 0;
let launchIndex = 0;

const paint = (now) => {
	const canvas = sky.value;
	if (!canvas || reducedMotion()) return;
	const ctx = canvas.getContext("2d");
	const width = canvas.clientWidth;
	const height = canvas.clientHeight;
	ctx.globalCompositeOperation = "destination-out";
	ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
	ctx.fillRect(0, 0, width, height);
	ctx.globalCompositeOperation = "lighter";

	if (now >= launchAt && rockets.length < 4) {
		rockets.push(rocketLaunch({ width, height, index: launchIndex }));
		launchIndex += 1;
		launchAt = now + 700;
	}

	rockets = rockets.flatMap((rocket) => {
		const next = stepRocket(rocket);
		ctx.fillStyle = next.colour;
		ctx.beginPath();
		ctx.arc(next.x, next.y, 2.4, 0, Math.PI * 2);
		ctx.fill();
		if (!next.done) return [next];
		sparks.push(...explode(next));
		return [];
	});

	sparks = sparks.flatMap((spark) => {
		const next = stepSpark(spark);
		if (next.life <= 0) return [];
		ctx.globalAlpha = Math.max(next.life, 0);
		ctx.fillStyle = next.colour;
		ctx.beginPath();
		ctx.arc(next.x, next.y, 2.2, 0, Math.PI * 2);
		ctx.fill();
		ctx.globalAlpha = 1;
		return [next];
	});

	frame = requestAnimationFrame(paint);
};

const fitCanvas = () => {
	const canvas = sky.value;
	if (!canvas) return;
	const ratio = Math.min(window.devicePixelRatio || 1, 2);
	canvas.width = Math.floor(window.innerWidth * ratio);
	canvas.height = Math.floor(window.innerHeight * ratio);
	canvas.style.width = `${window.innerWidth}px`;
	canvas.style.height = `${window.innerHeight}px`;
	const ctx = canvas.getContext("2d");
	ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
};

const startShow = () => {
	cancelAnimationFrame(frame);
	rockets = [];
	sparks = [];
	launchIndex = 0;
	launchAt = 0;
	if (reducedMotion()) return;
	fitCanvas();
	frame = requestAnimationFrame(paint);
};

watch(celebration, async (value) => {
	if (!value) {
		cancelAnimationFrame(frame);
		return;
	}
	await nextTick();
	startShow();
	continueButton.value?.focus();
});

watch(() => [route.path, seasonStore.seasons], () => load());

useLive(load, { areas: [...areas.stores, "matches"] });

onMounted(() => {
	window.addEventListener("keydown", onKey);
	window.addEventListener("resize", fitCanvas);
	load();
});

onUnmounted(() => {
	cancelAnimationFrame(frame);
	window.removeEventListener("keydown", onKey);
	window.removeEventListener("resize", fitCanvas);
});
</script>

<style scoped lang="scss">
.champion-show {
	position: fixed;
	inset: 0;
	z-index: 1400;
	display: grid;
	place-items: center;
	padding: 24px;
	background: rgba(11, 20, 38, 0.72);
}

.champion-sky {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	pointer-events: none;
}

.champion-card {
	position: relative;
	z-index: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	width: min(440px, 100%);
	padding: 32px 28px 28px;
	text-align: center;
	border: 1px solid var(--cpl-gold-border);
	border-radius: var(--cpl-radius-lg);
	background:
		radial-gradient(ellipse at 50% 0%, rgba(245, 184, 46, 0.28), transparent 58%),
		var(--cpl-navy-900);
	box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4);
	color: #fff;
}

.champion-kicker {
	margin: 0;
	font-size: 12px;
	font-weight: 700;
	letter-spacing: 0.16em;
	text-transform: uppercase;
	color: var(--cpl-gold-400);
}

.champion-logo {
	display: block;
	width: 96px;
	height: 96px;
	margin: 16px 0 12px;
	border-radius: 50%;
	overflow: hidden;
	box-shadow: 0 0 0 3px var(--cpl-gold-500), 0 0 28px rgba(245, 184, 46, 0.45);

	:deep(img) {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
}

h2 {
	margin: 0;
	font-family: var(--cpl-font-display);
	font-size: clamp(32px, 6vw, 46px);
	font-weight: 800;
	line-height: 1.05;
}

.champion-season {
	margin: 8px 0 0;
	color: rgba(255, 255, 255, 0.78);
	font-size: 15px;
}

.champion-continue {
	margin-top: 22px;
	padding: 10px 28px;
	border: 0;
	border-radius: 999px;
	background: var(--cpl-gold-500);
	color: var(--cpl-navy-900);
	font-weight: 800;
	cursor: pointer;

	&:focus-visible {
		outline: 3px solid #fff;
		outline-offset: 3px;
	}
}

@media (prefers-reduced-motion: reduce) {
	.champion-sky {
		display: none;
	}
}
</style>
