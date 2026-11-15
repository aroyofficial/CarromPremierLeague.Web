<template>
	<el-dialog
		:model-value="modelValue"
		class="change-password-dialog"
		width="min(640px, 94vw)"
		align-center
		append-to-body
		:close-on-click-modal="false"
		:close-on-press-escape="!busy"
		:show-close="!busy"
		aria-labelledby="change-password-title"
		@update:model-value="close"
		@open="reset"
	>
		<template #header>
			<span class="page-eyebrow">My profile · Sign-in</span>
			<h2 id="change-password-title" class="dialog-title">{{ titles[step] }}</h2>
		</template>

		<ol class="stepper" aria-label="Steps">
			<li v-for="(label, index) in stepLabels" :key="label" :class="stepClass(index)" :aria-current="index === stepIndex ? 'step' : undefined">
				<span class="dot" aria-hidden="true">
					<el-icon v-if="index < stepIndex"><Check /></el-icon>
					<template v-else>{{ index + 1 }}</template>
				</span>
				<span>{{ label }}</span>
			</li>
		</ol>

		<el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon class="mb-3" role="alert" @close="errorMessage = ''" />

		<section v-if="step === 'verify'" class="pane" aria-live="polite">
			<p class="intro">
				To keep this account safe, confirm it's you first. We send a 6-digit code to
				<strong>{{ maskedEmail }}</strong>.
			</p>
			<template v-if="sent">
				<p class="code-label">Enter the code from the email</p>
				<CodeBoxes v-model="code" :disabled="busy" @complete="verify" />
				<p class="hint">
					<template v-if="busy && verifying">Checking the code…</template>
					<template v-else>The code expires in 10 minutes.</template>
				</p>
				<div class="actions">
					<button type="button" class="text-link" :disabled="busy || resendWait > 0" @click="send">
						{{ resendWait > 0 ? `Resend code in ${resendWait}s` : "Resend code" }}
					</button>
					<el-button type="primary" :loading="verifying" :disabled="busy || code.length !== 6" @click="verify">Verify code</el-button>
				</div>
			</template>
			<el-button v-else type="primary" size="large" class="w-100" :loading="sending" @click="send">
				<el-icon class="me-2"><Message /></el-icon>Email me a code
			</el-button>
		</section>

		<el-form
			v-else-if="step === 'password'"
			ref="formRef"
			:model="form"
			:rules="rules"
			label-position="top"
			class="pane"
			autocomplete="on"
			@submit.prevent="submit"
		>
			<p class="intro verified">
				<el-icon aria-hidden="true"><CircleCheckFilled /></el-icon>
				Code accepted. Choose a new password within {{ formatDuration(ticketLeft) }}.
			</p>
			<NewPasswordFields
				v-model:password="form.password"
				v-model:confirm="form.confirm"
				v-model:save="form.save"
				:username="username"
				:disabled="busy"
			/>
			<p class="hint">Saving signs you out everywhere, including here. Sign in again with the new password.</p>
			<div class="actions end">
				<el-button :disabled="busy" @click="close(false)">Cancel</el-button>
				<el-button type="primary" native-type="submit" :loading="saving" :disabled="busy || !ready">Change password</el-button>
			</div>
		</el-form>

		<section v-else class="pane done" role="status">
			<div class="done-badge" aria-hidden="true"><el-icon><CircleCheckFilled /></el-icon></div>
			<p class="done-title">Your password is changed</p>
			<p class="intro">
				A confirmation email is on its way to <strong>{{ maskedEmail }}</strong>. Every device that was signed in,
				including this one, now needs the new password.
			</p>
			<p v-if="saveResult === 'stored'" class="hint">Saved in this browser's password manager.</p>
			<el-button type="primary" size="large" class="w-100" @click="close(false)">Sign in again</el-button>
		</section>
	</el-dialog>
</template>

