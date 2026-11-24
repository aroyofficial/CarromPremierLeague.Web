<template>
	<el-drawer
		:model-value="modelValue"
		:title="widget ? `Preview · ${widget.name}` : 'Preview'"
		direction="rtl"
		size="min(860px, 100vw)"
		class="ip-drawer"
		append-to-body
		destroy-on-close
		@update:model-value="(val) => emit('update:modelValue', val)"
		@open="loadPreview"
	>
		<div class="ip-drawer-body wpd-body" v-loading="loading && !snapshot">
			<p class="wpd-lead">
				<strong>{{ typeLabel }}</strong>
				<span> · {{ targetText }}</span>
			</p>

			<WidgetPreviewStage>
				<template #title>
					<span class="wpd-dot"></span>
					<strong>{{ isFlow ? "Season flow" : "Overlay" }} preview</strong>
				</template>
				<template #extra>
					<el-checkbox v-model="showSafeZone" label="FB Live safe zone" size="small" />
				</template>

				<template v-if="isFlow" #controls>
					<div class="wpd-scenes" role="tablist" aria-label="Preview scene">
						<button
							v-for="tab in PREVIEW_SCENES"
							:key="tab.value"
							type="button"
							class="wpd-scene"
							:class="{ 'is-active': scene === tab.value }"
							@click="scene = tab.value"
						>
							{{ tab.value === "auto" ? "Live now" : tab.label }}
						</button>
					</div>
				</template>

				<template #backdrop>
					<div class="wpd-backdrop" aria-hidden="true"></div>
				</template>

				<BroadcastStageScene
					v-if="snapshot"
					:snapshot="snapshot"
					:preview-scene="isFlow ? scene : null"
					:now-ms="syncedNowMs"
				/>

				<template #overlay>
					<div v-if="showSafeZone" class="wpd-safe" aria-hidden="true"></div>
				</template>

				<template #caption>
					Shows what this widget's link renders right now, scaled to the chosen screen size.
					<template v-if="isFlow"> Pick a card to inspect it even when it is not on air.</template>
				</template>
			</WidgetPreviewStage>
		</div>

		<div class="ip-drawer-foot">
			<el-button @click="emit('update:modelValue', false)">Close</el-button>
		</div>
	</el-drawer>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { adminApi, apiErrorMessage } from "@/services/adminService";
import { unwrap } from "@/utils/adminHelpers";
import { notify } from "@/utils/notify";
import { areas } from "@/utils/realtimeRules";
import { useLive } from "@/utils/useLive";
import { WIDGET_TYPE_LABEL, widgetTargetText } from "@/utils/widgets";
import { PREVIEW_SCENES, computeClockOffset } from "@/utils/widgetFlow";
import BroadcastStageScene from "@/views/widgets/BroadcastStageScene.vue";
import WidgetPreviewStage from "./WidgetPreviewStage.vue";

const props = defineProps({
	modelValue: { type: Boolean, default: false },
	widget: { type: Object, default: null },
	seasonsById: { type: Object, default: null },
});

const emit = defineEmits(["update:modelValue"]);

const snapshot = ref(null);
const loading = ref(false);
const scene = ref("auto");
const showSafeZone = ref(false);
const clockOffsetMs = ref(0);
const clientNowMs = ref(Date.now());
const syncedNowMs = computed(() => clientNowMs.value + clockOffsetMs.value);

const isFlow = computed(() => props.widget?.widget_type === "season_flow");
const typeLabel = computed(() => WIDGET_TYPE_LABEL[props.widget?.widget_type] || props.widget?.widget_type || "");
const targetText = computed(() => (props.widget ? widgetTargetText(props.widget, props.seasonsById) : ""));

let tickTimer = null;
let requestId = 0;

const loadPreview = async () => {
	if (!props.modelValue || !props.widget?.id) return;
	const current = ++requestId;
	loading.value = true;
	try {
		const data = unwrap(await adminApi.widgets.preview(props.widget.id));
		if (current !== requestId) return;
		snapshot.value = data || null;
		if (data?.server_now) clockOffsetMs.value = computeClockOffset(data.server_now, Date.now());
		clientNowMs.value = Date.now();
	} catch (error) {
		if (current === requestId) notify.error(apiErrorMessage(error, "Could not load the widget preview."));
	} finally {
		if (current === requestId) loading.value = false;
	}
};

useLive(loadPreview, { areas: areas.widget });

watch(
	() => props.widget?.id,
	() => {
		snapshot.value = null;
		scene.value = "auto";
		if (props.modelValue) loadPreview();
	},
);

onMounted(() => {
	tickTimer = window.setInterval(() => {
		clientNowMs.value = Date.now();
	}, 1000);
});

onUnmounted(() => {
	if (tickTimer) window.clearInterval(tickTimer);
});
</script>

<style scoped>
.wpd-body {
	display: flex;
	flex-direction: column;
	gap: 14px;
}

.wpd-lead {
	margin: 0;
	font-size: 13px;
}

.wpd-lead span {
	opacity: 0.72;
}

.wpd-dot {
	display: inline-block;
	width: 8px;
	height: 8px;
	margin-right: 6px;
	border-radius: 50%;
	background: #ef4444;
}

.wpd-scenes {
	display: flex;
	flex-wrap: wrap;
	gap: 5px;
}

.wpd-scene {
	padding: 4px 9px;
	border-radius: 999px;
	border: 1px solid var(--el-border-color, #cbd5e1);
	background: transparent;
	color: inherit;
	font-size: 11.5px;
	font-weight: 600;
	cursor: pointer;
}

.wpd-scene.is-active {
	background: #d4a017;
	border-color: #d4a017;
	color: #0f172a;
}

.wpd-backdrop {
	position: absolute;
	inset: 0;
	background-image: radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px);
	background-size: 24px 24px;
}

.wpd-safe {
	position: absolute;
	inset: 5.2% 5%;
	border: 1px dashed rgba(250, 204, 21, 0.5);
	pointer-events: none;
}
</style>
