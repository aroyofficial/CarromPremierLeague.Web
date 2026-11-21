<template>
	<el-dialog
		:model-value="modelValue"
		:title="title"
		width="min(560px, 94vw)"
		append-to-body
		align-center
		:close-on-click-modal="false"
		:close-on-press-escape="false"
		:show-close="false"
		@closed="reset"
	>
		<p class="ip-secret-lead">{{ lead }}</p>

		<div class="ip-secret-box">
			<code data-test="secret-value">{{ secret }}</code>
			<el-button type="primary" size="small" @click="copy">
				<el-icon class="me-1"><CopyDocument /></el-icon>{{ copied ? "Copied" : "Copy" }}
			</el-button>
		</div>

		<p v-if="$slots.default" class="ip-secret-help"><slot /></p>

		<el-checkbox v-model="saved" class="ip-secret-saved">I have saved it somewhere safe</el-checkbox>

		<template #footer>
			<el-button type="primary" :disabled="!saved && !copied" @click="$emit('update:modelValue', false)">Done</el-button>
		</template>
	</el-dialog>
</template>

<script setup>
import { ref } from "vue";
import { CopyDocument } from "@element-plus/icons-vue";
import { notify } from "@/utils/notify";

const props = defineProps({
	modelValue: { type: Boolean, default: false },
	title: { type: String, required: true },
	lead: { type: String, required: true },
	secret: { type: String, default: "" },
	copiedMessage: { type: String, default: "Copied to the clipboard." },
});

defineEmits(["update:modelValue"]);

const saved = ref(false);
const copied = ref(false);

const reset = () => {
	saved.value = false;
	copied.value = false;
};

const copy = async () => {
	try {
		await navigator.clipboard.writeText(props.secret);
		copied.value = true;
		notify.success(props.copiedMessage);
	} catch {
		notify.warning("Could not copy. Select the text and copy it yourself.");
	}
};
</script>