<script setup>
import { computed, onUnmounted, reactive, ref, watch } from "vue";
import { Check, CircleCheckFilled, Message } from "@element-plus/icons-vue";
import CodeBoxes from "@/components/admin/CodeBoxes.vue";
import NewPasswordFields from "@/components/admin/NewPasswordFields.vue";
import { authService } from "@/services/authService";
import { unwrap } from "@/utils/adminHelpers";
import { formatDuration, MIN_PASSWORD_LENGTH, passwordReady } from "@/utils/passwordRules";
import { storeCredential } from "@/utils/passwordTools";

const RESEND_SECONDS = 30;

const props = defineProps({
	modelValue: { type: Boolean, default: false },
	username: { type: String, required: true },
	displayName: { type: String, default: "" },
	email: { type: String, default: "" },
});
const emit = defineEmits(["update:modelValue", "changed"]);

const titles = { verify: "Confirm it's you", password: "Choose a new password", done: "Password changed" };
const stepLabels = ["Email code", "New password", "Done"];
const step = ref("verify");
const code = ref("");
const ticket = ref("");
const ticketDeadline = ref(0);
const sent = ref(false);
const sending = ref(false);
const verifying = ref(false);
const saving = ref(false);
const errorMessage = ref("");
const resendAt = ref(0);
const now = ref(Date.now());
const saveResult = ref("");
const formRef = ref(null);
const form = reactive({ password: "", confirm: "", save: true });
let clock = 0;

const busy = computed(() => sending.value || verifying.value || saving.value);
const stepIndex = computed(() => ["verify", "password", "done"].indexOf(step.value));
const resendWait = computed(() => Math.max(0, Math.ceil((resendAt.value - now.value) / 1000)));
const ticketLeft = computed(() => Math.max(0, Math.ceil((ticketDeadline.value - now.value) / 1000)));
const ready = computed(() => passwordReady(form.password, form.confirm));
const maskedEmail = computed(() => {
	const [name, domain] = String(props.email || "").split("@");
	if (!domain) return "your email address";
	return `${name.slice(0, 2)}${"•".repeat(Math.max(1, name.length - 2))}@${domain}`;
});

const rules = {
	password: [
		{
			validator: (_rule, value, callback) =>
				!value || value.length < MIN_PASSWORD_LENGTH ? callback(new Error(`Use at least ${MIN_PASSWORD_LENGTH} characters`)) : callback(),
			trigger: "blur",
		},
	],
	confirm: [
		{
			validator: (_rule, value, callback) => (value !== form.password ? callback(new Error("Passwords do not match")) : callback()),
			trigger: "blur",
		},
	],
};

const stepClass = (index) => ({ "is-done": index < stepIndex.value, "is-active": index === stepIndex.value });

const reset = () => {
	step.value = "verify";
	code.value = "";
	ticket.value = "";
	sent.value = false;
	errorMessage.value = "";
	saveResult.value = "";
	Object.assign(form, { password: "", confirm: "", save: true });
	window.clearInterval(clock);
	clock = window.setInterval(() => {
		now.value = Date.now();
	}, 500);
};

const send = async () => {
	if (busy.value) return;
	errorMessage.value = "";
	sending.value = true;
	try {
		await authService.passwordCode();
		sent.value = true;
		code.value = "";
		resendAt.value = Date.now() + RESEND_SECONDS * 1000;
	} catch (error) {
		errorMessage.value = error?.message || "The code could not be sent. Try again in a moment.";
	} finally {
		sending.value = false;
	}
};

const verify = async () => {
	if (verifying.value || code.value.length !== 6) return;
	errorMessage.value = "";
	verifying.value = true;
	try {
		const data = unwrap(await authService.verifyPasswordCode(code.value));
		ticket.value = data.ticket;
		ticketDeadline.value = Date.now() + (Number(data.expires_in) || 600) * 1000;
		step.value = "password";
	} catch (error) {
		code.value = "";
		errorMessage.value = error?.message || "That code is not right. Check the latest email or send a new code.";
	} finally {
		verifying.value = false;
	}
};

