<template>
	<el-dialog
		:model-value="modelValue"
		title="Set up an authenticator app"
		width="min(880px, 96vw)"
		:fullscreen="isPhone"
		class="totp-dialog"
		:close-on-click-modal="false"
		:close-on-press-escape="!busy"
		:show-close="!busy"
		:before-close="requestClose"
		append-to-body
		@update:model-value="emit('update:modelValue', $event)"
	>
		<el-steps :active="step" finish-status="success" align-center class="totp-steps" aria-label="Setup progress">
			<el-step title="Get started" />
			<el-step title="Scan the code" />
			<el-step title="Verify" />
			<el-step title="Completed" />
		</el-steps>

		<section v-if="step === 0" class="step-body" aria-labelledby="totp-step-0">
			<h3 id="totp-step-0">Add a second check from your phone</h3>
			<p>
				An authenticator app shows a new 6-digit code every 30 seconds. Once it is on, sign-in asks for that code after your password.
			</p>
			<ul class="bullets">
				<li>You need an app such as Microsoft Authenticator, Google Authenticator, or another app that scans QR codes.</li>
				<li>Setup takes about a minute: scan the code, then type the number the app shows.</li>
				<li>The key is shown only here. It is never sent in a link or written to logs.</li>
			</ul>
			<el-alert
				type="info"
				:closable="false"
				show-icon
				title="Keep your other sign-in methods. If you lose this phone, sign in with an email code or a passkey, then remove this app and set it up again."
			/>
			<div class="step-actions">
				<el-button type="primary" :loading="starting" :disabled="starting" @click="start">Start setup</el-button>
			</div>
		</section>

		<section v-else-if="step === 1" class="step-body scan" aria-labelledby="totp-step-1">
			<div class="qr-wrap">
				<img v-if="qr" :src="qr" width="220" height="220" alt="QR code to add this account to your authenticator app" />
				<span v-else class="qr-placeholder">Preparing the code…</span>
			</div>
			<div class="scan-text">
				<h3 id="totp-step-1">Scan the QR code</h3>
				<p>In your app, choose <strong>Add account</strong>, then scan this code.</p>
				<p>Can't scan it? Choose <strong>Enter a setup key</strong> and type this key:</p>
				<div class="secret">
					<code aria-label="Setup key">{{ groupedSecret }}</code>
					<el-button :disabled="!secret" @click="copySecret">{{ copied ? "Copied" : "Copy key" }}</el-button>
				</div>
				<p class="sr-only" aria-live="polite">{{ copied ? "Setup key copied." : "" }}</p>
				<div class="step-actions">
					<el-button @click="back">Back</el-button>
					<el-button type="primary" :disabled="!secret" @click="step = 2">I've added it</el-button>
				</div>
			</div>
		</section>

		<section v-else-if="step === 2" class="step-body" aria-labelledby="totp-step-2">
			<h3 id="totp-step-2">Enter the code from your app</h3>
			<p>Type the 6-digit code the app shows right now.</p>
			<el-alert
				v-if="setupExpired"
				type="warning"
				:closable="false"
				show-icon
				role="alert"
				title="This setup has ended. Start again to get a new key and QR code."
			>
				<el-button size="small" type="primary" :loading="starting" @click="restart">Start setup again</el-button>
			</el-alert>
			<el-form novalidate label-position="top" class="verify-form" @submit.prevent="verify">
				<el-form-item label="Authenticator code" :error="codeError" data-prop="code">
					<el-input
						:model-value="code"
						class="otp-input"
						inputmode="numeric"
						autocomplete="one-time-code"
						placeholder="000000"
						aria-label="Authenticator code"
						:disabled="busy"
						@update:model-value="onCodeInput"
					/>
				</el-form-item>
			</el-form>
			<div class="step-actions">
				<el-button :disabled="busy" @click="step = 1">Back</el-button>
				<el-button type="primary" :loading="busy" :disabled="busy || code.length !== 6 || setupExpired" @click="verify">Turn on</el-button>
			</div>
		</section>

		<section v-else class="step-body done" aria-labelledby="totp-step-3" role="status">
			<h3 id="totp-step-3">Authenticator app is on</h3>
			<p>Sign-in now asks for a code from your app after your password.</p>
			<div class="step-actions">
				<el-button type="primary" @click="finish">Done</el-button>
			</div>
		</section>
	</el-dialog>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { ElMessageBox } from "element-plus";
import { notify } from "@/utils/notify";
import { authService } from "@/services/authService";
import { unwrap } from "@/utils/adminHelpers";
import { useIsPhone } from "@/utils/viewport";

