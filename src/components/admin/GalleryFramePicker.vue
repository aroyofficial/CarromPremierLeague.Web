<template>
	<el-dialog
		:model-value="modelValue"
		title="Choose the frame"
		width="min(760px, 96vw)"
		append-to-body
		:close-on-click-modal="false"
		:close-on-press-escape="!working"
		:show-close="!working"
		@close="onDialogClose"
	>
		<p class="frame-help">The whole picture starts selected. Drag the frame to move it, drag a corner to resize, and drag outside it to move the picture.</p>
		<div
			ref="stageRef"
			class="frame-stage"
			@pointerdown="onPointerDown"
			@pointermove="onPointerMove"
			@pointerup="onPointerUp"
			@pointercancel="onPointerUp"
			@wheel.prevent="onWheel"
		>
			<img v-if="src" ref="imageRef" :src="src" alt="" draggable="false" :style="imageStyle" @load="onLoad" @error="onError" />
			<div v-if="ready" class="frame-rect" :style="rectStyle">
				<span class="handle is-nw"></span>
				<span class="handle is-ne"></span>
				<span class="handle is-sw"></span>
				<span class="handle is-se"></span>
			</div>
		</div>
		<label class="zoom-row">
			<span>Zoom</span>
			<el-slider v-model="zoom" :min="1" :max="4" :step="0.01" :disabled="!ready" />
		</label>
		<p v-if="loadError" class="frame-error" role="alert">{{ loadError }}</p>
		<template #footer>
			<el-button :disabled="working" @click="cancel">Cancel</el-button>
			<el-button type="primary" :loading="working" :disabled="!ready || Boolean(loadError)" @click="confirm">Use this frame</el-button>
		</template>
	</el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from "vue";
import { cropRectToFile, withCrop } from "@/utils/pictureFrame";

const props = defineProps({
	modelValue: { type: Boolean, default: false },
	src: { type: String, default: "" },
	sourceFile: { type: Object, default: null },
});

const emit = defineEmits(["update:modelValue", "confirm", "cancel"]);

const stageRef = ref(null);
const imageRef = ref(null);
const zoom = ref(1);
const pan = reactive({ x: 0, y: 0 });
const natural = reactive({ w: 1, h: 1 });
const stage = reactive({ w: 680, h: 420 });
const fractions = reactive({ x: 0, y: 0, w: 1, h: 1 });
const ready = ref(false);
const loadError = ref("");
const working = ref(false);
const drag = ref(null);
const confirmed = ref(false);

const reset = () => {
	stage.w = Math.max(280, Math.min(680, window.innerWidth - 80));
	stage.h = Math.max(220, Math.min(420, window.innerHeight - 280));
	zoom.value = 1;
	pan.x = 0;
	pan.y = 0;
	fractions.x = 0;
	fractions.y = 0;
	fractions.w = 1;
	fractions.h = 1;
	ready.value = false;
	loadError.value = "";
	working.value = false;
	drag.value = null;
};

watch(
	() => props.modelValue,
	(open) => {
		if (open) reset();
	},
);

const placement = computed(() => {
	const fit = Math.min(stage.w / natural.w, stage.h / natural.h);
	const scale = fit * zoom.value;
	const width = natural.w * scale;
	const height = natural.h * scale;
	return {
		width,
		height,
		left: stage.w / 2 + pan.x - width / 2,
		top: stage.h / 2 + pan.y - height / 2,
	};
});

const imageStyle = computed(() => ({
	left: `${placement.value.left}px`,
	top: `${placement.value.top}px`,
	width: `${placement.value.width}px`,
	height: `${placement.value.height}px`,
}));

const rectStyle = computed(() => {
	const place = placement.value;
	return {
		left: `${place.left + fractions.x * place.width}px`,
		top: `${place.top + fractions.y * place.height}px`,
		width: `${fractions.w * place.width}px`,
		height: `${fractions.h * place.height}px`,
	};
});

const onLoad = () => {
	const rect = stageRef.value?.getBoundingClientRect();
	if (rect?.width) {
		stage.w = rect.width;
		stage.h = rect.height;
	}
	natural.w = imageRef.value?.naturalWidth || 1;
	natural.h = imageRef.value?.naturalHeight || 1;
	ready.value = true;
	loadError.value = "";
};

const onError = () => {
	ready.value = false;
	loadError.value = "That picture could not be opened.";
};

const point = (event) => {
	const bounds = stageRef.value.getBoundingClientRect();
	return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
};

const screenBox = () => {
	const place = placement.value;
	return {
		left: place.left + fractions.x * place.width,
		top: place.top + fractions.y * place.height,
		width: fractions.w * place.width,
		height: fractions.h * place.height,
	};
};

const hit = (x, y) => {
	const box = screenBox();
	const edge = 16;
	const nearL = Math.abs(x - box.left) <= edge;
	const nearR = Math.abs(x - (box.left + box.width)) <= edge;
	const nearT = Math.abs(y - box.top) <= edge;
	const nearB = Math.abs(y - (box.top + box.height)) <= edge;
	const insideX = x >= box.left - edge && x <= box.left + box.width + edge;
	const insideY = y >= box.top - edge && y <= box.top + box.height + edge;
	if (nearL && nearT) return "nw";
	if (nearR && nearT) return "ne";
	if (nearL && nearB) return "sw";
	if (nearR && nearB) return "se";
	if (insideX && insideY && x >= box.left && x <= box.left + box.width && y >= box.top && y <= box.top + box.height) return "move";
	return "pan";
};

