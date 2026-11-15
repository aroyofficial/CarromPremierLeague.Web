<template>
	<el-form
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
		<h2 id="activate-title" ref="titleRef" tabindex="-1">Choose your password</h2>
		<p class="activate-lead">
			This account was set up with a temporary password. Enter the code sent to your email, then choose your own
			password. That verifies the address and switches the account on.
		</p>
		<div v-if="authStore.username" class="who">
			<el-icon aria-hidden="true"><UserFilled /></el-icon>
			<span>Account <strong>{{ authStore.username }}</strong></span>
		</div>
		<el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon class="mb-3" role="alert" @close="errorMessage = ''" />
		<el-form-item label="Email code" prop="code">
			<el-input
				:model-value="form.code"
				inputmode="numeric"
				autocomplete="one-time-code"
				maxlength="6"
				placeholder="6-digit code"
				:disabled="saving"
				@update:model-value="form.code = String($event).replace(/\D/g, '').slice(0, 6)"
			/>
		</el-form-item>
		<p class="code-note">
			<button type="button" class="switch-link inline" :disabled="sending || saving" @click="sendCode">
				{{ sending ? "Sending…" : codeSent ? "Send a new code" : "Email me a code" }}
			</button>
			<span v-if="codeSent">A code is on its way to your email address.</span>
		</p>
		<NewPasswordFields v-model:password="form.password" v-model:confirm="form.confirm" />
		<el-button type="primary" native-type="submit" class="w-100 submit-btn" :loading="saving">
			{{ saving ? "Activating…" : "Activate account" }}
		</el-button>
		<button type="button" class="switch-link" :disabled="saving" @click="switchAccount">Not you? Sign in with a different account</button>
	</el-form>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { Key, UserFilled } from "@element-plus/icons-vue";
import NewPasswordFields from "@/components/admin/NewPasswordFields.vue";
import { adminApi } from "@/services/adminService";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/store/authStore";
import { MIN_PASSWORD_LENGTH } from "@/utils/passwordRules";

const props = defineProps({
	quiet: { type: Boolean, default: false },
});
const emit = defineEmits(["done"]);
const authStore = useAuthStore();
const formRef = ref(null);
const titleRef = ref(null);
const saving = ref(false);
const errorMessage = ref("");
const form = reactive({ code: "", password: "", confirm: "" });
const sending = ref(false);
const codeSent = ref(false);

const rules = {
	code: [{ pattern: /^\d{6}$/, required: true, message: "Enter the 6-digit code from the email", trigger: "blur" }],
	password: [
		{
			validator: (_rule, value, callback) => {
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
			validator: (_rule, value, callback) =>
				value !== form.password ? callback(new Error("Passwords do not match")) : callback(),
			trigger: "blur",
		},
	],
};

const sendCode = async () => {
	errorMessage.value = "";
	sending.value = true;
	try {
		await authService.passwordCode();
		codeSent.value = true;
	} catch (error) {
		errorMessage.value = error?.message || "The code could not be sent.";
	} finally {
		sending.value = false;
	}
};

const save = async () => {
	errorMessage.value = "";
	const valid = await formRef.value.validate().catch(() => false);
	if (!valid) return;
	if (!authStore.adminId) {
		errorMessage.value = "Your account details are still loading. Try again in a moment.";
		return;
	}
	saving.value = true;
	try {
		await adminApi.admins.update(authStore.adminId, { password: form.password, password_code: form.code });
		authStore.logout();
		if (!props.quiet) ElMessage.success("Password saved. The account is active. Sign in with the new password.");
		emit("done");
	} catch (error) {
		errorMessage.value = error?.message || "The password could not be saved. Try again.";
	} finally {
		saving.value = false;
	}
};

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
	formRef.value?.$el?.querySelector("input")?.focus();
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

.submit-btn {
	font-weight: 600;
	--el-button-bg-color: var(--cpl-navy-900);
	--el-button-border-color: var(--cpl-navy-900);
	--el-button-hover-bg-color: var(--cpl-navy-700);
	--el-button-hover-border-color: var(--cpl-navy-700);
}

.code-note {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
	margin: -6px 0 12px;
	color: var(--cpl-ink-600);
	font-size: 13px;
}

.switch-link.inline {
	display: inline;
	margin: 0;
}

.switch-link {
	display: block;
	margin: 16px auto 0;
	padding: 2px 4px;
	border: 0;
	border-radius: 4px;
	background: none;
	color: var(--cpl-navy-700);
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
