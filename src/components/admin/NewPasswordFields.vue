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

		<div class="field-head">
			<label :for="`${uid}-password`" class="field-label">New password</label>
			<button type="button" class="suggest" :disabled="disabled" @click="generate">
				<el-icon aria-hidden="true"><MagicStick /></el-icon>Generate
			</button>
		</div>
		<el-form-item :prop="passwordProp" class="password-item">
			<el-input
				:id="`${uid}-password`"
				:model-value="password"
				:type="reveal ? 'text' : 'password'"
				name="new-password"
				autocomplete="new-password"
				placeholder="At least 12 characters"
				:disabled="disabled"
				:aria-describedby="`${uid}-meter ${uid}-rules`"
				:class="{ 'is-revealed': reveal }"
				@update:model-value="setPassword"
			>
				<template #suffix>
					<button
						v-if="reveal && password"
						type="button"
						class="field-icon"
						:aria-label="copied ? 'Copied' : 'Copy password'"
						:title="copied ? 'Copied' : 'Copy'"
						:disabled="disabled"
						@click="copy"
					>
						<el-icon><Check v-if="copied" /><DocumentCopy v-else /></el-icon>
					</button>
					<button
						type="button"
						class="field-icon"
						:aria-label="reveal ? 'Hide password' : 'Show password'"
						:aria-pressed="reveal"
						:title="reveal ? 'Hide' : 'Show'"
						:disabled="disabled"
						@click="toggleReveal"
					>
						<el-icon><Hide v-if="reveal" /><View v-else /></el-icon>
					</button>
				</template>
			</el-input>
		</el-form-item>

		<div :id="`${uid}-meter`" class="meter" :data-score="strength.score" aria-live="polite">
			<div class="meter-track" aria-hidden="true">
				<span class="meter-fill" :style="{ width: `${(strength.score / 5) * 100}%` }"></span>
			</div>
			<p class="meter-text">
				<span class="meter-tip">{{ tip }}</span>
				<strong v-if="strength.label" class="meter-label">{{ strength.label }}</strong>
			</p>
		</div>
		<ul :id="`${uid}-rules`" class="visually-hidden">
			<li v-for="check in checks" :key="check.id">{{ check.label }}: {{ check.met ? "done" : "not yet" }}</li>
		</ul>

		<el-form-item v-if="!reveal" label="Confirm password" :prop="confirmProp" class="confirm-item">
			<el-input
				:model-value="confirm"
				type="password"
				name="confirm-password"
				autocomplete="new-password"
				placeholder="Type it again"
				:disabled="disabled"
				@update:model-value="$emit('update:confirm', $event)"
			>
				<template #suffix>
					<el-icon v-if="matches" class="match-icon" aria-label="Passwords match"><CircleCheckFilled /></el-icon>
				</template>
			</el-input>
		</el-form-item>

		<el-checkbox
			v-if="offerSave"
			class="save-option"
			:model-value="save"
			:disabled="disabled"
			@update:model-value="$emit('update:save', $event)"
		>
			Save to this browser's password manager
		</el-checkbox>
		<p class="visually-hidden" aria-live="polite">{{ announcement }}</p>
	</div>
</template>

<script setup>
import { computed, ref } from "vue";
import { Check, CircleCheckFilled, DocumentCopy, Hide, MagicStick, View } from "@element-plus/icons-vue";
import { MIN_PASSWORD_LENGTH, passwordChecks, passwordStrength } from "@/utils/passwordRules";
import { generatePassword } from "@/utils/passwordTools";

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
const matches = computed(() => Boolean(props.password) && props.password === props.confirm);

const tip = computed(() => {
	const value = props.password || "";
	const short = MIN_PASSWORD_LENGTH - value.length;
	if (!value) return `Use ${MIN_PASSWORD_LENGTH} or more characters, or generate one.`;
	if (short > 0) return `${short} more character${short === 1 ? "" : "s"}`;
	if (!/[a-z]/.test(value) || !/[A-Z]/.test(value)) return "Add upper and lower case letters";
	if (!/\d/.test(value)) return "Add a number";
	if (!/[^A-Za-z0-9]/.test(value)) return "Add a symbol";
	if (value.length < 16) return "16 or more characters is even better";
	return "Good to go";
});

