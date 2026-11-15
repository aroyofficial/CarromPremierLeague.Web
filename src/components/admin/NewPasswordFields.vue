<template>
	<div class="new-password">
		<input
			v-if="username"
			class="visually-hidden"
			type="text"
			name="username"
			autocomplete="username"
			:value="username"
			tabindex="-1"
			aria-hidden="true"
			readonly
		/>

		<div class="password-head">
			<label :for="`${uid}-password`" class="password-label">New password</label>
			<div class="password-tools">
				<button type="button" class="tool" :disabled="disabled" @click="generate">
					<el-icon aria-hidden="true"><MagicStick /></el-icon>Generate
				</button>
				<button type="button" class="tool" :disabled="disabled || !password" @click="copy">
					<el-icon aria-hidden="true"><DocumentCopy /></el-icon>{{ copied ? "Copied" : "Copy" }}
				</button>
				<button
					type="button"
					class="tool"
					:aria-pressed="reveal"
					:disabled="disabled"
					@click="reveal = !reveal"
				>
					<el-icon aria-hidden="true"><View v-if="!reveal" /><Hide v-else /></el-icon>{{ reveal ? "Hide" : "Show" }}
				</button>
			</div>
		</div>
		<el-form-item :prop="passwordProp" class="password-item">
			<el-input
				:id="`${uid}-password`"
				:model-value="password"
				:type="reveal ? 'text' : 'password'"
				name="new-password"
				autocomplete="new-password"
				:prefix-icon="Lock"
				placeholder="At least 12 characters"
				:disabled="disabled"
				:aria-describedby="`${uid}-strength ${uid}-checks`"
				@update:model-value="$emit('update:password', $event)"
			/>
		</el-form-item>

		<div :id="`${uid}-strength`" class="strength" :data-score="strength.score" aria-live="polite">
			<div class="strength-bar" aria-hidden="true">
				<span v-for="index in 5" :key="index" :class="{ 'is-on': index <= strength.score }"></span>
			</div>
			<div class="strength-text">
				<strong>{{ strength.label || "Password strength" }}</strong>
				<span>{{ tip }}</span>
			</div>
		</div>

		<el-form-item label="Confirm password" :prop="confirmProp">
			<el-input
				:model-value="confirm"
				:type="reveal ? 'text' : 'password'"
				name="confirm-password"
				autocomplete="new-password"
				:prefix-icon="Lock"
				placeholder="Type it again"
				:disabled="disabled"
				@update:model-value="$emit('update:confirm', $event)"
			/>
		</el-form-item>

		<ul :id="`${uid}-checks`" class="checks" aria-label="Password rules">
			<li v-for="check in checks" :key="check.id" :class="{ 'is-met': check.met, 'is-optional': !check.required }">
				<el-icon aria-hidden="true"><CircleCheckFilled v-if="check.met" /><CircleClose v-else /></el-icon>
				<span>{{ check.label }}</span>
				<span class="visually-hidden">{{ check.met ? "done" : check.required ? "required" : "suggested" }}</span>
			</li>
		</ul>

		<label v-if="offerSave" class="save-option">
			<el-checkbox :model-value="save" :disabled="disabled" @update:model-value="$emit('update:save', $event)" />
			<span>
				<strong>Save in this browser's password manager</strong>
				<small>{{ saveNote }}</small>
			</span>
		</label>
		<p class="visually-hidden" aria-live="polite">{{ announcement }}</p>
	</div>
</template>

<script setup>
import { computed, ref } from "vue";
import { CircleCheckFilled, CircleClose, DocumentCopy, Hide, Lock, MagicStick, View } from "@element-plus/icons-vue";
import { passwordChecks, passwordStrength } from "@/utils/passwordRules";
import { canStoreCredential, generatePassword } from "@/utils/passwordTools";

const props = defineProps({
	password: { type: String, default: "" },
	confirm: { type: String, default: "" },
	passwordProp: { type: String, default: "password" },
	confirmProp: { type: String, default: "confirm" },
	username: { type: String, default: "" },
	save: { type: Boolean, default: true },
	offerSave: { type: Boolean, default: true },
	disabled: { type: Boolean, default: false },
});
const emit = defineEmits(["update:password", "update:confirm", "update:save"]);

