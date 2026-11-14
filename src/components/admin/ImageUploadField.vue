<template>
	<div class="image-field">
		<EntityImage :src="previewSrc" :name="name" :kind="kind" class="image-field-preview" :class="`is-${kind}`" :alt="`${label} preview`" />
		<div class="image-field-body">
			<div class="image-field-actions">
				<el-button size="small" type="primary" plain :disabled="locked || !canUpload" @click="choose">
					<el-icon class="me-1"><Upload /></el-icon>{{ hasPicture ? "Replace" : "Upload" }}
				</el-button>
				<el-button size="small" plain :disabled="locked" @click="linkOpen = !linkOpen">
					<el-icon class="me-1"><Link /></el-icon>Link
				</el-button>
				<el-button v-if="hasPicture" size="small" type="danger" plain :disabled="locked" @click="clear">
					<el-icon class="me-1"><Delete /></el-icon>Remove
				</el-button>
			</div>
			<div v-if="linkOpen" class="image-field-link">
				<el-input
					v-model="linkText"
					size="small"
					placeholder="https://example.com/picture.png"
					:disabled="locked"
					@keyup.enter="applyLink"
				/>
				<el-button size="small" type="primary" :disabled="locked" @click="applyLink">Use</el-button>
			</div>
			<small v-if="deferred && pendingLink" class="image-field-hint image-field-link-value">{{ pendingLink }}</small>
			<small class="image-field-hint">{{ hint }}</small>
		</div>
		<input ref="fileInput" type="file" class="d-none" :accept="IMAGE_ACCEPT" @change="picked" />
		<ImageFramePicker v-model="pickerOpen" :src="pickerSrc" :source-file="pickerFile" @confirm="frameChosen" @cancel="frameCancelled" />
		<Teleport to="body">
			<div v-if="showOverlay" class="upload-overlay" role="status" :aria-live="visibleError ? 'assertive' : 'polite'" :aria-busy="!visibleError">
				<div class="upload-card" :class="{ 'is-error': visibleError }">
					<template v-if="visibleError">
						<p class="upload-status">The picture was not saved</p>
						<p class="upload-error">{{ visibleError }}</p>
						<el-button type="primary" @click="dismissError">Close</el-button>
					</template>
					<template v-else>
						<el-progress v-if="showBar" :percentage="shownProgress" :stroke-width="10" />
						<span v-else class="upload-spinner" aria-hidden="true" />
						<p class="upload-status">{{ showBar ? `Uploading ${shownProgress}%` : "Saving picture…" }}</p>
						<small>Stay on this page until it finishes. If this fails, the reason will stay here.</small>
					</template>
				</div>
			</div>
		</Teleport>
	</div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Delete, Link, Upload } from "@element-plus/icons-vue";
import EntityImage from "@/components/EntityImage.vue";
import ImageFramePicker from "@/components/admin/ImageFramePicker.vue";
import { useMediaStore } from "@/store/mediaStore";
import { apiErrorMessage } from "@/services/adminService";
import { IMAGE_ACCEPT, imageFileProblem, publicImageLinkProblem } from "@/utils/media";
import { useUploadLeaveGuard } from "@/utils/uploadGuard";

const props = defineProps({
	src: { type: String, default: "" },
	name: { type: String, default: "" },
	kind: { type: String, default: "player" },
	label: { type: String, default: "Picture" },
	deferred: { type: Boolean, default: false },
	pendingFile: { type: Object, default: null },
	pendingLink: { type: String, default: "" },
	externalBusy: { type: Boolean, default: false },
	externalProgress: { default: null },
	externalError: { type: String, default: "" },
	upload: { type: Function, default: null },
	uploadLink: { type: Function, default: null },
	remove: { type: Function, default: null },
});

const emit = defineEmits(["update:pendingFile", "update:pendingLink", "update:busy", "changed", "dismiss-error"]);

const mediaStore = useMediaStore();
mediaStore.ensureDefaults();

