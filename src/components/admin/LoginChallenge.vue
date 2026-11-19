<template>
	<div class="panel-body challenge">
		<el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon class="mb-3" role="alert" @close="errorMessage = ''" />
		<p v-if="passkeyStatus" class="passkey-status" role="status" aria-live="polite">
			<span class="passkey-spinner" aria-hidden="true"></span>
			{{ passkeyStatus }}
		</p>

		<div v-if="picking" class="block">
			<p class="note">Choose how you want to confirm it's you.</p>
			<div class="choice-list">
				<button v-if="methods.includes('totp')" type="button" class="choice" :disabled="locked" @click="choose('totp')">
					<span class="choice-icon" aria-hidden="true"><el-icon><Iphone /></el-icon></span>
					<span class="choice-copy">
						<strong>Authenticator app</strong>
						<small>Enter the 6-digit code from your app</small>
					</span>
					<el-icon class="choice-go" aria-hidden="true"><ArrowRight /></el-icon>
				</button>
				<button v-if="methods.includes('email')" type="button" class="choice" :disabled="locked" @click="choose('email')">
					<span class="choice-icon" aria-hidden="true"><el-icon><Message /></el-icon></span>
					<span class="choice-copy">
						<strong>Email code</strong>
						<small>We'll send a 6-digit code to your email</small>
					</span>
					<el-icon class="choice-go" aria-hidden="true"><ArrowRight /></el-icon>
				</button>
				<button v-if="methods.includes('passkey')" type="button" class="choice is-featured" :disabled="locked" @click="signInWithPasskey">
					<span class="choice-icon" aria-hidden="true"><el-icon><Key /></el-icon></span>
					<span class="choice-copy">
						<strong>Passkey</strong>
						<small>Use the passkey saved on this device</small>
					</span>
					<el-icon class="choice-go" aria-hidden="true"><ArrowRight /></el-icon>
				</button>
			</div>
		</div>

		<div v-else-if="method === 'totp' || method === 'email'" class="block">
			<p class="note">{{ method === "email" ? "Enter the 6-digit code from your email." : "Enter the 6-digit code from your authenticator app." }}</p>
			<CodeBoxes v-model="code" :disabled="locked" @complete="verify" />
			<p v-if="verifying" class="note">Checking the code…</p>
			<button
				v-if="method === 'email' && !verifying"
				type="button"
				class="text-link"
				:disabled="locked || resendWait > 0"
				@click="sendEmail"
			>
				{{ resendWait > 0 ? `Resend code in ${resendWait}s` : sent ? "Resend code" : "Email me a sign-in code" }}
			</button>
			<p v-if="method === 'email' && sent && !resendWait" class="note">Check your inbox. It can take a minute to arrive.</p>
			<button
				v-if="methods.includes('passkey') && !canSwitch"
				type="button"
				class="choice"
				:disabled="locked"
				@click="signInWithPasskey"
			>
				<span class="choice-icon" aria-hidden="true"><el-icon><Key /></el-icon></span>
				<span class="choice-copy">
					<strong>Use a passkey</strong>
					<small>Skip the code and use this device</small>
				</span>
				<el-icon class="choice-go" aria-hidden="true"><ArrowRight /></el-icon>
			</button>
		</div>

		<div class="switch-row">
			<button v-if="canSwitch && !picking" type="button" class="switch" :disabled="locked" @click="backToChoices">
				<span class="switch-icon" aria-hidden="true"><el-icon><RefreshLeft /></el-icon></span>
				<span class="switch-copy">
					<strong>Use a different method</strong>
					<small>Pick another way to confirm</small>
				</span>
			</button>
			<button type="button" class="switch" :disabled="locked" @click="emit('cancel')">
				<span class="switch-icon" aria-hidden="true"><el-icon><User /></el-icon></span>
				<span class="switch-copy">
					<strong>Use a different account</strong>
					<small>Back to username and password</small>
				</span>
			</button>
		</div>
	</div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { ArrowRight, Iphone, Key, Message, RefreshLeft, User } from "@element-plus/icons-vue";
import CodeBoxes from "@/components/admin/CodeBoxes.vue";
import { authService } from "@/services/authService";
import { unwrap } from "@/utils/adminHelpers";
import { usePasskey } from "@/utils/webauthn";

const RESEND_SECONDS = 30;

const props = defineProps({
	mfaToken: { type: String, required: true },
	methods: { type: Array, default: () => [] },
});
const emit = defineEmits(["done", "cancel"]);

const code = ref("");
const method = ref("");
const locked = ref(false);
const verifying = ref(false);
const sent = ref(false);
const errorMessage = ref("");
const passkeyPhase = ref("");
const passkeyStatus = computed(() => {
	if (passkeyPhase.value === "verify") return "Verifying your passkey…";
	if (passkeyPhase.value === "scan") return "Confirm with your face, fingerprint, or device PIN.";
	return "";
});
const resendAt = ref(0);
const now = ref(Date.now());
let clock = 0;

const codeMethods = computed(() => props.methods.filter((item) => item === "totp" || item === "email"));
const picking = computed(() => !method.value && codeMethods.value.length > 1);
const canSwitch = computed(() => codeMethods.value.length > 1);
const resendWait = computed(() => Math.max(0, Math.ceil((resendAt.value - now.value) / 1000)));

const choose = (next) => {
	if (locked.value) return;
	errorMessage.value = "";
	code.value = "";
	method.value = next;
	if (next === "email" && !sent.value) sendEmail();
};