const uid = `np-${Math.random().toString(36).slice(2, 8)}`;
const reveal = ref(false);
const copied = ref(false);
const announcement = ref("");
const strength = computed(() => passwordStrength(props.password));
const checks = computed(() => passwordChecks(props.password, props.confirm));
const saveNote = canStoreCredential()
	? "Your browser asks to save it after the change."
	: "Your browser can offer to save it once the change goes through.";

const tip = computed(() => {
	const value = props.password || "";
	if (!value) return "Type one or press Generate for a strong random password.";
	if (value.length < 12) return `${12 - value.length} more character${12 - value.length === 1 ? "" : "s"} needed.`;
	if (!/[a-z]/.test(value) || !/[A-Z]/.test(value)) return "Mix upper and lower case letters.";
	if (!/\d/.test(value)) return "Add a number.";
	if (!/[^A-Za-z0-9]/.test(value)) return "Add a symbol.";
	if (value.length < 16) return "Longer is stronger. 16 or more characters is best.";
	return "Great password.";
});

const generate = () => {
	const value = generatePassword();
	emit("update:password", value);
	emit("update:confirm", value);
	reveal.value = true;
	copied.value = false;
	announcement.value = "A strong password was generated and filled in both fields.";
};

const copy = async () => {
	try {
		await navigator.clipboard.writeText(props.password);
		copied.value = true;
		announcement.value = "Password copied.";
		window.setTimeout(() => {
			copied.value = false;
		}, 2000);
	} catch {
		announcement.value = "The password could not be copied. Select it and copy it instead.";
		reveal.value = true;
	}
};
</script>

<style scoped>
.password-head {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 6px 12px;
	margin-bottom: 8px;
}

.password-label {
	font-size: 14px;
	font-weight: 500;
	color: var(--el-text-color-regular);
}

.password-tools {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}

.tool {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	padding: 4px 10px;
	border: 1px solid var(--cpl-line);
	border-radius: 999px;
	background: #fff;
	color: var(--cpl-navy-700);
	font-size: 12px;
	font-weight: 600;
	cursor: pointer;
	transition: background 0.15s ease, border-color 0.15s ease;
}

.tool:hover:not(:disabled) {
	border-color: var(--cpl-gold-500);
	background: var(--cpl-gold-100);
}

.tool:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.tool:focus-visible {
	outline: 2px solid var(--cpl-gold-500);
	outline-offset: 2px;
}

.password-item {
	margin-bottom: 12px;
}

.strength {
	display: grid;
	gap: 6px;
	margin: 0 0 18px;
	font-size: 12px;
	color: var(--cpl-ink-600);
}

.strength-bar {
	display: grid;
	grid-template-columns: repeat(5, 1fr);
	gap: 4px;
}

.strength-bar span {
	height: 6px;
	border-radius: 999px;
	background: var(--cpl-line);
	transition: background 0.2s ease;
}

.strength-text {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	gap: 4px 12px;
}

.strength-text strong {
	color: var(--cpl-ink-900);
}

.strength[data-score="1"] .is-on { background: var(--cpl-red-500); }
.strength[data-score="2"] .is-on { background: #f08c2e; }
.strength[data-score="3"] .is-on { background: var(--cpl-gold-500); }
.strength[data-score="4"] .is-on,
.strength[data-score="5"] .is-on { background: #1f9d55; }

.checks {
	list-style: none;
	margin: -4px 0 16px;
	padding: 12px 14px;
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	gap: 6px 14px;
	background: var(--cpl-surface-muted);
	border-radius: var(--cpl-radius-md);
	font-size: 13px;
	color: var(--cpl-ink-600);
}

.checks li {
	display: flex;
	align-items: center;
	gap: 8px;
}

.checks li .el-icon {
	flex: none;
	color: var(--cpl-ink-400);
}

.checks li.is-met {
	color: var(--cpl-ink-900);
}

.checks li.is-met .el-icon {
	color: #1f9d55;
}

.checks li.is-optional:not(.is-met) {
	opacity: 0.8;
}

.save-option {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	margin: 0 0 18px;
	padding: 10px 12px;
	border: 1px solid var(--cpl-line);
	border-radius: var(--cpl-radius-md);
	cursor: pointer;
}

.save-option :deep(.el-checkbox) {
	height: auto;
	margin-top: 1px;
}

.save-option span {
	display: grid;
	gap: 2px;
	font-size: 13px;
	color: var(--cpl-ink-900);
}

.save-option small {
	color: var(--cpl-ink-600);
	font-size: 12px;
}
</style>