const fileInput = ref(null);
const busy = ref(false);
const overlay = ref(false);
const progress = ref(null);
const pendingPreview = ref("");
const linkOpen = ref(false);
const linkText = ref("");
const failure = ref("");
const pickerOpen = ref(false);
const pickerSrc = ref("");
const pickerFile = ref(null);
let pickerObjectUrl = "";

const visibleError = computed(() => failure.value || props.externalError || "");
const locked = computed(() => busy.value || props.externalBusy || pickerOpen.value);
const showOverlay = computed(() => overlay.value || props.externalBusy || Boolean(visibleError.value));
const shownProgress = computed(() => (overlay.value ? progress.value : props.externalProgress));
const showBar = computed(() => typeof shownProgress.value === "number" && shownProgress.value < 100 && !visibleError.value);

useUploadLeaveGuard(computed(() => (overlay.value || props.externalBusy) && !visibleError.value));
watch(busy, (value) => emit("update:busy", value));

const releasePreview = () => {
	if (pendingPreview.value) URL.revokeObjectURL(pendingPreview.value);
	pendingPreview.value = "";
};

watch(
	() => props.pendingFile,
	(file) => {
		releasePreview();
		if (file) pendingPreview.value = URL.createObjectURL(file);
	},
	{ immediate: true },
);
onBeforeUnmount(() => {
	releasePreview();
	releasePickerUrl();
});

const previewSrc = computed(() => (props.deferred ? pendingPreview.value || props.pendingLink : props.src));
const hasPicture = computed(() => Boolean(previewSrc.value));
const canUpload = computed(() => mediaStore.uploadsEnabled || !mediaStore.loaded);
const hint = computed(() => {
	if (mediaStore.loaded && !mediaStore.uploadsEnabled) return "File upload is not set up on the server. A public link can still be shown with the frame you choose.";
	if (props.deferred && props.pendingFile) return "Uploads when you save.";
	if (props.deferred && props.pendingLink) return "Shows this frame when you save. The link itself is not uploaded.";
	return "JPEG, PNG or WebP, up to 5 MB. A public link is not uploaded; only the frame you choose is shown.";
});

const releasePickerUrl = () => {
	if (pickerObjectUrl) URL.revokeObjectURL(pickerObjectUrl);
	pickerObjectUrl = "";
};

const dismissError = () => {
	failure.value = "";
	busy.value = false;
	overlay.value = false;
	progress.value = null;
	emit("dismiss-error");
};

const fail = (error) => {
	failure.value = apiErrorMessage(error);
	progress.value = null;
	overlay.value = true;
	busy.value = true;
};

const openPicker = (src, file) => {
	releasePickerUrl();
	if (file) pickerObjectUrl = src;
	pickerSrc.value = src;
	pickerFile.value = file;
	pickerOpen.value = true;
};

const frameCancelled = () => {
	releasePickerUrl();
	pickerFile.value = null;
	pickerSrc.value = "";
};

const choose = () => fileInput.value?.click();

const picked = (event) => {
	const file = event.target.files?.[0];
	event.target.value = "";
	if (!file) return;
	const problem = imageFileProblem(file);
	if (problem) {
		failure.value = problem;
		overlay.value = true;
		busy.value = true;
		return;
	}
	openPicker(URL.createObjectURL(file), file);
};

const applyLink = () => {
	const problem = publicImageLinkProblem(linkText.value);
	if (problem) {
		failure.value = problem;
		overlay.value = true;
		busy.value = true;
		return;
	}
	openPicker(linkText.value.trim(), null);
};

const remember = async (run, success) => {
	failure.value = "";
	busy.value = true;
	overlay.value = true;
	progress.value = null;
	try {
		const response = await run();
		emit("changed", response?.data ?? null);
		ElMessage.success(success);
		busy.value = false;
		overlay.value = false;
		progress.value = null;
	} catch (error) {
		fail(error);
	}
};