const backToChoices = () => {
	if (locked.value) return;
	method.value = "";
	code.value = "";
	errorMessage.value = "";
};

const sendEmail = async () => {
	if (locked.value || resendWait.value > 0) return;
	errorMessage.value = "";
	locked.value = true;
	try {
		await authService.mfaEmailCode(props.mfaToken);
		sent.value = true;
		resendAt.value = Date.now() + RESEND_SECONDS * 1000;
		now.value = Date.now();
	} catch (error) {
		errorMessage.value = error?.message || "The code could not be sent.";
	} finally {
		locked.value = false;
	}
};

const verify = async () => {
	if (locked.value || !/^\d{6}$/.test(code.value)) return;
	errorMessage.value = "";
	locked.value = true;
	verifying.value = true;
	try {
		const data = unwrap(await authService.verifyMfa({ mfa_token: props.mfaToken, method: method.value, code: code.value }));
		emit("done", data);
	} catch (error) {
		errorMessage.value = error?.message || "That code was not accepted.";
		code.value = "";
	} finally {
		verifying.value = false;
		locked.value = false;
	}
};

const signInWithPasskey = async () => {
	if (locked.value) return;
	errorMessage.value = "";
	locked.value = true;
	passkeyPhase.value = "scan";
	try {
		const options = unwrap(await authService.mfaPasskeyOptions(props.mfaToken));
		const credential = await usePasskey(options);
		passkeyPhase.value = "verify";
		const data = unwrap(await authService.verifyMfa({ mfa_token: props.mfaToken, method: "passkey", credential }));
		emit("done", data);
	} catch (error) {
		if (error?.name !== "NotAllowedError") errorMessage.value = error?.message || "That passkey was not accepted.";
	} finally {
		passkeyPhase.value = "";
		locked.value = false;
	}
};

onMounted(() => {
	if (codeMethods.value.length === 1) method.value = codeMethods.value[0];
	if (method.value === "email") sendEmail();
	clock = window.setInterval(() => {
		now.value = Date.now();
	}, 250);
});

onUnmounted(() => window.clearInterval(clock));
</script>

<style scoped>
.block {
	display: flex;
	flex-direction: column;
	gap: 10px;
	margin-bottom: 16px;
}

.note {
	margin: 0;
	color: var(--cpl-ink-600);
	font-size: 14px;
	line-height: 1.45;
}

.choice-list,
.switch-row {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.choice,
.switch {
	display: flex;
	align-items: center;
	gap: 12px;
	width: 100%;
	margin: 0;
	padding: 12px 14px;
	border: 1px solid var(--cpl-line);
	border-radius: 14px;
	background: var(--cpl-surface);
	color: var(--cpl-ink-900);
	text-align: left;
	cursor: pointer;
	transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
}

.choice:hover:not(:disabled),
.switch:hover:not(:disabled),
.choice:focus-visible,
.switch:focus-visible {
	border-color: var(--cpl-gold-500);
	background: var(--cpl-surface-hover);
	outline: none;
}

.choice:disabled,
.switch:disabled {
	opacity: 0.55;
	cursor: not-allowed;
}

.choice.is-featured {
	border-color: var(--cpl-gold-border);
	background: var(--cpl-gold-wash);
}

.choice-icon,
.switch-icon {
	display: grid;
	place-items: center;
	flex: 0 0 40px;
	width: 40px;
	height: 40px;
	border-radius: 12px;
	background: var(--cpl-gold-wash);
	color: var(--cpl-gold-text);
	font-size: 18px;
}

.choice-copy,
.switch-copy {
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
	flex: 1;
}

.choice-copy strong,
.switch-copy strong {
	font-size: 15px;
	font-weight: 700;
	line-height: 1.25;
}

.choice-copy small,
.switch-copy small {
	color: var(--cpl-ink-600);
	font-size: 13px;
	line-height: 1.35;
}

.choice-go {
	flex: 0 0 auto;
	color: var(--cpl-ink-400);
}

.switch-row {
	margin-top: 4px;
	padding-top: 16px;
	border-top: 1px solid var(--cpl-line);
}

.text-link {
	align-self: flex-start;
	border: 0;
	background: none;
	padding: 0;
	color: var(--cpl-heading-soft);
	font-weight: 700;
	cursor: pointer;
}

.text-link:hover:not(:disabled) {
	text-decoration: underline;
}

.text-link:disabled {
	color: var(--cpl-ink-400);
	cursor: not-allowed;
}

.passkey-status {
	display: flex;
	align-items: center;
	gap: 10px;
	margin: 0 0 14px;
	padding: 12px 14px;
	border: 1px solid var(--cpl-gold-border);
	border-radius: 12px;
	background: var(--cpl-gold-wash);
	color: var(--cpl-ink-900);
	font-size: 14px;
	font-weight: 700;
	line-height: 1.4;
}

.passkey-spinner {
	flex: 0 0 16px;
	width: 16px;
	height: 16px;
	border: 2px solid var(--cpl-gold-border);
	border-top-color: var(--cpl-gold-text);
	border-radius: 50%;
	animation: passkey-spin 0.7s linear infinite;
}

@keyframes passkey-spin {
	to {
		transform: rotate(360deg);
	}
}

@media (prefers-reduced-motion: reduce) {
	.passkey-spinner {
		animation: none;
		border-top-color: var(--cpl-gold-border);
	}
}

.text-link:focus-visible {
	outline: 2px solid var(--cpl-gold-500);
	outline-offset: 2px;
	border-radius: 4px;
}

@container auth-panel (min-width: 560px) {
	.switch-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	}
}
</style>
