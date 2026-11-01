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

			<div v-if="authStore.isAuthenticated" class="signed-in">
				<p>
					You are signed in as <strong>{{ authStore.username }}</strong>.
				</p>
				<el-button type="primary" size="large" class="w-100" @click="logout">Logout</el-button>
			</div>

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
			</el-form>
		</div>
	</div>
</template>

<script setup>
import { ref, reactive } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Lock, User } from "@element-plus/icons-vue";
import { useAuthStore } from "@/store/authStore";
import { Routes } from "@/utils/constants";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const formRef = ref(null);
const errorMessage = ref("");
const form = reactive({ username: "", password: "" });

const rules = {
	username: [{ required: true, message: "Username is required", trigger: "blur" }],
	password: [{ required: true, message: "Password is required", trigger: "blur" }],
};

const safeRedirect = () => {
	const target = route.query.redirect;
	return typeof target === "string" && target.startsWith("/") && !target.startsWith("//")
		? target
		: Routes.HOME;
};

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