// A visible password needs no retyping, so the confirm field follows it.
const setPassword = (value) => {
	emit("update:password", value);
	if (reveal.value) emit("update:confirm", value);
};

const toggleReveal = () => {
	reveal.value = !reveal.value;
	if (reveal.value) emit("update:confirm", props.password);
};

const generate = () => {
	const value = generatePassword();
	reveal.value = true;
	copied.value = false;
	emit("update:password", value);
	emit("update:confirm", value);
	announcement.value = "A strong password was generated and filled in.";
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
	}
};
</script>

<style scoped>
.field-head {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 8px;
}

.field-label {
	font-size: 14px;
	font-weight: 500;
	color: var(--el-text-color-regular);
}

.suggest {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	padding: 0;
	border: 0;
	background: none;
	color: var(--cpl-heading-soft);
	font-size: 13px;
	font-weight: 600;
	cursor: pointer;
}

.suggest:hover:not(:disabled) {
	text-decoration: underline;
	text-underline-offset: 3px;
}

.suggest:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.suggest:focus-visible,
.field-icon:focus-visible {
	outline: 2px solid var(--cpl-gold-500);
	outline-offset: 2px;
	border-radius: 4px;
}

.password-item,
.confirm-item {
	margin-bottom: 8px;
}

.password-item :deep(.el-form-item__error),
.confirm-item :deep(.el-form-item__error) {
	position: static;
	padding-top: 6px;
	line-height: 1.35;
}

.is-revealed :deep(.el-input__inner) {
	font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
	letter-spacing: 0.02em;
}

.field-icon {
	display: inline-grid;
	place-items: center;
	width: 28px;
	height: 28px;
	padding: 0;
	border: 0;
	border-radius: 6px;
	background: none;
	color: var(--cpl-ink-400);
	font-size: 16px;
	cursor: pointer;
}

.field-icon:hover:not(:disabled) {
	color: var(--cpl-heading-soft);
	background: var(--cpl-surface-muted);
}

.meter {
	margin: 0 0 18px;
}

.meter-track {
	height: 4px;
	border-radius: 999px;
	background: var(--cpl-line);
	overflow: hidden;
}

.meter-fill {
	display: block;
	height: 100%;
	border-radius: inherit;
	background: var(--cpl-ink-400);
	transition: width 0.25s ease, background 0.25s ease;
}

.meter-text {
	display: flex;
	justify-content: space-between;
	gap: 12px;
	margin: 6px 0 0;
	font-size: 12px;
	color: var(--cpl-ink-600);
}

.meter-label {
	flex: none;
	font-weight: 700;
}

.meter[data-score="1"] .meter-fill { background: var(--cpl-red-500); }
.meter[data-score="1"] .meter-label { color: var(--cpl-red-500); }
.meter[data-score="2"] .meter-fill { background: #f08c2e; }
.meter[data-score="2"] .meter-label { color: #c2610c; }
.meter[data-score="3"] .meter-fill { background: var(--cpl-gold-500); }
.meter[data-score="3"] .meter-label { color: #a16207; }
.meter[data-score="4"] .meter-fill,
.meter[data-score="5"] .meter-fill { background: #1f9d55; }
.meter[data-score="4"] .meter-label,
.meter[data-score="5"] .meter-label { color: var(--cpl-success-text); }
html.dark .meter[data-score="1"] .meter-label { color: var(--cpl-danger-text); }
html.dark .meter[data-score="2"] .meter-label { color: #fdba74; }
html.dark .meter[data-score="3"] .meter-label { color: var(--cpl-gold-text); }

.confirm-item {
	margin-bottom: 14px;
}

.match-icon {
	color: #1f9d55;
	font-size: 16px;
}

.save-option {
	height: auto;
	margin: 0 0 18px;
	white-space: normal;
}

.save-option :deep(.el-checkbox__label) {
	font-size: 13px;
	color: var(--cpl-ink-600);
	line-height: 1.4;
}
</style>
