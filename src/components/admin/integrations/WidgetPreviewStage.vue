<template>
	<div ref="rootRef" class="wps" :class="{ 'is-fullscreen': fullscreen, 'is-pseudo': pseudo }">
		<div class="wps-toolbar">
			<div class="wps-title">
				<slot name="title"><strong>Preview</strong></slot>
			</div>

			<div class="wps-devices" role="radiogroup" aria-label="Preview screen size">
				<button
					v-for="item in PREVIEW_DEVICES"
					:key="item.id"
					type="button"
					role="radio"
					class="wps-device-btn"
					:class="{ 'is-active': item.id === device.id }"
					:aria-checked="item.id === device.id"
					:title="`${deviceTitle(item)} · ${item.width}×${item.height}`"
					@click="chooseDevice(item.id)"
				>
					<span class="wps-glyph" :data-frame="item.frame" :data-note="item.note || ''" aria-hidden="true"></span>
					<span>{{ item.label }}</span>
					<small v-if="item.note">{{ item.note === "portrait" ? "↕" : "↔" }}</small>
				</button>
			</div>

			<div class="wps-toolbar-end">
				<small class="wps-size">{{ device.width }}×{{ device.height }}</small>
				<slot name="extra" />
				<button
					type="button"
					class="wps-fs-btn"
					:aria-pressed="fullscreen"
					:title="fullscreen ? 'Exit full screen (Esc)' : 'Full screen preview'"
					@click="toggleFullscreen"
				>
					<el-icon><component :is="fullscreen ? Close : FullScreen" /></el-icon>
					<span>{{ fullscreen ? "Exit full screen" : "Full screen" }}</span>
				</button>
			</div>
		</div>

		<div v-if="$slots.controls" class="wps-controls">
			<slot name="controls" />
		</div>

		<div ref="areaRef" class="wps-area">
			<div
				class="wps-frame"
				:class="`is-${device.frame}`"
				:style="{ width: `${box.width}px`, height: `${box.height}px` }"
				:aria-label="`${deviceTitle(device)} preview, ${device.width} by ${device.height}`"
			>
				<div class="wps-screen">
					<div class="wps-canvas" :style="{ width: `${canvas.width}px`, height: `${canvas.height}px` }">
						<slot name="backdrop" />
						<div class="wps-scaled" :style="{ transform: `scale(${canvas.scale})` }">
							<slot />
						</div>
						<slot name="overlay" />
					</div>
				</div>
			</div>
		</div>

		<p v-if="$slots.caption" class="wps-caption"><slot name="caption" /></p>
	</div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { Close, FullScreen } from "@element-plus/icons-vue";
import {
	DEFAULT_PREVIEW_DEVICE,
	DESIGN_HEIGHT,
	DESIGN_WIDTH,
	PREVIEW_DEVICES,
	deviceTitle,
	findPreviewDevice,
	fitBox,
	fitScale,
} from "@/utils/previewDevices";

// Where the last chosen screen size is remembered, so the admin keeps it across drawers and visits.
const STORAGE_KEY = "cpl.widgetPreviewDevice";
// Inline previews never grow taller than this, so a portrait phone does not push the page down.
const INLINE_MAX_HEIGHT = 440;
// Space the screen bezel takes around the screen.
const BEZEL = 12;

const props = defineProps({
	device: { type: String, default: "" },
});
const emit = defineEmits(["update:device", "fullscreen-change"]);

const readStored = () => {
	try {
		return window.localStorage.getItem(STORAGE_KEY) || "";
	} catch {
		return "";
	}
};

const deviceId = ref(props.device || readStored() || DEFAULT_PREVIEW_DEVICE);
const device = computed(() => findPreviewDevice(props.device || deviceId.value));

const rootRef = ref(null);
const areaRef = ref(null);
const fullscreen = ref(false);
// Used when the browser refuses native full screen (for example inside an iframe): the stage covers the window.
const pseudo = ref(false);
const area = ref({ width: 0, height: 0 });

const box = computed(() => {
	const availHeight = fullscreen.value ? area.value.height - BEZEL * 2 : INLINE_MAX_HEIGHT;
	return fitBox(area.value.width - BEZEL * 2, availHeight, device.value);
});

// The overlay always lives on a 1920x1080 canvas that is scaled to fit inside the screen, like the live widget page.
const canvas = computed(() => {
	const scale = fitScale(box.value.width, box.value.height);
	return { scale, width: Math.round(DESIGN_WIDTH * scale), height: Math.round(DESIGN_HEIGHT * scale) };
});

const chooseDevice = (id) => {
	deviceId.value = id;
	try {
		window.localStorage.setItem(STORAGE_KEY, id);
	} catch {
		// Remembering the choice is a convenience only.
	}
	emit("update:device", id);
};

const measure = () => {
	const el = areaRef.value;
	if (!el) return;
	area.value = { width: el.clientWidth, height: el.clientHeight };
};

const setFullscreen = (on) => {
	fullscreen.value = on;
	emit("fullscreen-change", on);
	nextTick(measure);
};

const exitFullscreen = async () => {
	if (document.fullscreenElement === rootRef.value) {
		await document.exitFullscreen?.();
		return;
	}
	if (pseudo.value) {
		pseudo.value = false;
		setFullscreen(false);
	}
};

