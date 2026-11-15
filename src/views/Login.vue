<template>
	<div class="auth-page">
		<div class="auth-frame" :class="{ 'is-waiting': view === 'wait' }">
			<aside class="auth-aside" aria-hidden="true">
				<div class="aside-board">
					<span class="ring ring-1"></span>
					<span class="ring ring-2"></span>
					<span class="ring ring-3"></span>
					<span class="coin coin-1"></span>
					<span class="coin coin-2"></span>
					<span class="coin coin-3"></span>
				</div>
				<div class="aside-copy">
					<span class="aside-eyebrow">Carrom Premier League</span>
					<h2 class="aside-title">Admin console</h2>
					<p class="aside-text">Run the league from one place.</p>
					<ul class="aside-list">
						<li><el-icon><Calendar /></el-icon>Seasons, fixtures and results</li>
						<li><el-icon><Trophy /></el-icon>Teams, players and standings</li>
						<li><el-icon><Lock /></el-icon>One device per account. A new device needs approval from the signed-in one.</li>
					</ul>
				</div>
			</aside>

			<main ref="panelRef" class="auth-panel" :aria-labelledby="view === 'activate' ? undefined : 'auth-title'">
				<div v-if="view === 'activate'" class="panel-body">
					<ActivateAccount quiet @done="onActivated" />
				</div>

				<template v-else>
					<button v-if="canGoBack" type="button" class="back-link" @click="backToSignIn">
						<el-icon><ArrowLeft /></el-icon>Back to sign in
					</button>

					<header class="auth-head" :class="{ 'is-compact': view === 'wait' }">
						<div class="step-badge" :class="`is-${header.tone}`" aria-hidden="true">
							<el-icon><component :is="header.icon" /></el-icon>
						</div>
						<span class="page-eyebrow">{{ header.eyebrow }}</span>
						<h1 id="auth-title" ref="titleRef" class="auth-title" tabindex="-1">{{ header.title }}</h1>
						<p v-if="header.text" class="auth-text">{{ header.text }}</p>
						<div v-if="header.step" class="step-track" role="img" :aria-label="`Step ${header.step} of ${RESET_STEPS}`">
							<span v-for="index in RESET_STEPS" :key="index" :class="{ 'is-on': header.step >= index }"></span>
						</div>
					</header>

					<div v-if="view === 'wait'" class="panel-body wait">
						<template v-if="waitState === 'waiting'">
							<ol class="wait-steps">
								<li class="is-done">
									<span class="dot"><el-icon><Check /></el-icon></span>
									<div>
										<strong>Request sent</strong>
										<span>From {{ thisDevice }}</span>
									</div>
								</li>
								<li class="is-active">
									<span class="dot"><span class="pulse"></span></span>
									<div>
										<strong>Approve on the other device</strong>
										<span>A prompt is showing there now. Choose “Log out and allow it”.</span>
									</div>
								</li>
								<li>
									<span class="dot">3</span>
									<div>
										<strong>Signed in here</strong>
										<span>This page continues by itself once approved.</span>
									</div>
								</li>
							</ol>

							<div class="wait-timer">
								<div class="timer-row">
									<span>Waiting {{ formatDuration(waitElapsed) }}</span>
									<span>Expires in {{ formatDuration(waitRemaining) }}</span>
								</div>
								<div
									class="timer-bar"
									role="progressbar"
									aria-label="Time left on this request"
									:aria-valuemax="WAIT_LIMIT_SECONDS"
									aria-valuemin="0"
									:aria-valuenow="waitRemaining"
									:aria-valuetext="`${formatDuration(waitRemaining)} left`"
								>
									<span :style="{ width: `${(waitRemaining / WAIT_LIMIT_SECONDS) * 100}%` }"></span>
								</div>
							</div>

							<div class="wait-foot">
								<div>
									<p class="wait-status" role="status" aria-live="polite">{{ waitStatus }}</p>
									<p class="wait-note">Nothing changes on the other device until it approves.</p>
								</div>
								<el-button size="large" class="wait-cancel ms-0" @click="cancelWait">Cancel request</el-button>
							</div>
						</template>

						<template v-else>
							<el-alert :title="waitError" type="error" show-icon :closable="false" class="mb-3" role="alert" />
							<p class="wait-note">
								You can ask again. The signed-in device will see a new request and can approve it.
							</p>
							<el-button type="primary" size="large" class="w-100 submit-btn" @click="retryAfterWait">Try again</el-button>
						</template>
					</div>

					<div v-else-if="view === 'signed-in' || view === 'session'" class="panel-body signed-in">
						<div class="account-chip">
							<span class="avatar" aria-hidden="true">
								<img v-if="authStore.avatarUrl" :src="authStore.avatarUrl" alt="" />
								<template v-else>{{ initials }}</template>
							</span>
							<div>
								<span class="chip-label">Signed in as</span>
								<strong>{{ authStore.displayName || authStore.username }}</strong>
							</div>
						</div>
						<template v-if="view === 'signed-in'">
							<el-button type="primary" size="large" class="w-100 submit-btn" @click="router.push(Routes.ADMIN)">
								Open admin console<el-icon class="ms-2"><Right /></el-icon>
							</el-button>
							<el-button size="large" class="w-100 mt-2 ms-0" @click="logout">Log out</el-button>
							<p class="fine-print">Logging out ends the session on this device only.</p>
						</template>
						<p v-else class="fine-print">Confirming this session…</p>
					</div>

					<el-form
						v-else-if="view === 'forgot'"
						ref="forgotRef"
						:model="forgot"
						:rules="forgotRules"
						label-position="top"
						size="large"
						class="panel-body"
						@submit.prevent="sendReset"
					>
						<el-alert v-if="recoverError" :title="recoverError" type="error" show-icon class="mb-3" role="alert" @close="recoverError = ''" />
						<el-form-item label="Username" prop="username">
							<el-input
								v-model.trim="forgot.username"
								autocomplete="username"
								placeholder="Enter your username"
								:prefix-icon="User"
								:disabled="resetting"
							/>
						</el-form-item>
						<el-button type="primary" native-type="submit" class="submit-btn" :loading="resetting">
							{{ resetting ? "Sending code…" : "Email me a code" }}
						</el-button>
						<div class="link-row">
							<button type="button" class="text-link" @click="haveCode">I already have a code</button>
						</div>
					</el-form>

					<div v-else-if="view === 'reset'" class="panel-body">
						<el-alert v-if="recoverNotice" :title="recoverNotice" type="info" show-icon class="mb-3" @close="recoverNotice = ''" />
						<el-alert v-if="recoverError" :title="recoverError" type="error" show-icon class="mb-3" role="alert" @close="recoverError = ''" />
						<p class="code-label">6-digit code</p>
						<CodeBoxes v-model="forgot.code" :disabled="resetting" @complete="checkResetCode" />
						<p class="code-hint" aria-live="polite">{{ resetting ? "Checking the code…" : "The code expires in 10 minutes." }}</p>
						<el-button
							type="primary"
							size="large"
							class="submit-btn"
							:loading="resetting"
							:disabled="resetting || forgot.code.length !== 6"
							@click="checkResetCode"
						>
							{{ resetting ? "Checking…" : "Verify code" }}
						</el-button>
						<div class="link-row split">
							<button type="button" class="text-link" :disabled="resendWait > 0 || resetting" @click="resendCode">
								{{ resendWait > 0 ? `Resend code in ${resendWait}s` : "Resend code" }}
							</button>
							<button type="button" class="text-link" :disabled="resetting" @click="openForgot(forgot.username)">Use a different username</button>
						</div>
					</div>

					<el-form
						v-else-if="view === 'newpass'"
						ref="resetRef"
						:model="forgot"
						:rules="resetRules"
						label-position="top"
						size="large"
						class="panel-body"
						autocomplete="on"
						@submit.prevent="applyReset"
					>
						<el-alert v-if="recoverError" :title="recoverError" type="error" show-icon class="mb-3" role="alert" @close="recoverError = ''" />
						<p class="ticket-note">
							<el-icon aria-hidden="true"><CircleCheckFilled /></el-icon>
							<span>Email verified</span>
							<span class="ticket-time">{{ formatDuration(ticketLeft) }} left</span>
						</p>
						<NewPasswordFields
							v-model:password="forgot.password"
							v-model:confirm="forgot.confirm"
							v-model:save="forgot.save"
							:username="forgot.username"
							:disabled="resetting"
						/>
						<el-button type="primary" native-type="submit" class="submit-btn" :loading="resetting" :disabled="resetting || !resetReady">
							{{ resetting ? "Updating…" : "Update password" }}
						</el-button>
					</el-form>

					<LoginChallenge
						v-else-if="view === 'mfa'"
						:mfa-token="mfa.token"
						:methods="mfa.methods"
						@done="finishMfa"
						@cancel="step = 'login'"
					/>

					<el-form
						v-else
						ref="formRef"
						:model="form"
						:rules="rules"
						label-position="top"
						size="large"
						class="panel-body"
						@submit.prevent="submit"
					>
						<el-alert v-if="notice" :title="notice" type="success" show-icon class="mb-3" @close="notice = ''" />
						<el-alert
							v-if="errorMessage"
							:title="errorMessage"
							type="error"
							show-icon
							class="mb-3"
							role="alert"
							@close="errorMessage = ''"
						/>
						<el-form-item label="Username" prop="username">
							<el-input
								v-model.trim="form.username"
								autocomplete="username"
								placeholder="Enter your username"
								:prefix-icon="User"
								:disabled="authStore.loading"
							/>
						</el-form-item>
						<el-form-item label="Password" prop="password" class="mb-2">
							<el-input
								v-model="form.password"
								type="password"
								show-password
								autocomplete="current-password"
								placeholder="Enter your password"
								:prefix-icon="Lock"
								:disabled="authStore.loading"
								aria-describedby="caps-hint"
								@keydown="readCapsLock"
								@keyup="readCapsLock"
								@blur="capsLock = false"
							/>
						</el-form-item>
						<div class="field-foot">
							<span id="caps-hint" class="caps-hint" role="status">
								<template v-if="capsLock"><el-icon><WarningFilled /></el-icon>Caps Lock is on</template>
							</span>
							<button type="button" class="text-link" @click="openForgot(form.username)">Forgot password?</button>
						</div>
						<el-button type="primary" native-type="submit" class="submit-btn" :loading="authStore.loading">
							{{ authStore.loading ? "Signing in…" : "Sign in" }}
						</el-button>
					</el-form>
				</template>
			</main>
		</div>
	</div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
	ArrowLeft,
	Calendar,
	Check,
	CircleCheckFilled,
	Iphone,
	Key,
	Lock,
	Message,
	Right,
	Trophy,
	User,
	UserFilled,
	WarningFilled,
} from "@element-plus/icons-vue";
import ActivateAccount from "@/components/admin/ActivateAccount.vue";
import CodeBoxes from "@/components/admin/CodeBoxes.vue";
import LoginChallenge from "@/components/admin/LoginChallenge.vue";
import NewPasswordFields from "@/components/admin/NewPasswordFields.vue";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/store/authStore";
import { unwrap } from "@/utils/adminHelpers";
import { Routes } from "@/utils/constants";
import { deviceLabel } from "@/utils/deviceSession";
import { formatDuration, MIN_PASSWORD_LENGTH, passwordReady } from "@/utils/passwordRules";
import { storeCredential } from "@/utils/passwordTools";
import { appRedirect } from "@/utils/queryState";

