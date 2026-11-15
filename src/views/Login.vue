<template>
	<div class="login-page">
		<div class="login-card">
			<div class="login-brand">
				<div class="brand-badge" aria-hidden="true">
					<el-icon><Lock /></el-icon>
				</div>
				<span class="page-eyebrow">Restricted Area</span>
				<h1 class="login-title">Admin Login</h1>
				<p class="login-subtitle">Sign in to manage seasons, fixtures and results.</p>
			</div>

			<div v-if="authStore.isAuthenticated && authStore.mustChangePassword" class="signed-in">
				<ActivateAccount @done="step = 'login'" />
			</div>

			<div v-else-if="authStore.isAuthenticated" class="signed-in">
				<p>
					You are signed in as <strong>{{ authStore.username }}</strong>.
				</p>
				<el-button type="primary" size="large" class="w-100 submit-btn" @click="router.push(Routes.ADMIN)">
					Open Admin Console
				</el-button>
				<el-button size="large" class="w-100 mt-2 ms-0" @click="logout">Logout</el-button>
			</div>

			<el-form
				v-else-if="step === 'forgot'"
				ref="forgotRef"
				:model="forgot"
				:rules="forgotRules"
				label-position="top"
				size="large"
				class="login-form"
				@submit.prevent="sendReset"
			>
				<p class="login-subtitle">Enter the username. If it has an email address, a reset code will be sent there.</p>
				<el-form-item label="Username" prop="username">
					<el-input v-model.trim="forgot.username" autocomplete="username" placeholder="Enter your username" :prefix-icon="User" />
				</el-form-item>
				<el-button type="primary" native-type="submit" class="submit-btn" :loading="resetting">Email reset code</el-button>
				<button type="button" class="text-link" @click="step = 'login'">Back to sign in</button>
			</el-form>

			<el-form
				v-else-if="step === 'reset'"
				ref="resetRef"
				:model="forgot"
				:rules="resetRules"
				label-position="top"
				size="large"
				class="login-form"
				@submit.prevent="applyReset"
			>
				<p class="login-subtitle">Enter the code from the email and choose a new password for {{ forgot.username }}.</p>
				<el-form-item label="Code" prop="code">
					<el-input v-model.trim="forgot.code" inputmode="numeric" maxlength="6" placeholder="6-digit code" />
				</el-form-item>
				<el-form-item label="New password" prop="password">
					<el-input v-model="forgot.password" type="password" show-password autocomplete="new-password" />
				</el-form-item>
				<el-form-item label="Confirm password" prop="confirm">
					<el-input v-model="forgot.confirm" type="password" show-password autocomplete="new-password" />
				</el-form-item>
				<el-button type="primary" native-type="submit" class="submit-btn" :loading="resetting">Update password</el-button>
				<button type="button" class="text-link" @click="step = 'login'">Back to sign in</button>
			</el-form>

			<el-form
				v-else
				ref="formRef"
				:model="form"
				:rules="rules"
				label-position="top"
				size="large"
				class="login-form"
				@submit.prevent="submit"
			>
				<el-alert
					v-if="errorMessage"
					:title="errorMessage"
					type="error"
					show-icon
					:closable="false"
					class="mb-3"
				/>
				<el-form-item label="Username" prop="username">
					<el-input
						v-model.trim="form.username"
						autocomplete="username"
						placeholder="Enter your username"
						:prefix-icon="User"
					/>
				</el-form-item>
				<el-form-item label="Password" prop="password">
					<el-input
						v-model="form.password"
						type="password"
						show-password
						autocomplete="current-password"
						placeholder="Enter your password"
						:prefix-icon="Lock"
					/>
				</el-form-item>
				<el-button
					type="primary"
					native-type="submit"
					class="submit-btn"
					:loading="authStore.loading"
				>
					Sign In
				</el-button>
				<button type="button" class="text-link" @click="openForgot">Forgot password?</button>
			</el-form>
		</div>
	</div>
</template>

<script setup>
import { ref, reactive } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { Lock, User } from "@element-plus/icons-vue";
import ActivateAccount from "@/components/admin/ActivateAccount.vue";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/store/authStore";
import { Routes } from "@/utils/constants";
import { appRedirect } from "@/utils/queryState";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const formRef = ref(null);
const forgotRef = ref(null);
const resetRef = ref(null);
const errorMessage = ref("");
const step = ref("login");
const resetting = ref(false);
const form = reactive({ username: "", password: "" });
const forgot = reactive({ username: "", code: "", password: "", confirm: "" });

