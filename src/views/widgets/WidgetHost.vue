<template>
	<div class="widget-stage">
		<div class="widget-frame" :style="{ transform: `translate(-50%, -50%) scale(${scale})` }">
			<p v-if="status === 'inactive'" class="widget-notice">{{ INACTIVE_MESSAGE }}</p>
			<p v-else-if="!snapshot" class="widget-notice">Connecting to the league…</p>
			<BroadcastStageScene v-else :snapshot="snapshot" :now-ms="syncedNowMs" audio />
		</div>
	</div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { widgetService } from "@/services/widgetService";
import { areas } from "@/utils/realtimeRules";
import { useLive } from "@/utils/useLive";
import { computeClockOffset } from "@/utils/widgetFlow";
import BroadcastStageScene from "./BroadcastStageScene.vue";

// The overlay is designed for a 1920x1080 browser source and scales down for smaller screens.
const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;
const INACTIVE_MESSAGE = "This widget link is no longer active.";

const route = useRoute();
const snapshot = ref(null);
const status = ref("loading");
const scale = ref(1);
const clockOffsetMs = ref(0);
const clientNowMs = ref(Date.now());
const token = computed(() => String(route.params.token || ""));
const syncedNowMs = computed(() => clientNowMs.value + clockOffsetMs.value);

let tickHandle = null;
let previousHtmlBg = "";

const load = async () => {
	const current = token.value;
	if (!current) {
		status.value = "inactive";
		return;
	}
	try {
		const response = await widgetService.snapshot(current);
		if (current !== token.value) return;
		const data = response?.data || null;
		snapshot.value = data;
		if (data?.server_now) {
			clockOffsetMs.value = computeClockOffset(data.server_now, Date.now());
		}
		clientNowMs.value = Date.now();
		status.value = "ready";
	} catch (error) {
		if (current !== token.value) return;
		// A revoked, expired, or deleted link is final. Anything else keeps the last good picture on screen.
		if (error?.httpStatus === 401 || error?.httpStatus === 404) {
			snapshot.value = null;
			status.value = "inactive";
		}
	}
};

const fit = () => {
	const widthRatio = window.innerWidth / DESIGN_WIDTH;
	const heightRatio = window.innerHeight / DESIGN_HEIGHT;
	scale.value = Math.min(widthRatio, heightRatio) || 1;
};

useLive(load, { areas: areas.widget });

watch(token, () => {
	snapshot.value = null;
	status.value = "loading";
	load();
});

onMounted(() => {
	previousHtmlBg = document.documentElement.style.backgroundColor || "";
	document.documentElement.style.backgroundColor = "transparent";
	document.documentElement.classList.add("widget-stage-root");
	fit();
	window.addEventListener("resize", fit);
	tickHandle = window.setInterval(() => {
		clientNowMs.value = Date.now();
	}, 1000);
	load();
});

onUnmounted(() => {
	if (tickHandle) {
		window.clearInterval(tickHandle);
		tickHandle = null;
	}
	document.documentElement.classList.remove("widget-stage-root");
	document.documentElement.style.backgroundColor = previousHtmlBg;
	window.removeEventListener("resize", fit);
});
</script>

<style lang="scss">
// The overlay sits on top of video, so the page behind it must be see-through and unpadded.
html.widget-stage-root,
html.widget-stage-root body,
html.widget-stage-root #app,
html.widget-stage-root #app-content {
	background: transparent !important;
	padding-top: 0 !important;
	margin: 0 !important;
	min-height: 0 !important;
	overflow: hidden !important;
}

.widget-stage {
	position: fixed;
	inset: 0;
	overflow: hidden;
	background: transparent;
}

.widget-frame {
	position: absolute;
	left: 50%;
	top: 50%;
	width: 1920px;
	height: 1080px;
	transform-origin: center center;
	color: #fff;
}

.widget-notice {
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	margin: 0;
	padding: 24px 36px;
	border-radius: 14px;
	background: rgba(8, 14, 28, 0.85);
	font-size: 32px;
	font-weight: 600;
	text-align: center;
}
</style>