const WAIT_LIMIT_SECONDS = 600;
const RESEND_COOLDOWN_SECONDS = 30;
const RESET_STEPS = 3;

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const panelRef = ref(null);
const titleRef = ref(null);
const formRef = ref(null);
const forgotRef = ref(null);
const resetRef = ref(null);
const errorMessage = ref("");
const notice = ref("");
const recoverError = ref("");
const recoverNotice = ref("");
const step = ref("login");
const leaving = ref(false);
const resetting = ref(false);
const capsLock = ref(false);
const waitStatus = ref("Waiting for the other device…");
const waitState = ref("waiting");
const waitError = ref("");
const waitStarted = ref(0);
const resendAt = ref(0);
const now = ref(Date.now());
const thisDevice = deviceLabel();
let waitTimer = 0;
let clock = 0;
const form = reactive({ username: "", password: "" });
const mfa = reactive({ token: "", methods: [] });
const forgot = reactive({ username: "", code: "", password: "", confirm: "", save: true, ticket: "", deadline: 0 });

const rules = {
	username: [{ required: true, message: "Enter your username", trigger: "blur" }],
	password: [{ required: true, message: "Enter your password", trigger: "blur" }],
};
const forgotRules = {
	username: [{ required: true, message: "Enter your username", trigger: "blur" }],
};
const resetRules = {
	password: [
		{
			validator: (_rule, value, callback) =>
				!value || value.length < MIN_PASSWORD_LENGTH
					? callback(new Error(`Use at least ${MIN_PASSWORD_LENGTH} characters`))
					: callback(),
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

const view = computed(() => {
	if (step.value === "wait") return "wait";
	if (leaving.value) return ["forgot", "reset", "newpass", "mfa"].includes(step.value) ? step.value : "login";
	if (authStore.isAuthenticated) {
		if (!authStore.profileLoaded) return "session";
		if (authStore.mustChangePassword) return "activate";
		return "signed-in";
	}
	if (["forgot", "reset", "newpass", "mfa"].includes(step.value)) return step.value;
	return "login";
});

const canGoBack = computed(
	() => ["forgot", "reset", "newpass", "mfa"].includes(view.value) || (view.value === "wait" && waitState.value !== "waiting"),
);

const header = computed(() => {
	switch (view.value) {
		case "forgot":
			return {
				icon: Key,
				tone: "gold",
				eyebrow: `Reset password · Step 1 of ${RESET_STEPS}`,
				title: "Forgot your password?",
				text: "Enter your username. A 6-digit code goes to the email address on that account.",
				step: 1,
			};
		case "reset":
			return {
				icon: Message,
				tone: "gold",
				eyebrow: `Reset password · Step 2 of ${RESET_STEPS}`,
				title: "Check your email",
				text: `Enter the code sent for ${forgot.username}. The new password comes next.`,
				step: 2,
			};
		case "newpass":
			return {
				icon: Lock,
				tone: "gold",
				eyebrow: `Reset password · Step 3 of ${RESET_STEPS}`,
				title: "Choose a new password",
				text: `For ${forgot.username}. Every device signed in to this account is signed out.`,
				step: 3,
			};
		case "mfa":
			return {
				icon: Key,
				tone: "gold",
				eyebrow: "Second step",
				title: "Confirm it's you",
				text: "This account asks for another check after the password.",
			};
		case "wait":
			return waitState.value === "waiting"
				? {
						icon: Iphone,
						tone: "navy",
						eyebrow: "Device approval",
						title: "Approve on your other device",
						text: `${form.username || "This account"} is signed in somewhere else. That device has to let this one in.`,
					}
				: {
						icon: Iphone,
						tone: "red",
						eyebrow: "Device approval",
						title: "Sign-in not approved",
						text: "",
					};
		case "session":
		case "signed-in":
			return {
				icon: UserFilled,
				tone: "navy",
				eyebrow: "Admin console",
				title: "You're already signed in",
				text: view.value === "session" ? "Confirming this session…" : "Continue to the console or log out to switch accounts.",
			};
		default:
			return {
				icon: Lock,
				tone: "navy",
				eyebrow: "Restricted area",
				title: "Admin sign in",
				text: "Manage seasons, fixtures, players and results.",
			};
	}
});

const initials = computed(() =>
	String(authStore.username || "?")
		.split(/[\s._-]+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0].toUpperCase())
		.join(""),
);

const waitElapsed = computed(() => (waitStarted.value ? (now.value - waitStarted.value) / 1000 : 0));
const waitRemaining = computed(() => Math.max(0, Math.ceil(WAIT_LIMIT_SECONDS - waitElapsed.value)));
const resendWait = computed(() => Math.max(0, Math.ceil((resendAt.value - now.value) / 1000)));
const ticketLeft = computed(() => Math.max(0, Math.ceil((forgot.deadline - now.value) / 1000)));
const resetReady = computed(() => passwordReady(forgot.password, forgot.confirm));

const focusView = async () => {
	await nextTick();
	const panel = panelRef.value;
	if (!panel) return;
	const fields = [...panel.querySelectorAll("input:not([disabled])")];
	if (["login", "forgot", "reset", "newpass", "mfa"].includes(view.value) && fields.length) {
		(fields.find((input) => !input.value) || fields[0]).focus();
		return;
	}
	titleRef.value?.focus();
};

watch([view, waitState], (current, previous) => {
	if (current[0] !== previous[0] || current[1] !== previous[1]) focusView();
});

watch(
	() => [form.username, form.password],
	() => {
		errorMessage.value = "";
	},
);

for (const field of ["password", "confirm"]) {
	watch(
		() => forgot[field],
		() => resetRef.value?.clearValidate(field),
	);
}

const readCapsLock = (event) => {
	if (typeof event?.getModifierState === "function") capsLock.value = event.getModifierState("CapsLock");
};

const openForgot = (username = "") => {
	Object.assign(forgot, { username, code: "", password: "", confirm: "", save: true, ticket: "", deadline: 0 });
	recoverError.value = "";
	recoverNotice.value = "";
	step.value = "forgot";
};

const backToSignIn = () => {
	if (["forgot", "reset", "newpass"].includes(step.value) && forgot.username && !form.username) form.username = forgot.username;
	recoverError.value = "";
	step.value = "login";
	waitState.value = "waiting";
};

const requestCode = async () => {
	await authService.forgotPassword(forgot.username);
	resendAt.value = Date.now() + RESEND_COOLDOWN_SECONDS * 1000;
	recoverNotice.value = `If ${forgot.username} has an email address on file, a code is on its way. It can take a minute to arrive.`;
};

const sendReset = async () => {
	recoverError.value = "";
	const valid = await forgotRef.value.validate().catch(() => false);
	if (!valid) return;
	resetting.value = true;
	try {
		await requestCode();
		step.value = "reset";
	} catch (error) {
		recoverError.value = error?.message || "The reset code could not be sent. Try again in a moment.";
	} finally {
		resetting.value = false;
	}
};

const haveCode = async () => {
	recoverError.value = "";
	const valid = await forgotRef.value.validate().catch(() => false);
	if (!valid) return;
	recoverNotice.value = "";
	step.value = "reset";
};

const resendCode = async () => {
	if (resendWait.value > 0) return;
	recoverError.value = "";
	resetting.value = true;
	try {
		await requestCode();
	} catch (error) {
		recoverError.value = error?.message || "The reset code could not be sent. Try again in a moment.";
	} finally {
		resetting.value = false;
	}
};

const checkResetCode = async () => {
	if (resetting.value || forgot.code.length !== 6) return;
	recoverError.value = "";
	resetting.value = true;
	try {
		const data = unwrap(await authService.verifyResetCode(forgot.username, forgot.code));
		forgot.ticket = data.ticket;
		forgot.deadline = Date.now() + (Number(data.expires_in) || 600) * 1000;
		recoverNotice.value = "";
		step.value = "newpass";
	} catch (error) {
		forgot.code = "";
		recoverError.value = error?.message || "That code is not valid. Check the latest email or send a new code.";
	} finally {
		resetting.value = false;
	}
};

const ticketExpired = () => {
	forgot.ticket = "";
	forgot.code = "";
	step.value = "reset";
	recoverError.value = "That took too long, so the reset expired. Send a new code to start again.";
};

const applyReset = async () => {
	recoverError.value = "";
	const valid = await resetRef.value.validate().catch(() => false);
	if (!valid || !resetReady.value) return;
	resetting.value = true;
	try {
		await authService.resetPassword(forgot.username, forgot.ticket, forgot.password);
		if (forgot.save) await storeCredential(forgot.username, forgot.password);
		form.username = forgot.username;
		form.password = "";
		Object.assign(forgot, { code: "", password: "", confirm: "", ticket: "", deadline: 0 });
		step.value = "login";
		await nextTick();
		notice.value = "Password updated. A confirmation email is on its way. Sign in with the new password.";
	} catch (error) {
		const message = error?.message || "The password could not be reset. Try again.";
		if (/expired/i.test(message)) {
			ticketExpired();
			return;
		}
		recoverError.value = message;
	} finally {
		resetting.value = false;
	}
};

watch(ticketLeft, (left) => {
	if (step.value === "newpass" && forgot.deadline && left === 0) ticketExpired();
});

const goIn = async () => {
	leaving.value = true;
	try {
		await router.push(safeRedirect());
	} catch {
		leaving.value = false;
	}
};

const safeRedirect = () =>
	appRedirect(route.query.redirect, (path) => {
		const resolved = router.resolve(path);
		return resolved.matched.some((record) => !String(record.path).includes("pathMatch"));
	}) || Routes.ADMIN;

const submit = async () => {
	errorMessage.value = "";
	notice.value = "";
	const valid = await formRef.value.validate().catch(() => false);
	if (!valid) return;

	try {
		const result = await authStore.login(form.username, form.password);
		form.password = "";
		if (result?.pending) {
			startWait(result.requestId);
			return;
		}
		if (result?.mfa) {
			mfa.token = result.mfaToken;
			mfa.methods = result.methods;
			step.value = "mfa";
			return;
		}
		await goIn();
	} catch (error) {
		form.password = "";
		await nextTick();
		errorMessage.value =
			error?.message && error?.success === false
				? error.message
				: "Unable to sign in. Check your credentials and try again.";
	}
};

const finishMfa = async (data) => {
	if (data?.pending) {
		startWait(data.request_id);
		return;
	}
	await authStore.adopt(data.access_token, form.username);
	step.value = "login";
	await goIn();
};

const startWait = (requestId) => {
	waitState.value = "waiting";
	waitError.value = "";
	waitStarted.value = Date.now();
	now.value = waitStarted.value;
	waitStatus.value = "Waiting for the other device…";
	step.value = "wait";
	pollClaim(requestId);
};

const failWait = (message) => {
	window.clearInterval(waitTimer);
	waitError.value = message;
	waitState.value = "failed";
};

const pollClaim = (requestId) => {
	window.clearInterval(waitTimer);
	waitTimer = window.setInterval(async () => {
		try {
			const response = await authService.claimLogin(requestId);
			if (response?.data?.pending) {
				waitStatus.value = "Still waiting. The other device has not answered yet.";
				return;
			}
			window.clearInterval(waitTimer);
			waitStatus.value = "Approved. Signing you in…";
			await authStore.adopt(response.data.access_token, form.username);
			step.value = "login";
			await goIn();
		} catch (error) {
			failWait(error?.detail || error?.message || "The other device did not approve this sign-in.");
		}
	}, 3000);
};

watch(waitRemaining, (remaining) => {
	if (step.value === "wait" && waitState.value === "waiting" && waitStarted.value && remaining <= 0) {
		failWait("The request expired after 10 minutes without an answer.");
	}
});

const cancelWait = () => {
	window.clearInterval(waitTimer);
	step.value = "login";
	notice.value = "";
	errorMessage.value = "";
};

const retryAfterWait = () => {
	cancelWait();
	waitState.value = "waiting";
};

const onActivated = async (result) => {
	step.value = "login";
	form.password = "";
	if (result?.switched) {
		form.username = "";
		return;
	}
	await nextTick();
	notice.value = "Password saved. The account is active. Sign in with the new password.";
};

onMounted(() => {
	clock = window.setInterval(() => {
		now.value = Date.now();
	}, 1000);
	focusView();
});

onUnmounted(() => {
	window.clearInterval(waitTimer);
	window.clearInterval(clock);
});

const logout = () => {
	authStore.logout();
	router.push(Routes.HOME);
};
</script>

<style scoped lang="scss">
.auth-page {
	min-height: calc(100vh - var(--app-header-height) - 80px);
	display: grid;
	place-items: safe center;
	padding: clamp(12px, 3vh, 40px) var(--page-gutter);
	background:
		radial-gradient(circle at 12% 18%, rgba(245, 184, 46, 0.16), transparent 42%),
		radial-gradient(circle at 88% 82%, rgba(24, 41, 77, 0.12), transparent 45%);
}

.auth-frame {
	width: 100%;
	max-width: 1040px;
	display: grid;
	grid-template-columns: minmax(280px, 0.82fr) minmax(0, 1.18fr);
	border-radius: 24px;
	overflow: hidden;
	background: #fff;
	border: 1px solid var(--cpl-line);
	box-shadow: 0 28px 70px rgba(15, 23, 42, 0.14);
	animation: rise 0.45s ease both;
}

.auth-aside {
	position: relative;
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
	min-height: 100%;
	padding: 40px;
	color: #fff;
	overflow: hidden;
	background:
		radial-gradient(circle at 80% 10%, rgba(245, 184, 46, 0.22), transparent 45%),
		linear-gradient(160deg, var(--cpl-navy-700), var(--cpl-navy-900));
}

.aside-board {
	position: absolute;
	top: -60px;
	right: -60px;
	width: 340px;
	height: 340px;
	border-radius: 36px;
	transform: rotate(14deg);
	border: 2px solid rgba(255, 209, 102, 0.28);
}

.ring {
	position: absolute;
	inset: 50%;
	border-radius: 50%;
	border: 2px solid rgba(255, 209, 102, 0.3);
	transform: translate(-50%, -50%);
}

.ring-1 { width: 60px; height: 60px; }
.ring-2 { width: 150px; height: 150px; border-style: dashed; }
.ring-3 { width: 250px; height: 250px; opacity: 0.6; }

.coin {
	position: absolute;
	width: 26px;
	height: 26px;
	border-radius: 50%;
	box-shadow: inset 0 0 0 4px rgba(0, 0, 0, 0.12);
}

.coin-1 { top: 46%; left: 44%; background: var(--cpl-red-500); }
.coin-2 { top: 34%; left: 58%; background: #f4ede0; }
.coin-3 { top: 58%; left: 60%; background: #1f2937; box-shadow: inset 0 0 0 4px rgba(255, 255, 255, 0.15); }

.aside-copy {
	position: relative;
}

.aside-eyebrow {
	font-size: 12px;
	font-weight: 700;
	letter-spacing: 0.16em;
	text-transform: uppercase;
	color: var(--cpl-gold-400);
}

.aside-title {
	font-family: var(--cpl-font-display);
	font-size: 34px;
	font-weight: 800;
	margin: 8px 0 6px;
}

.aside-text {
	margin: 0 0 24px;
	color: rgba(255, 255, 255, 0.75);
}

.aside-list {
	list-style: none;
	padding: 0;
	margin: 0;
	display: grid;
	gap: 14px;
	font-size: 14px;
	color: rgba(255, 255, 255, 0.88);

	li {
		display: flex;
		align-items: flex-start;
		gap: 12px;
	}

	.el-icon {
		flex: none;
		width: 30px;
		height: 30px;
		margin-top: -4px;
		border-radius: 10px;
		background: rgba(255, 209, 102, 0.14);
		color: var(--cpl-gold-400);
	}
}

.auth-panel {
	position: relative;
	display: flex;
	flex-direction: column;
	justify-content: center;
	padding: clamp(28px, 5vw, 48px);
	min-width: 0;
	container-type: inline-size;
	container-name: auth-panel;
}

.back-link {
	align-self: flex-start;
	display: inline-flex;
	align-items: center;
	gap: 6px;
	margin-bottom: 18px;
	padding: 6px 10px 6px 6px;
	border: 0;
	border-radius: 8px;
	background: none;
	color: var(--cpl-ink-600);
	font-size: 14px;
	font-weight: 600;
	cursor: pointer;

	&:hover {
		background: var(--cpl-surface-muted);
		color: var(--cpl-ink-900);
	}
}

.auth-head {
	margin-bottom: 24px;

	&.is-compact {
		margin-bottom: 14px;

		.step-badge {
			width: 44px;
			height: 44px;
			margin-bottom: 10px;
			font-size: 20px;
		}
	}
}

.step-badge {
	width: 52px;
	height: 52px;
	margin-bottom: 16px;
	border-radius: 16px;
	display: grid;
	place-items: center;
	font-size: 24px;

	&.is-navy {
		color: var(--cpl-gold-400);
		background: linear-gradient(135deg, var(--cpl-navy-900), var(--cpl-navy-700));
		box-shadow: 0 10px 24px rgba(11, 20, 38, 0.3);
	}

	&.is-gold {
		color: var(--cpl-navy-900);
		background: linear-gradient(135deg, var(--cpl-gold-400), var(--cpl-gold-500));
		box-shadow: 0 10px 24px rgba(245, 184, 46, 0.35);
	}

	&.is-red {
		color: #fff;
		background: var(--cpl-red-500);
		box-shadow: 0 10px 24px rgba(230, 57, 70, 0.3);
	}
}

.auth-title {
	font-family: var(--cpl-font-display);
	font-size: clamp(24px, 4vw, 30px);
	font-weight: 800;
	margin: 6px 0 6px;
	color: var(--cpl-ink-900);
	outline: none;
}

.auth-text {
	margin: 0;
	font-size: 15px;
	color: var(--cpl-ink-600);
	overflow-wrap: anywhere;
}

.step-track {
	display: grid;
	grid-auto-flow: column;
	grid-auto-columns: 1fr;
	gap: 6px;
	margin-top: 18px;
	max-width: 200px;

	span {
		height: 5px;
		border-radius: 999px;
		background: var(--cpl-line);
	}

	.is-on {
		background: var(--cpl-gold-500);
	}
}

.panel-body {
	width: 100%;
}

.submit-btn {
	width: 100%;
	margin-top: 8px;
	font-weight: 600;
	--el-button-bg-color: var(--cpl-navy-900);
	--el-button-border-color: var(--cpl-navy-900);
	--el-button-hover-bg-color: var(--cpl-navy-700);
	--el-button-hover-border-color: var(--cpl-navy-700);
	--el-button-active-bg-color: var(--cpl-navy-800);
	--el-button-active-border-color: var(--cpl-navy-800);
}

.field-foot {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	min-height: 24px;
	margin-bottom: 14px;
}

.code-label {
	margin: 0 0 10px;
	font-size: 14px;
	font-weight: 600;
	color: var(--cpl-ink-900);
}

.code-hint {
	margin: 10px 0 16px;
	font-size: 13px;
	color: var(--cpl-ink-600);
}

.ticket-note {
	display: flex;
	align-items: center;
	gap: 6px;
	margin: 0 0 18px;
	color: #17643a;
	font-size: 13px;
	font-weight: 600;
}

.ticket-time {
	margin-left: auto;
	color: var(--cpl-ink-600);
	font-weight: 500;
	font-variant-numeric: tabular-nums;
}

.caps-hint {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font-size: 13px;
	font-weight: 600;
	color: #b45309;
}

.text-link {
	padding: 2px 0;
	border: 0;
	background: none;
	color: var(--cpl-navy-700);
	font: inherit;
	font-size: 14px;
	font-weight: 700;
	cursor: pointer;
	border-radius: 4px;

	&:hover:not(:disabled) {
		text-decoration: underline;
	}

	&:disabled {
		color: var(--cpl-ink-400);
		cursor: default;
	}
}

.text-link:focus-visible,
.back-link:focus-visible {
	outline: 2px solid var(--cpl-gold-500);
	outline-offset: 2px;
}

.link-row {
	display: flex;
	justify-content: center;
	gap: 12px;
	margin-top: 16px;

	&.split {
		justify-content: space-between;
		flex-wrap: wrap;
	}
}

.code-input :deep(.el-input__inner) {
	font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
	font-size: 22px;
	letter-spacing: 0.5em;
	text-align: center;
}

.wait-steps {
	list-style: none;
	margin: 0 0 22px;
	padding: 0;
	display: grid;
	gap: 0;

	li {
		position: relative;
		display: flex;
		gap: 14px;
		padding-bottom: 18px;
		color: var(--cpl-ink-400);

		&:not(:last-child)::after {
			content: "";
			position: absolute;
			left: 13px;
			top: 30px;
			bottom: 2px;
			width: 2px;
			background: var(--cpl-line);
		}

		div {
			display: grid;
			gap: 2px;
			font-size: 13px;
		}

		strong {
			font-size: 15px;
		}
	}

	.dot {
		flex: none;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-size: 13px;
		font-weight: 700;
		background: var(--cpl-surface-muted);
		border: 2px solid var(--cpl-line);
	}

	.is-done {
		color: var(--cpl-ink-600);

		strong { color: var(--cpl-ink-900); }

		.dot {
			color: #fff;
			background: #1f9d55;
			border-color: #1f9d55;
		}
	}

	.is-active {
		color: var(--cpl-ink-600);

		strong { color: var(--cpl-ink-900); }

		.dot {
			border-color: var(--cpl-gold-500);
			background: var(--cpl-gold-100);
		}
	}
}

.pulse {
	width: 10px;
	height: 10px;
	border-radius: 50%;
	background: var(--cpl-gold-500);
	animation: pulse 1.4s ease-in-out infinite;
}

.wait-timer {
	padding: 14px 16px;
	border-radius: var(--cpl-radius-md);
	background: var(--cpl-surface-muted);
}

.timer-row {
	display: flex;
	justify-content: space-between;
	gap: 12px;
	font-size: 13px;
	font-weight: 600;
	color: var(--cpl-ink-600);
	font-variant-numeric: tabular-nums;
}

.timer-bar {
	height: 6px;
	margin-top: 10px;
	border-radius: 999px;
	background: var(--cpl-line);
	overflow: hidden;

	span {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, var(--cpl-gold-500), var(--cpl-gold-400));
		transition: width 1s linear;
	}
}

.wait-status {
	margin: 16px 0 4px;
	font-size: 14px;
	font-weight: 600;
	color: var(--cpl-ink-900);
}

.wait-note,
.fine-print {
	margin: 0 0 18px;
	font-size: 13px;
	color: var(--cpl-ink-600);
}

.fine-print {
	margin: 14px 0 0;
	text-align: center;
}

.account-chip {
	display: flex;
	align-items: center;
	gap: 14px;
	margin-bottom: 20px;
	padding: 14px 16px;
	border: 1px solid var(--cpl-line);
	border-radius: var(--cpl-radius-md);
	background: var(--cpl-surface-muted);

	div {
		display: grid;
		min-width: 0;
	}

	strong {
		font-size: 17px;
		color: var(--cpl-ink-900);
		overflow-wrap: anywhere;
	}
}

.chip-label {
	font-size: 12px;
	color: var(--cpl-ink-600);
}

.avatar {
	flex: none;
	width: 44px;
	height: 44px;
	border-radius: 50%;
	display: grid;
	place-items: center;
	overflow: hidden;
	font-weight: 800;
	color: var(--cpl-navy-900);
	background: linear-gradient(135deg, var(--cpl-gold-400), var(--cpl-gold-500));

	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
}

@media (min-width: 1200px) {
	.auth-frame {
		max-width: 1160px;
	}

	.auth-frame.is-waiting {
		max-width: 1220px;
	}
}

.wait-cancel {
	width: 100%;
}

.wait-foot .wait-status {
	margin: 0 0 4px;
}

.wait-foot .wait-note {
	margin: 0;
}

@container auth-panel (min-width: 520px) {
	.wait-steps {
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 12px;

		li {
			flex-direction: column;
			gap: 10px;
			padding: 14px;
			border: 1px solid var(--cpl-line);
			border-radius: 14px;
			background: #fff;

			&:not(:last-child)::after {
				display: none;
			}
		}

		.is-active {
			border-color: var(--cpl-gold-500);
			background: var(--cpl-gold-100, #fff8e8);
		}

		.is-done {
			background: #f4fbf6;
		}
	}

	.wait-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		margin-top: 16px;
	}

	.wait-cancel {
		width: auto;
		flex: none;
	}
}

@media (max-width: 860px) {
	.auth-frame {
		grid-template-columns: 1fr;
		max-width: 640px;
	}

	.auth-aside {
		display: none;
	}
}

@media (max-width: 480px) {
	.auth-page {
		padding: 16px 12px;
		align-items: start;
	}

	.auth-frame {
		border-radius: 20px;
	}

	.auth-panel {
		padding: 24px 20px;
	}
}

@keyframes rise {
	from {
		opacity: 0;
		transform: translateY(16px);
	}
	to {
		opacity: 1;
		transform: none;
	}
}

@keyframes pulse {
	0%, 100% { transform: scale(0.8); opacity: 0.6; }
	50% { transform: scale(1.2); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
	.auth-frame,
	.pulse {
		animation: none;
	}

	.timer-bar span {
		transition: none;
	}
}
</style>