const enterFullscreen = async () => {
	const el = rootRef.value;
	if (!el) return;
	try {
		if (!el.requestFullscreen) throw new Error("unsupported");
		await el.requestFullscreen();
	} catch {
		pseudo.value = true;
		setFullscreen(true);
	}
};

const toggleFullscreen = () => (fullscreen.value ? exitFullscreen() : enterFullscreen());

const onFullscreenChange = () => {
	const native = document.fullscreenElement === rootRef.value;
	if (native) {
		pseudo.value = false;
		setFullscreen(true);
	} else if (!pseudo.value && fullscreen.value) {
		setFullscreen(false);
	}
};

const onKeydown = (event) => {
	if (event.key === "Escape" && pseudo.value) exitFullscreen();
};

let resizeObserver = null;

onMounted(() => {
	measure();
	if (typeof ResizeObserver !== "undefined" && areaRef.value) {
		resizeObserver = new ResizeObserver(measure);
		resizeObserver.observe(areaRef.value);
	}
	document.addEventListener("fullscreenchange", onFullscreenChange);
	window.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
	resizeObserver?.disconnect();
	document.removeEventListener("fullscreenchange", onFullscreenChange);
	window.removeEventListener("keydown", onKeydown);
	if (document.fullscreenElement === rootRef.value) document.exitFullscreen?.();
});

defineExpose({ toggleFullscreen, device });
</script>

<style scoped>
.wps {
	display: flex;
	flex-direction: column;
	gap: 10px;
	min-width: 0;
}

.wps.is-fullscreen {
	position: fixed;
	inset: 0;
	z-index: 3000;
	width: 100%;
	height: 100%;
	padding: 12px 16px;
	gap: 8px;
	background: #0b1220;
	color: #e2e8f0;
}

.wps-toolbar {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 8px 12px;
}

.wps-title {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font-size: 13.5px;
}

.wps-devices {
	display: flex;
	flex-wrap: wrap;
	gap: 5px;
}

.wps-device-btn,
.wps-fs-btn {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 4px 10px;
	border: 1px solid var(--el-border-color, #cbd5e1);
	border-radius: 999px;
	background: transparent;
	color: inherit;
	font-size: 11.5px;
	font-weight: 600;
	cursor: pointer;
}

.wps-device-btn small {
	opacity: 0.7;
}

.wps-device-btn:hover,
.wps-fs-btn:hover {
	border-color: #d4a017;
}

.wps-device-btn.is-active {
	background: #0f172a;
	border-color: #0f172a;
	color: #f8fafc;
}

.is-fullscreen .wps-device-btn.is-active {
	background: #f8fafc;
	border-color: #f8fafc;
	color: #0f172a;
}

.wps-fs-btn {
	border-radius: 8px;
	border-color: #d4a017;
}

.wps-glyph {
	display: inline-block;
	width: 11px;
	height: 8px;
	border: 1.5px solid currentColor;
	border-radius: 2px;
}

.wps-glyph[data-frame="phone"] {
	width: 6px;
	height: 11px;
	border-radius: 2px;
}

.wps-glyph[data-frame="phone"][data-note="landscape"] {
	width: 11px;
	height: 6px;
}

.wps-glyph[data-frame="tablet"] {
	width: 11px;
	height: 8px;
}

.wps-glyph[data-frame="tablet"][data-note="portrait"] {
	width: 8px;
	height: 11px;
}

.wps-toolbar-end {
	display: inline-flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px 12px;
}

.wps-size {
	font-size: 11.5px;
	opacity: 0.65;
	font-variant-numeric: tabular-nums;
}

.wps-controls {
	min-width: 0;
}

.wps-area {
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 0;
	padding: 0;
}

.is-fullscreen .wps-area {
	flex: 1 1 auto;
	min-height: 0;
	overflow: hidden;
}

.wps-frame {
	flex: 0 0 auto;
	margin: 12px 0;
	border-radius: 4px;
	background: #05080f;
	box-shadow: 0 0 0 1px #1e293b;
}

.is-fullscreen .wps-frame {
	margin: 0;
}

.wps-frame.is-laptop {
	border-radius: 8px;
	box-shadow: 0 0 0 6px #1f2937, 0 14px 30px rgba(0, 0, 0, 0.35);
}

.wps-frame.is-tablet {
	border-radius: 14px;
	box-shadow: 0 0 0 9px #111827, 0 14px 30px rgba(0, 0, 0, 0.35);
}

.wps-frame.is-phone {
	border-radius: 20px;
	box-shadow: 0 0 0 8px #111827, 0 14px 30px rgba(0, 0, 0, 0.35);
}

.wps-screen {
	position: relative;
	display: grid;
	place-items: center;
	width: 100%;
	height: 100%;
	overflow: hidden;
	border-radius: inherit;
	background: radial-gradient(circle at 50% 42%, #2c3548 0%, #111827 100%);
}

.wps-canvas {
	position: relative;
	overflow: hidden;
}

.wps-scaled {
	position: absolute;
	left: 0;
	top: 0;
	width: 1920px;
	height: 1080px;
	transform-origin: top left;
	pointer-events: none;
}

.wps-caption {
	margin: 0;
	font-size: 11.5px;
	line-height: 1.45;
	opacity: 0.72;
}
</style>
