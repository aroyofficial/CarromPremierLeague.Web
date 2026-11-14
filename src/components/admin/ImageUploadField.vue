<template>
	<div class="image-field">
		<EntityImage :src="previewSrc" :name="name" :kind="kind" class="image-field-preview" :class="`is-${kind}`" :alt="`${label} preview`" />
		<div class="image-field-body">
			<div class="image-field-actions">
				<el-button size="small" type="primary" plain :disabled="busy || !canUpload" @click="choose">
					<el-icon class="me-1"><Upload /></el-icon>{{ hasPicture ? "Replace" : "Upload" }}
				</el-button>
				<el-button v-if="hasPicture" size="small" type="danger" plain :disabled="busy" @click="clear">
					<el-icon class="me-1"><Delete /></el-icon>Remove
				</el-button>
			</div>
			<el-progress v-if="busy && progress !== null" :percentage="progress" :stroke-width="6" class="image-field-progress" />
			<small class="image-field-hint">{{ hint }}</small>
		</div>
		<input ref="fileInput" type="file" class="d-none" :accept="IMAGE_ACCEPT" @change="picked" />
	</div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Delete, Upload } from "@element-plus/icons-vue";
import EntityImage from "@/components/EntityImage.vue";
import { useMediaStore } from "@/store/mediaStore";
import { apiErrorMessage } from "@/services/adminService";
import { IMAGE_ACCEPT, imageFileProblem } from "@/utils/media";

const props = defineProps({
	src: { type: String, default: "" },
	name: { type: String, default: "" },
	kind: { type: String, default: "player" },
	label: { type: String, default: "Picture" },
	// Without an entity id yet, the chosen file is held and handed to the parent through pendingFile.
	deferred: { type: Boolean, default: false },
	pendingFile: { type: Object, default: null },
	upload: { type: Function, default: null },
	remove: { type: Function, default: null },
});

const emit = defineEmits(["update:pendingFile", "changed"]);

const mediaStore = useMediaStore();
mediaStore.ensureDefaults();

const fileInput = ref(null);
const busy = ref(false);
const progress = ref(null);
const pendingPreview = ref("");

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
onBeforeUnmount(releasePreview);

const previewSrc = computed(() => (props.deferred ? pendingPreview.value : props.src));
const hasPicture = computed(() => Boolean(previewSrc.value));
const canUpload = computed(() => mediaStore.uploadsEnabled || !mediaStore.loaded);
const hint = computed(() => {
	if (mediaStore.loaded && !mediaStore.uploadsEnabled) return "Picture uploads are not set up on the server yet.";
	if (props.deferred && props.pendingFile) return "Uploads when you save.";
	return "JPEG, PNG or WebP, up to 5 MB. Without one, the default picture shows.";
});

const choose = () => fileInput.value?.click();

const picked = async (event) => {
	const file = event.target.files?.[0];
	event.target.value = "";
	if (!file) return;
	const problem = imageFileProblem(file);
	if (problem) {
		ElMessage.error(problem);
		return;
	}
	if (props.deferred) {
		emit("update:pendingFile", file);
		return;
	}
	busy.value = true;
	progress.value = 0;
	try {
		const response = await props.upload(file, (value) => {
			progress.value = value;
		});
		emit("changed", response?.data ?? null);
		ElMessage.success(`${props.label} updated`);
	} catch (error) {
		ElMessage.error(apiErrorMessage(error));
	} finally {
		busy.value = false;
		progress.value = null;
	}
};

const clear = async () => {
	if (props.deferred) {
		emit("update:pendingFile", null);
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
	busy.value = true;
	try {
		const response = await props.remove();
		emit("changed", response?.data ?? null);
		ElMessage.success(`${props.label} removed`);
	} catch (error) {
		ElMessage.error(apiErrorMessage(error));
	} finally {
		busy.value = false;
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
	object-fit: contain;
}

.image-field-body {
	display: flex;
	flex-direction: column;
	gap: 6px;
	min-width: 0;
	flex: 1;
}

.image-field-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.image-field-actions .el-button + .el-button {
	margin-left: 0;
}

.image-field-hint {
	color: var(--el-text-color-secondary);
	line-height: 1.35;
}

.image-field-progress {
	max-width: 240px;
}
</style>
