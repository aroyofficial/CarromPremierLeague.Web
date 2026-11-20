<template>
	<el-form novalidate
		ref="formRef"
		class="activate"
		:model="form"
		:rules="rules"
		label-position="top"
		size="large"
		aria-labelledby="activate-title"
		@submit.prevent="save"
	>
		<div class="badge" aria-hidden="true"><el-icon><Key /></el-icon></div>
		<span class="page-eyebrow">First sign-in · Last step</span>
		<h2 id="activate-title" ref="titleRef" tabindex="-1">Verify your email and set a password</h2>
		<p class="activate-lead">
			Your account was created with a temporary password. Enter the code we email to the address on your account, then
			choose your own password. That confirms the address and turns the account on.
		</p>

		<ol class="verify-steps" aria-label="What to do">
			<li :class="{ done: codeSent }">
				<span class="step-no" aria-hidden="true">1</span>
				<span>Open the email sent to <strong>{{ maskedEmail || "the address on your account" }}</strong></span>
			</li>
			<li>
				<span class="step-no" aria-hidden="true">2</span>
				<span>Type or paste the 6-digit code</span>
			</li>
			<li>
				<span class="step-no" aria-hidden="true">3</span>
				<span>Choose your password and activate</span>
			</li>
		</ol>

		<div v-if="authStore.username" class="who">
			<el-icon aria-hidden="true"><UserFilled /></el-icon>
			<span>Signed in as <strong>{{ authStore.username }}</strong></span>
		</div>

		<el-alert
			v-if="errorMessage"
			:title="errorMessage"
			:type="errorType"
			show-icon
			class="mb-3"
			role="alert"
			@close="errorMessage = ''"
		/>

		<el-form-item label="6-digit code" prop="code" data-prop="code">
			<el-input
				ref="codeInputRef"
				:model-value="form.code"
				inputmode="numeric"
				autocomplete="one-time-code"
				placeholder="123456"
				:disabled="submitting"
				aria-describedby="code-help"
				@update:model-value="onCodeInput"
			/>
		</el-form-item>
		<div class="code-row">
			<p id="code-help" class="code-help">
				{{ codeSent ? "The newest code works. Older codes stop working." : "We email a code when this page opens." }}
			</p>
			<el-button
				v-if="!submitting"
				link
				type="primary"
				class="resend"
				:disabled="sending || cooldown > 0"
				:loading="sending"
				@click="sendCode"
			>
				{{ sending ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : codeSent ? "Send a new code" : "Email me a code" }}
			</el-button>
		</div>

		<NewPasswordFields
			v-model:password="form.password"
			v-model:confirm="form.confirm"
			v-model:save="form.save"
			:username="authStore.username"
			:disabled="submitting"
		/>
		<el-button type="primary" native-type="submit" class="w-100 submit-btn" :loading="submitting" :disabled="submitting">
			{{ submitting ? "Activating…" : "Activate account" }}
		</el-button>
		<p class="help-note">
			No code after a few minutes? Check your spam folder, then send a new one. If it still does not arrive, ask an
			administrator to check the email address on your account.
		</p>
		<button type="button" class="switch-link" :disabled="submitting" @click="switchAccount">
			Not you? Sign in with a different account
		</button>
	</el-form>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { notify } from "@/utils/notify";
import { Key, UserFilled } from "@element-plus/icons-vue";
import NewPasswordFields from "@/components/admin/NewPasswordFields.vue";
import { adminApi } from "@/services/adminService";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/store/authStore";
import { MIN_PASSWORD_LENGTH } from "@/utils/passwordRules";
import { storeCredential } from "@/utils/passwordTools";
import { maskEmail } from "@/utils/maskEmail";
import { focusField, useFormSubmit } from "@/utils/formValidation";

const COOLDOWN_SECONDS = 60;

const props = defineProps({
	quiet: { type: Boolean, default: false },
});
const emit = defineEmits(["done"]);