const props = defineProps({
	modelValue: { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue", "enabled"]);

const isPhone = useIsPhone();
const step = ref(0);
const starting = ref(false);
const busy = ref(false);
const secret = ref("");
const qr = ref("");
const code = ref("");
const codeError = ref("");
const setupExpired = ref(false);
const copied = ref(false);

const groupedSecret = computed(() => secret.value.replace(/(.{4})/g, "$1 ").trim());

const reset = () => {
	step.value = 0;
	starting.value = false;
	busy.value = false;
	secret.value = "";
	qr.value = "";
	code.value = "";
	codeError.value = "";
	setupExpired.value = false;
	copied.value = false;
};

// Reset on open and on close, so the setup key and QR code never stay in memory after the dialog shuts.
watch(
	() => props.modelValue,
	() => reset(),
);

// Closing mid-setup needs a confirmation, because the key on screen will stop mattering.
const requestClose = async (done) => {
	if (busy.value) return undefined;
	const close = typeof done === "function" ? done : () => emit("update:modelValue", false);
	const midSetup = step.value === 1 || step.value === 2;
	if (midSetup) {
		try {
			await ElMessageBox.confirm(
				"Your authenticator app will not be turned on. You can start the setup again later.",
				"Stop setting up the app?",
				{ confirmButtonText: "Stop setup", cancelButtonText: "Keep going", type: "warning" },
			);
		} catch {
			return undefined;
		}
	}
	return close();
};

const onCodeInput = (value) => {
	code.value = String(value).replace(/\D/g, "").slice(0, 6);
	codeError.value = "";
};

const back = () => {
	step.value = 0;
	secret.value = "";
	qr.value = "";
};

const start = async () => {
	starting.value = true;
	try {
		const started = unwrap(await authService.startTotp());
		const QRCode = (await import("qrcode")).default;
		qr.value = await QRCode.toDataURL(started.otpauth_uri, { margin: 1, width: 220 });
		secret.value = started.secret;
		step.value = 1;
	} catch (error) {
		notify.error(error?.message || "Authenticator setup could not start.", { critical: true });
	} finally {
		starting.value = false;
	}
};

const copySecret = async () => {
	try {
		await navigator.clipboard.writeText(secret.value);
		copied.value = true;
	} catch {
		notify.info("Select the setup key and copy it by hand.");
	}
};

const verify = async () => {
	if (busy.value) return;
	if (!/^\d{6}$/.test(code.value)) {
		codeError.value = "Enter the 6-digit code from the app.";
		return;
	}
	busy.value = true;
	codeError.value = "";
	try {
		const status = unwrap(await authService.confirmTotp(code.value));
		secret.value = "";
		qr.value = "";
		step.value = 3;
		emit("enabled", status);
	} catch (error) {
		// A wrong code stays on this step with the message next to the field. The user can try again.
		const message = error?.message || "That code was not accepted. Check the app and try again.";
		// The server has no pending key any more (replaced, or the setup was cleared). Offer a clean restart.
		setupExpired.value = /start .*again/i.test(message);
		codeError.value = setupExpired.value ? "" : message;
		code.value = "";
	} finally {
		busy.value = false;
	}
};

const restart = () => {
	reset();
	start();
};

const finish = () => {
	emit("update:modelValue", false);
};
</script>

<style scoped>
.totp-steps {
	margin-bottom: 24px;
}

.step-body {
	display: grid;
	gap: 14px;
}

.step-body h3 {
	margin: 0;
	font-size: 18px;
	font-weight: 700;
}

.step-body p {
	margin: 0;
	line-height: 1.5;
}

.bullets {
	margin: 0;
	padding-left: 20px;
	line-height: 1.6;
}

.step-actions {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-end;
	gap: 8px;
	margin-top: 8px;
}

.scan {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr);
	gap: 24px;
	align-items: start;
}

.qr-wrap {
	display: grid;
	place-items: center;
	width: 236px;
	height: 236px;
	border-radius: 14px;
	background: #fff;
	border: 1px solid var(--cpl-line);
}

.qr-placeholder {
	color: var(--cpl-ink-600);
	font-size: 14px;
}

.secret {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 10px;
}

.secret code {
	padding: 8px 12px;
	border-radius: 10px;
	background: var(--cpl-surface-muted);
	font-size: 16px;
	letter-spacing: 0.06em;
	overflow-wrap: anywhere;
}

.otp-input {
	max-width: 240px;
	letter-spacing: 0.3em;
}

.sr-only {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip: rect(0 0 0 0);
	white-space: nowrap;
}

@media (max-width: 767.98px) {
	.scan {
		grid-template-columns: minmax(0, 1fr);
		justify-items: center;
	}

	.scan-text {
		width: 100%;
	}
}
</style>