const submit = async () => {
	if (busy.value) return;
	errorMessage.value = "";
	const valid = await formRef.value?.validate().catch(() => false);
	if (!valid || !ready.value) return;
	saving.value = true;
	try {
		await authService.changePassword(ticket.value, form.password);
		if (form.save) saveResult.value = await storeCredential(props.username, form.password, props.displayName);
		form.password = "";
		form.confirm = "";
		step.value = "done";
		emit("changed");
	} catch (error) {
		errorMessage.value = error?.message || "The password could not be changed. Try again.";
		if (/expired|send a new code/i.test(errorMessage.value)) {
			step.value = "verify";
			sent.value = false;
		}
	} finally {
		saving.value = false;
	}
};

const close = (open) => {
	if (open || busy.value) return;
	window.clearInterval(clock);
	emit("update:modelValue", false);
};

watch(ticketLeft, (left) => {
	if (step.value === "password" && ticketDeadline.value && left === 0) {
		step.value = "verify";
		sent.value = false;
		errorMessage.value = "That took too long, so the change expired. Send a new code to start again.";
	}
});

onUnmounted(() => window.clearInterval(clock));
</script>

<style scoped>
.dialog-title {
	margin: 4px 0 0;
	font-family: var(--cpl-font-display);
	font-size: clamp(20px, 3.2vw, 24px);
	font-weight: 800;
	color: var(--cpl-ink-900);
}

.stepper {
	list-style: none;
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 8px;
	margin: 0 0 18px;
	padding: 0;
}

.stepper li {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 10px;
	border-radius: 12px;
	border: 1px solid var(--cpl-line);
	color: var(--cpl-ink-400);
	font-size: 13px;
	font-weight: 600;
	min-width: 0;
}

.stepper li > span:last-child {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.stepper .dot {
	flex: none;
	width: 24px;
	height: 24px;
	border-radius: 50%;
	display: grid;
	place-items: center;
	font-size: 12px;
	background: var(--cpl-surface-muted);
}

.stepper .is-active {
	border-color: var(--cpl-gold-500);
	background: var(--cpl-gold-100);
	color: var(--cpl-ink-900);
}

.stepper .is-active .dot {
	background: var(--cpl-gold-500);
	color: var(--cpl-navy-900);
}

.stepper .is-done {
	color: var(--cpl-ink-900);
	background: #f4fbf6;
}

.stepper .is-done .dot {
	background: #1f9d55;
	color: #fff;
}

.pane {
	display: block;
}

.intro {
	margin: 0 0 16px;
	color: var(--cpl-ink-600);
	line-height: 1.5;
	overflow-wrap: anywhere;
}

.intro strong {
	color: var(--cpl-ink-900);
}

.verified {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 10px 12px;
	border-radius: 12px;
	background: #f4fbf6;
	color: #17643a;
	font-size: 14px;
	font-weight: 600;
	font-variant-numeric: tabular-nums;
}

.code-label {
	margin: 0 0 10px;
	font-size: 14px;
	font-weight: 600;
	color: var(--cpl-ink-900);
}

.hint {
	margin: 10px 0 14px;
	font-size: 13px;
	color: var(--cpl-ink-600);
}

.actions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
}

.actions.end {
	justify-content: flex-end;
}

.actions :deep(.el-button + .el-button) {
	margin-left: 0;
}

.text-link {
	border: 0;
	background: none;
	padding: 0;
	color: var(--cpl-navy-700);
	font-weight: 600;
	cursor: pointer;
}

.text-link:disabled {
	color: var(--cpl-ink-400);
	cursor: not-allowed;
}

.done {
	text-align: center;
}

.done-badge {
	width: 64px;
	height: 64px;
	margin: 4px auto 12px;
	border-radius: 50%;
	display: grid;
	place-items: center;
	font-size: 34px;
	color: #fff;
	background: #1f9d55;
	box-shadow: 0 12px 28px rgba(31, 157, 85, 0.3);
}

.done-title {
	margin: 0 0 6px;
	font-size: 18px;
	font-weight: 800;
	color: var(--cpl-ink-900);
}

@media (max-width: 480px) {
	.stepper li {
		justify-content: center;
		padding: 8px 6px;
	}

	.stepper li > span:last-child {
		display: none;
	}

	.actions:not(.end) {
		flex-direction: column-reverse;
		align-items: stretch;
	}
}
</style>