const authStore = useAuthStore();
const formRef = ref(null);
const titleRef = ref(null);
const codeInputRef = ref(null);
const errorMessage = ref("");
const errorType = ref("error");
const form = reactive({ code: "", password: "", confirm: "", save: true });
const sending = ref(false);
const codeSent = ref(false);
const cooldown = ref(0);
let cooldownTimer = null;

const { submitting, validate, submit } = useFormSubmit(formRef);

const maskedEmail = computed(() => maskEmail(authStore.email));

// The server gives each code state its own message. Map those words to how serious they are.
const classify = (message) => {
	const text = String(message || "");
	if (/not right/i.test(text)) return "error";
	if (/expired|already used|too many/i.test(text)) return "warning";
	if (/send a code first/i.test(text)) return "info";
	return "error";
};

const isCodeProblem = (message) => /not right|expired|already used|too many|send a code first|6-digit/i.test(String(message || ""));

const showError = (error, fallback) => {
	errorMessage.value = error?.message || fallback;
	errorType.value = classify(errorMessage.value);
};

const startCooldown = () => {
	clearInterval(cooldownTimer);
	cooldown.value = COOLDOWN_SECONDS;
	cooldownTimer = setInterval(() => {
		cooldown.value -= 1;
		if (cooldown.value <= 0) {
			cooldown.value = 0;
			clearInterval(cooldownTimer);
			cooldownTimer = null;
		}
	}, 1000);
};

const onCodeInput = (value) => {
	// Pasted codes often arrive as "123 456" or "123-456". Keep only the digits.
	form.code = String(value).replace(/\D/g, "").slice(0, 6);
};

const rules = {
	code: [{ pattern: /^\d{6}$/, required: true, message: "Enter the 6-digit code from the email", trigger: "blur" }],
	password: [
		{
			validator: (_rule, _value, callback) => {
				const value = form.password;
				if (!value || value.length < MIN_PASSWORD_LENGTH) {
					return callback(new Error(`Use at least ${MIN_PASSWORD_LENGTH} characters`));
				}
				return callback();
			},
			trigger: "blur",
		},
	],
	confirm: [
		{
			validator: (_rule, _value, callback) =>
				form.confirm !== form.password ? callback(new Error("Passwords do not match")) : callback(),
			trigger: "blur",
		},
	],
};

const sendCode = async () => {
	if (sending.value || cooldown.value > 0) return;
	errorMessage.value = "";
	sending.value = true;
	try {
		await authService.passwordCode();
		codeSent.value = true;
		startCooldown();
	} catch (error) {
		showError(error, "The code could not be sent. Try again in a moment.");
	} finally {
		sending.value = false;
	}
};

const save = () =>
	submit(async () => {
		errorMessage.value = "";
		const check = await validate();
		if (!check.valid) return;
		if (!authStore.adminId) {
			showError(null, "Your account details are still loading. Try again in a moment.");
			return;
		}
		try {
			await adminApi.admins.update(authStore.adminId, { password: form.password, password_code: form.code });
			if (form.save) await storeCredential(authStore.username, form.password, authStore.displayName);
			authStore.logout();
			if (!props.quiet) notify.success("Password saved. The account is active. Sign in with the new password.");
			emit("done");
		} catch (error) {
			showError(error, "The password could not be saved. Try again.");
			if (isCodeProblem(errorMessage.value)) {
				// The old code cannot be used again. Clear it and put the cursor back in the code field.
				form.code = "";
				// The field is disabled until this submit finishes, so move focus after that render.
				setTimeout(() => focusField(formRef, "code"), 0);
			}
		}
	});

const switchAccount = () => {
	authStore.logout();
	emit("done", { switched: true });
};

watch(
	() => form.password,
	() => formRef.value?.clearValidate("password"),
);
watch(
	() => form.confirm,
	() => formRef.value?.clearValidate("confirm"),
);

onMounted(() => {
	sendCode();
	codeInputRef.value?.$el?.querySelector("input")?.focus();
});

onBeforeUnmount(() => {
	clearInterval(cooldownTimer);
});
</script>