const frameChosen = async (result) => {
	releasePickerUrl();
	pickerSrc.value = "";
	pickerFile.value = null;
	if (result?.file) {
		if (props.deferred) {
			emit("update:pendingLink", "");
			emit("update:pendingFile", result.file);
			linkOpen.value = false;
			return;
		}
		await remember(
			() => props.upload(result.file, (value) => { progress.value = value; }),
			`${props.label} updated`,
		);
		return;
	}
	if (result?.url) {
		if (props.deferred) {
			emit("update:pendingFile", null);
			emit("update:pendingLink", result.url);
			linkText.value = "";
			linkOpen.value = false;
			return;
		}
		if (!props.uploadLink) {
			fail("Saving a link is not available.");
			return;
		}
		await remember(() => props.uploadLink(result.url), `${props.label} updated`);
		if (!failure.value) {
			linkText.value = "";
			linkOpen.value = false;
		}
	}
};

const clear = async () => {
	if (props.deferred) {
		emit("update:pendingFile", null);
		emit("update:pendingLink", "");
		return;
	}
	const confirmed = await ElMessageBox.confirm(
		`Remove this ${props.label.toLowerCase()}? The default picture will show instead.`,
		`Remove ${props.label.toLowerCase()}`,
		{ confirmButtonText: "Remove", cancelButtonText: "Cancel", type: "warning", confirmButtonClass: "el-button--danger" },
	)
		.then(() => true)
		.catch(() => false);
	if (!confirmed) return;
	failure.value = "";
	busy.value = true;
	overlay.value = true;
	progress.value = null;
	try {
		const response = await props.remove();
		emit("changed", response?.data ?? null);
		ElMessage.success(`${props.label} removed`);
		busy.value = false;
		overlay.value = false;
	} catch (error) {
		fail(error);
	}
};
</script>

<style scoped>
.image-field {
	display: flex;
	align-items: center;
	gap: 14px;
	width: 100%;
}

.image-field-preview {
	width: 72px;
	height: 72px;
	flex: 0 0 72px;
	object-fit: cover;
	border: 1px solid var(--cpl-line);
	background: #fff;
}

.image-field-preview.is-player {
	border-radius: 50%;
}

.image-field-preview.is-team {
	border-radius: 14px;
}

.image-field-preview.is-team :deep(img:not(.is-framed)) {
	object-fit: contain;
}

.image-field-body {
	display: flex;
	flex-direction: column;
	gap: 6px;
	min-width: 0;
	flex: 1;
}

.image-field-actions,
.image-field-link {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.image-field-actions .el-button + .el-button,
.image-field-link .el-button {
	margin-left: 0;
}

.image-field-link .el-input {
	flex: 1 1 180px;
}

.image-field-hint {
	color: var(--el-text-color-secondary);
	line-height: 1.35;
}

.image-field-link-value {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.upload-overlay {
	position: fixed;
	inset: 0;
	z-index: 4000;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 16px;
	background: rgba(15, 23, 42, 0.45);
}

.upload-card {
	width: min(320px, 100%);
	padding: 22px 22px 18px;
	border-radius: 16px;
	background: var(--el-bg-color, #fff);
	box-shadow: 0 16px 40px rgba(15, 23, 42, 0.25);
	text-align: center;
}

.upload-card small {
	color: var(--el-text-color-secondary);
}

.upload-status {
	margin: 12px 0 4px;
	font-weight: 600;
}

.upload-error {
	margin: 0 0 14px;
	color: var(--el-color-danger);
	line-height: 1.4;
	white-space: pre-wrap;
}

.upload-spinner {
	display: inline-block;
	width: 36px;
	height: 36px;
	border: 3px solid var(--el-border-color);
	border-top-color: var(--el-color-primary);
	border-radius: 50%;
	animation: upload-spin 0.8s linear infinite;
}

@keyframes upload-spin {
	to {
		transform: rotate(360deg);
	}
}
</style>
