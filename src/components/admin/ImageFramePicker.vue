<template>
	<el-dialog
		:model-value="modelValue"
		title="Choose the frame"
		width="min(440px, 96vw)"
		append-to-body
		:close-on-click-modal="false"
		:close-on-press-escape="!working"
		:show-close="!working"
		@close="onDialogClose"
	>
		<p class="frame-help">Drag the circle to move it, drag outside it to move the picture, then zoom.</p>
		<div
			ref="stageRef"
			class="frame-stage"
			:style="{ width: `${viewSize}px`, height: `${viewSize}px` }"
			@pointerdown="onPointerDown"
			@pointermove="onPointerMove"
			@pointerup="onPointerUp"
			@pointercancel="onPointerUp"
			@wheel.prevent="onWheel"
		>
			<img
				v-if="src"
				ref="imageRef"
				:src="src"
				alt=""
				draggable="false"
				:style="imageStyle"
				@load="onLoad"
				@error="onError"
			/>
			<div class="frame-circle" :style="circleStyle" />
		</div>
		<div class="frame-sliders">
			<label>
				<span>Zoom</span>
				<el-slider v-model="zoom" :min="1" :max="4" :step="0.01" :disabled="!ready" />
			</label>
			<label>
				<span>Circle</span>
				<el-slider v-model="circleSize" :min="0.4" :max="0.96" :step="0.01" :disabled="!ready" />
			</label>
		</div>
		<p v-if="loadError" class="frame-error" role="alert">{{ loadError }}</p>
		<template #footer>
			<el-button :disabled="working" @click="cancel">Cancel</el-button>
			<el-button type="primary" :loading="working" :disabled="!ready || Boolean(loadError)" @click="confirm">Use this frame</el-button>
		</template>
	</el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from "vue";
import { clampFrame, cropToFile, frameFractions, imagePlacement, withCrop } from "@/utils/pictureFrame";

const props = defineProps({
	modelValue: { type: Boolean, default: false },
	src: { type: String, default: "" },
	sourceFile: { type: Object, default: null },
});

const emit = defineEmits(["update:modelValue", "confirm", "cancel"]);

const stageRef = ref(null);
const imageRef = ref(null);
const viewSize = ref(300);
const zoom = ref(1);
const circleSize = ref(0.78);
const pan = reactive({ x: 0, y: 0 });
const circle = reactive({ cx: 150, cy: 150, r: 117 });
const ready = ref(false);
const loadError = ref("");
const working = ref(false);
const drag = ref(null);
const confirmed = ref(false);

const reset = () => {
	viewSize.value = Math.max(220, Math.min(320, window.innerWidth - 64));
	zoom.value = 1;
	circleSize.value = 0.78;
	pan.x = 0;
	pan.y = 0;
	circle.cx = viewSize.value / 2;
	circle.cy = viewSize.value / 2;
	circle.r = (circleSize.value * viewSize.value) / 2;
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

const geometry = () => ({
	naturalWidth: imageRef.value?.naturalWidth || 1,
	naturalHeight: imageRef.value?.naturalHeight || 1,
	viewSize: viewSize.value,
	panX: pan.x,
	panY: pan.y,
	zoom: zoom.value,
	circle: { cx: circle.cx, cy: circle.cy, r: (circleSize.value * viewSize.value) / 2 },
});

const applyClamp = (next) => {
	pan.x = next.panX;
	pan.y = next.panY;
	circle.cx = next.circle.cx;
	circle.cy = next.circle.cy;
	circle.r = next.circle.r;
};

const reclamp = () => {
	if (!ready.value) return;
	applyClamp(clampFrame(geometry()));
};

watch([zoom, circleSize], () => reclamp());

const imageStyle = computed(() => {
	if (!ready.value) return { visibility: "hidden" };
	const placed = imagePlacement(geometry());
	return {
		left: `${placed.left}px`,
		top: `${placed.top}px`,
		width: `${placed.width}px`,
		height: `${placed.height}px`,
	};
});

const circleStyle = computed(() => ({
	left: `${circle.cx - circle.r}px`,
	top: `${circle.cy - circle.r}px`,
	width: `${circle.r * 2}px`,
	height: `${circle.r * 2}px`,
}));

const onLoad = () => {
	ready.value = true;
	loadError.value = "";
	reclamp();
};

const onError = () => {
	ready.value = false;
	loadError.value = "This picture could not be loaded. Use a JPEG, PNG or WebP file, or a public image link.";
};

const point = (event) => {
	const rect = stageRef.value.getBoundingClientRect();
	return { x: event.clientX - rect.left, y: event.clientY - rect.top };
};

const onPointerDown = (event) => {
	if (!ready.value) return;
	const { x, y } = point(event);
	const distance = Math.hypot(x - circle.cx, y - circle.cy);
	drag.value = { mode: distance <= circle.r ? "circle" : "image", x, y, panX: pan.x, panY: pan.y, cx: circle.cx, cy: circle.cy };
	event.currentTarget.setPointerCapture(event.pointerId);
};

const onPointerMove = (event) => {
	if (!drag.value) return;
	const { x, y } = point(event);
	if (drag.value.mode === "circle") {
		circle.cx = drag.value.cx + (x - drag.value.x);
		circle.cy = drag.value.cy + (y - drag.value.y);
	} else {
		pan.x = drag.value.panX + (x - drag.value.x);
		pan.y = drag.value.panY + (y - drag.value.y);
	}
	reclamp();
};

const onPointerUp = () => {
	drag.value = null;
};

const onWheel = (event) => {
	if (!ready.value) return;
	zoom.value = Math.min(4, Math.max(1, Math.round((zoom.value + (event.deltaY < 0 ? 0.08 : -0.08)) * 100) / 100));
	reclamp();
};

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
	const fractions = frameFractions(geometry());
	if (props.sourceFile) {
		working.value = true;
		try {
			const file = await cropToFile(imageRef.value, fractions, props.sourceFile.type);
			confirmed.value = true;
			close();
			emit("confirm", { file });
		} catch (error) {
			loadError.value = error?.message || "Could not prepare the picture.";
		} finally {
			working.value = false;
		}
		return;
	}
	confirmed.value = true;
	close();
	emit("confirm", { url: withCrop(props.src, fractions) });
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

.frame-circle {
	position: absolute;
	border: 2px solid #fff;
	border-radius: 50%;
	box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.55);
	pointer-events: none;
}

.frame-sliders {
	display: flex;
	flex-direction: column;
	gap: 4px;
	margin-top: 14px;
}

.frame-sliders label {
	display: grid;
	grid-template-columns: 64px minmax(0, 1fr);
	align-items: center;
	gap: 8px;
}

.frame-sliders span {
	color: var(--el-text-color-secondary);
	font-size: 13px;
}
</style>