<style scoped>
.activate {
	width: 100%;
	max-width: 520px;
	margin-inline: auto;
}

.badge {
	width: 52px;
	height: 52px;
	margin-bottom: 16px;
	border-radius: 16px;
	display: grid;
	place-items: center;
	font-size: 24px;
	color: var(--cpl-navy-900);
	background: linear-gradient(135deg, var(--cpl-gold-400), var(--cpl-gold-500));
	box-shadow: 0 10px 24px rgba(245, 184, 46, 0.35);
}

h2 {
	margin: 6px 0 8px;
	font-family: var(--cpl-font-display);
	font-size: clamp(24px, 4vw, 28px);
	font-weight: 800;
	color: var(--cpl-ink-900);
	outline: none;
}

.activate-lead {
	margin: 0 0 16px;
	color: var(--cpl-ink-600);
	line-height: 1.5;
}

.verify-steps {
	display: grid;
	gap: 8px;
	margin: 0 0 16px;
	padding: 0;
	list-style: none;
	font-size: 14px;
	color: var(--cpl-ink-600);

	li {
		display: flex;
		align-items: center;
		gap: 10px;
		overflow-wrap: anywhere;
	}

	li.done .step-no {
		background: var(--cpl-success-soft);
		color: var(--cpl-success-text);
	}

	strong {
		color: var(--cpl-ink-900);
	}
}

.step-no {
	flex: 0 0 26px;
	width: 26px;
	height: 26px;
	display: grid;
	place-items: center;
	border-radius: 50%;
	background: var(--cpl-surface-muted);
	color: var(--cpl-ink-900);
	font-size: 13px;
	font-weight: 700;
}

.who {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-bottom: 18px;
	padding: 10px 14px;
	border-radius: var(--cpl-radius-md);
	background: var(--cpl-surface-muted);
	color: var(--cpl-ink-600);
	font-size: 14px;
	overflow-wrap: anywhere;
}

.who strong {
	color: var(--cpl-ink-900);
}

.code-row {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	margin: -6px 0 12px;
}

.code-help {
	margin: 0;
	color: var(--cpl-ink-600);
	font-size: 13px;
}

.resend {
	font-weight: 600;
}

.help-note {
	margin: 12px 0 0;
	color: var(--cpl-ink-600);
	font-size: 13px;
	line-height: 1.5;
}

.submit-btn {
	font-weight: 600;
	--el-button-bg-color: var(--cpl-navy-900);
	--el-button-border-color: var(--cpl-navy-900);
	--el-button-hover-bg-color: var(--cpl-navy-700);
	--el-button-hover-border-color: var(--cpl-navy-700);
}

html.dark .submit-btn.el-button--primary:not(.is-plain):not(.is-link):not(.is-text) {
	--el-button-text-color: var(--cpl-navy-900);
	--el-button-hover-text-color: var(--cpl-navy-900);
	--el-button-active-text-color: var(--cpl-navy-900);
	--el-button-bg-color: var(--cpl-gold-500);
	--el-button-border-color: var(--cpl-gold-500);
	--el-button-hover-bg-color: var(--cpl-gold-400);
	--el-button-hover-border-color: var(--cpl-gold-400);
	--el-button-active-bg-color: #d99f1f;
	--el-button-active-border-color: #d99f1f;
	--el-button-disabled-text-color: rgba(11, 20, 38, 0.6);
	--el-button-disabled-bg-color: rgba(245, 184, 46, 0.55);
	--el-button-disabled-border-color: transparent;
}

.switch-link {
	display: block;
	margin: 16px auto 0;
	padding: 2px 4px;
	border: 0;
	border-radius: 4px;
	background: none;
	color: var(--cpl-heading-soft);
	font-size: 14px;
	font-weight: 600;
	cursor: pointer;
}

.switch-link:hover:not(:disabled) {
	text-decoration: underline;
}

.switch-link:focus-visible {
	outline: 2px solid var(--cpl-gold-500);
	outline-offset: 2px;
}
</style>