const onPointerDown = (event) => {
	if (!ready.value) return;
	const { x, y } = point(event);
	drag.value = {
		mode: hit(x, y),
		startX: x,
		startY: y,
		panX: pan.x,
		panY: pan.y,
		fx: fractions.x,
		fy: fractions.y,
		fw: fractions.w,
		fh: fractions.h,
	};
	event.currentTarget.setPointerCapture(event.pointerId);
};

const clampFractions = (next) => {
	const min = 0.05;
	let { x, y, w, h } = next;
	w = Math.min(Math.max(w, min), 1);
	h = Math.min(Math.max(h, min), 1);
	x = Math.min(Math.max(x, 0), 1 - w);
	y = Math.min(Math.max(y, 0), 1 - h);
	fractions.x = x;
	fractions.y = y;
	fractions.w = w;
	fractions.h = h;
};

const onPointerMove = (event) => {
	if (!drag.value) return;
	const { x, y } = point(event);
	const dx = x - drag.value.startX;
	const dy = y - drag.value.startY;
	const place = placement.value;
	if (drag.value.mode === "pan") {
		pan.x = drag.value.panX + dx;
		pan.y = drag.value.panY + dy;
		return;
	}
	const fx = dx / place.width;
	const fy = dy / place.height;
	if (drag.value.mode === "move") {
		clampFractions({ x: drag.value.fx + fx, y: drag.value.fy + fy, w: drag.value.fw, h: drag.value.fh });
		return;
	}
	let left = drag.value.fx;
	let top = drag.value.fy;
	let right = drag.value.fx + drag.value.fw;
	let bottom = drag.value.fy + drag.value.fh;
	if (drag.value.mode.includes("w")) left += fx;
	if (drag.value.mode.includes("e")) right += fx;
	if (drag.value.mode.includes("n")) top += fy;
	if (drag.value.mode.includes("s")) bottom += fy;
	clampFractions({ x: left, y: top, w: right - left, h: bottom - top });
};

const onPointerUp = () => {
	drag.value = null;
};

const onWheel = (event) => {
	if (!ready.value) return;
	zoom.value = Math.min(4, Math.max(1, Math.round((zoom.value + (event.deltaY < 0 ? 0.08 : -0.08)) * 100) / 100));
};

const isFull = () => fractions.x < 0.01 && fractions.y < 0.01 && fractions.w > 0.98 && fractions.h > 0.98;

const close = () => emit("update:modelValue", false);

const onDialogClose = () => {
	if (confirmed.value) {
		confirmed.value = false;
		return;
	}
	emit("cancel");
};

const cancel = () => {
	if (working.value) return;
	close();
};

const confirm = async () => {
	if (!ready.value || !imageRef.value) return;
	const frame = { x: fractions.x, y: fractions.y, w: fractions.w, h: fractions.h };
	if (props.sourceFile && isFull()) {
		confirmed.value = true;
		close();
		emit("confirm", { file: props.sourceFile, width: natural.w, height: natural.h });
		return;
	}
	if (props.sourceFile) {
		working.value = true;
		try {
			const cut = await cropRectToFile(imageRef.value, frame, props.sourceFile.type);
			confirmed.value = true;
			close();
			emit("confirm", cut);
		} catch (error) {
			loadError.value = error?.message || "Could not prepare the picture.";
		} finally {
			working.value = false;
		}
		return;
	}
	const width = Math.max(1, Math.round(frame.w * natural.w));
	const height = Math.max(1, Math.round(frame.h * natural.h));
	confirmed.value = true;
	close();
	emit("confirm", { url: isFull() ? props.src.split("#")[0] : withCrop(props.src, frame), width, height });
};
</script>

<style scoped>
.frame-help,
.frame-error {
	margin: 0 0 12px;
	line-height: 1.4;
}

.frame-help {
	color: var(--el-text-color-secondary);
}

.frame-error {
	color: var(--el-color-danger);
}

.frame-stage {
	position: relative;
	width: min(680px, 100%);
	height: min(420px, 58vh);
	margin: 0 auto;
	overflow: hidden;
	border-radius: 12px;
	background: #111;
	touch-action: none;
	cursor: grab;
	user-select: none;
}

.frame-stage img {
	position: absolute;
	max-width: none;
	pointer-events: none;
}

.frame-rect {
	position: absolute;
	border: 2px solid #fff;
	box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.55);
	cursor: move;
}

.handle {
	position: absolute;
	width: 14px;
	height: 14px;
	background: #fff;
	border-radius: 3px;
}

.is-nw { left: -7px; top: -7px; cursor: nwse-resize; }
.is-ne { right: -7px; top: -7px; cursor: nesw-resize; }
.is-sw { left: -7px; bottom: -7px; cursor: nesw-resize; }
.is-se { right: -7px; bottom: -7px; cursor: nwse-resize; }

.zoom-row {
	display: grid;
	grid-template-columns: 64px minmax(0, 1fr);
	align-items: center;
	gap: 8px;
	margin-top: 14px;
}

.zoom-row span {
	color: var(--el-text-color-secondary);
	font-size: 13px;
}
</style>