const rules = {
	username: [{ required: true, message: "Username is required", trigger: "blur" }],
	password: [{ required: true, message: "Password is required", trigger: "blur" }],
};
const forgotRules = {
	username: [{ required: true, message: "Username is required", trigger: "blur" }],
};
const resetRules = {
	code: [{ pattern: /^\d{6}$/, message: "Enter the 6-digit code", trigger: "blur" }],
	password: [
		{
			validator: (_rule, value, callback) =>
				!value || value.length < 12 ? callback(new Error("Use at least 12 characters")) : callback(),
			trigger: "blur",
		},
	],
	confirm: [
		{
			validator: (_rule, value, callback) =>
				value !== forgot.password ? callback(new Error("Passwords do not match")) : callback(),
			trigger: "blur",
		},
	],
};

const openForgot = () => {
	forgot.username = form.username;
	forgot.code = "";
	forgot.password = "";
	forgot.confirm = "";
	step.value = "forgot";
};

const sendReset = async () => {
	const valid = await forgotRef.value.validate().catch(() => false);
	if (!valid) return;
	resetting.value = true;
	try {
		await authService.forgotPassword(forgot.username);
		ElMessage.success("If that username has an email address, a reset code is on its way.");
		step.value = "reset";
	} catch (error) {
		ElMessage.error(error?.message || "The reset code could not be sent.");
	} finally {
		resetting.value = false;
	}
};

const applyReset = async () => {
	const valid = await resetRef.value.validate().catch(() => false);
	if (!valid) return;
	resetting.value = true;
	try {
		await authService.resetPassword(forgot.username, forgot.code, forgot.password);
		ElMessage.success("Password updated. Sign in with it now.");
		form.username = forgot.username;
		form.password = "";
		step.value = "login";
	} catch (error) {
		ElMessage.error(error?.message || "That code could not reset the password.");
	} finally {
		resetting.value = false;
	}
};

const safeRedirect = () =>
	appRedirect(route.query.redirect, (path) => {
		const resolved = router.resolve(path);
		return resolved.matched.some((record) => !String(record.path).includes("pathMatch"));
	}) || Routes.ADMIN;

const submit = async () => {
	errorMessage.value = "";
	const valid = await formRef.value.validate().catch(() => false);
	if (!valid) return;

	try {
		await authStore.login(form.username, form.password);
		form.password = "";
		router.push(safeRedirect());
	} catch (error) {
		form.password = "";
		errorMessage.value =
			error?.message && error?.success === false
				? error.message
				: "Unable to sign in. Check your credentials and try again.";
	}
};

const logout = () => {
	authStore.logout();
	router.push(Routes.HOME);
};
</script>

<style scoped lang="scss">
.login-page {
	min-height: calc(100vh - var(--app-header-height) - 80px);
	display: grid;
	place-items: center;
	padding: clamp(24px, 6vw, 64px) var(--page-gutter);
	background:
		radial-gradient(circle at 15% 20%, rgba(245, 184, 46, 0.15), transparent 40%),
		radial-gradient(circle at 85% 80%, rgba(24, 41, 77, 0.12), transparent 45%);
}

.login-card {
	width: 100%;
	max-width: 420px;
	padding: clamp(24px, 5vw, 40px);
	border-radius: var(--cpl-radius-lg);
	background: #fff;
	border: 1px solid var(--cpl-line);
	box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
	animation: rise 0.5s ease both;
}

.login-brand {
	text-align: center;
	margin-bottom: 24px;
}

.brand-badge {
	width: 60px;
	height: 60px;
	margin: 0 auto 14px;
	border-radius: 18px;
	display: grid;
	place-items: center;
	font-size: 26px;
	color: var(--cpl-gold-400);
	background: linear-gradient(135deg, var(--cpl-navy-900), var(--cpl-navy-700));
	box-shadow: 0 10px 24px rgba(11, 20, 38, 0.35);
}

.login-title {
	font-family: var(--cpl-font-display);
	font-size: clamp(24px, 4vw, 30px);
	font-weight: 800;
	margin: 6px 0 4px;
}

.login-subtitle {
	margin: 0;
	font-size: 14px;
	color: var(--cpl-ink-600);
}

.submit-btn {
	width: 100%;
	margin-top: 8px;
	font-weight: 600;
	--el-button-bg-color: var(--cpl-navy-900);
	--el-button-border-color: var(--cpl-navy-900);
	--el-button-hover-bg-color: var(--cpl-navy-700);
	--el-button-hover-border-color: var(--cpl-navy-700);
}

.signed-in {
	text-align: center;
	color: var(--cpl-ink-600);
}

.text-link {
	display: block;
	width: 100%;
	margin-top: 14px;
	padding: 0;
	border: 0;
	background: none;
	color: var(--cpl-navy-700);
	font: inherit;
	font-size: 14px;
	font-weight: 700;
	cursor: pointer;
	text-align: center;
}

@keyframes rise {
	from {
		opacity: 0;
		transform: translateY(20px);
	}
	to {
		opacity: 1;
		transform: none;
	}
}
</style>
