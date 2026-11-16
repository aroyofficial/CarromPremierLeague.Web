<template>
	<section class="security" aria-labelledby="security-title">
		<header class="security-head">
			<span class="shield" :class="`level-${level.tone}`" aria-hidden="true">
				<el-icon><Lock /></el-icon>
			</span>
			<div class="security-intro">
				<h2 id="security-title">Sign-in security</h2>
				<p>After your password, sign-in can ask for a second check. Turn on at least one.</p>
			</div>
			<span v-if="status" class="level-pill" :class="`level-${level.tone}`">{{ level.label }}</span>
		</header>

		<div v-if="loading" class="factor-grid" aria-busy="true">
			<div v-for="n in 3" :key="n" class="factor skeleton"></div>
		</div>
		<el-alert v-else-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false">
			<el-button size="small" @click="load">Try again</el-button>
		</el-alert>

		<template v-else-if="status">
			<div class="factor-grid">
				<article class="factor" :class="{ on: status.email_enabled }">
					<div class="factor-top">
						<span class="factor-icon"><el-icon><Message /></el-icon></span>
						<span class="state" :class="{ on: status.email_enabled }">{{ status.email_enabled ? "On" : "Off" }}</span>
					</div>
					<h3>Email code</h3>
					<p>
						{{
							status.email_available
								? "We email a 6-digit code each time you sign in."
								: "Add an email address in Contact before turning this on."
						}}
					</p>
					<div class="factor-action">
						<el-switch
							:model-value="status.email_enabled"
							:disabled="busy || !status.email_available"
							:loading="pending === 'email'"
							inline-prompt
							active-text="On"
							inactive-text="Off"
							aria-label="Email sign-in codes"
							@change="toggleEmail"
						/>
					</div>
				</article>

				<article class="factor" :class="{ on: status.totp_enabled }">
					<div class="factor-top">
						<span class="factor-icon"><el-icon><Iphone /></el-icon></span>
						<span class="state" :class="{ on: status.totp_enabled }">{{ status.totp_enabled ? "On" : "Off" }}</span>
					</div>
					<h3>Authenticator app</h3>
					<p>Codes from Microsoft Authenticator, Google Authenticator, or any app that scans a QR code.</p>
					<div class="factor-action">
						<el-button v-if="status.totp_enabled" :disabled="busy" :loading="pending === 'totp-remove'" @click="removeTotp">
							Remove
						</el-button>
						<el-button v-else-if="!setup" type="primary" :disabled="busy" :loading="pending === 'totp-start'" @click="beginTotp">
							Set up
						</el-button>
						<span v-else class="in-progress">Setting up below</span>
					</div>
				</article>

				<article class="factor" :class="{ on: status.passkeys.length > 0 }">
					<div class="factor-top">
						<span class="factor-icon"><el-icon><Key /></el-icon></span>
						<span class="state" :class="{ on: status.passkeys.length > 0 }">
							{{ status.passkeys.length ? `${status.passkeys.length} saved` : "Off" }}
						</span>
					</div>
					<h3>Passkeys</h3>
					<p>A security key, this device's screen lock, or a password manager such as Google Password Manager.</p>
					<div class="factor-action">
						<el-button
							type="primary"
							plain
							:disabled="busy || !passkeySupported"
							@click="addingPasskey = !addingPasskey"
						>
							{{ addingPasskey ? "Cancel" : "Add passkey" }}
						</el-button>
					</div>
				</article>
			</div>

			<section v-if="setup" class="panel totp-setup" aria-labelledby="totp-title">
				<div class="panel-head">
					<h3 id="totp-title">Set up your authenticator app</h3>
					<button type="button" class="link" :disabled="busy" @click="cancelTotp">Cancel</button>
				</div>
				<ol class="steps">
					<li>
						<span class="step-no">1</span>
						<div>
							<strong>Open your app</strong>
							<p>In Microsoft Authenticator or a similar app, choose to add an account.</p>
						</div>
					</li>
					<li>
						<span class="step-no">2</span>
						<div class="scan">
							<strong>Scan this QR code</strong>
							<div class="qr-wrap">
								<img v-if="qr" :src="qr" width="196" height="196" alt="QR code for the authenticator app" />
							</div>
							<p>Can't scan? Enter this key instead:</p>
							<div class="secret">
								<code>{{ groupedSecret }}</code>
								<el-button size="small" @click="copySecret">{{ copied ? "Copied" : "Copy" }}</el-button>
							</div>
						</div>
					</li>
					<li>
						<span class="step-no">3</span>
						<div>
							<strong>Enter the 6-digit code it shows</strong>
							<form class="code-row" @submit.prevent="confirmTotp">
								<el-input
									:model-value="totpCode"
									class="otp-input"
									maxlength="6"
									inputmode="numeric"
									autocomplete="one-time-code"
									placeholder="000000"
									aria-label="Authenticator code"
									@update:model-value="totpCode = String($event).replace(/\D/g, '').slice(0, 6)"
								/>
								<el-button type="primary" native-type="submit" :loading="pending === 'totp-confirm'" :disabled="totpCode.length !== 6">
									Turn on
								</el-button>
							</form>
						</div>
					</li>
				</ol>
			</section>

			<section v-if="addingPasskey" class="panel" aria-labelledby="passkey-add-title">
				<div class="panel-head">
					<h3 id="passkey-add-title">Add a passkey</h3>
				</div>
				<p class="panel-lead">Give it a name you will recognise, then follow your browser's prompt.</p>
				<form class="code-row" @submit.prevent="addPasskey">
					<el-input v-model="passkeyLabel" maxlength="100" placeholder="For example: Work laptop" aria-label="Passkey name" />
					<el-button type="primary" native-type="submit" :loading="pending === 'passkey-add'">Create passkey</el-button>
				</form>
			</section>

			<p v-if="!passkeySupported" class="note">This browser does not support passkeys.</p>

			<section v-if="status.passkeys.length" class="panel" aria-labelledby="passkey-list-title">
				<div class="panel-head">
					<h3 id="passkey-list-title">Saved passkeys</h3>
				</div>
				<ul class="keys">
					<li v-for="key in status.passkeys" :key="key.id">
						<span class="key-icon"><el-icon><Key /></el-icon></span>
						<div class="key-text">
							<strong>{{ key.label }}</strong>
							<small>Added {{ formatDate(key.created_at) }}<template v-if="key.last_used_at"> · last used {{ formatDate(key.last_used_at) }}</template></small>
						</div>
						<el-button size="small" :disabled="busy" :loading="pending === `passkey-${key.id}`" @click="removePasskey(key)">
							Remove
						</el-button>
					</li>
				</ul>
			</section>
		</template>
	</section>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Iphone, Key, Lock, Message } from "@element-plus/icons-vue";
import { authService } from "@/services/authService";
import { unwrap } from "@/utils/adminHelpers";
import { createPasskey } from "@/utils/webauthn";

const status = ref(null);
const loading = ref(true);
const pending = ref("");
const errorMessage = ref("");
const setup = ref(null);
const qr = ref("");
const totpCode = ref("");
const copied = ref(false);
const addingPasskey = ref(false);
const passkeyLabel = ref("This device");
const passkeySupported = typeof window !== "undefined" && "PublicKeyCredential" in window;

const busy = computed(() => Boolean(pending.value));

const level = computed(() => {
	if (!status.value) return { tone: "low", label: "" };
	const count =
		Number(status.value.email_enabled) + Number(status.value.totp_enabled) + Number(status.value.passkeys.length > 0);
	if (count >= 2) return { tone: "high", label: "Strong protection" };
	if (count === 1) return { tone: "mid", label: "Protected" };
	return { tone: "low", label: "Password only" };
});

const groupedSecret = computed(() => (setup.value?.secret || "").replace(/(.{4})/g, "$1 ").trim());

const dateFormat = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });
const formatDate = (value) => {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? "" : dateFormat.format(date);
};

const run = async (key, action, failure) => {
	pending.value = key;
	try {
		return await action();
	} catch (error) {
		if (error?.name !== "NotAllowedError" && error !== "cancel") ElMessage.error(error?.message || failure);
		return undefined;
	} finally {
		pending.value = "";
	}
};

const confirmRemoval = (message) =>
	ElMessageBox.confirm(message, "Remove sign-in method?", {
		confirmButtonText: "Remove",
		cancelButtonText: "Keep it",
		type: "warning",
	})
		.then(() => true)
		.catch(() => false);

const load = async () => {
	loading.value = true;
	try {
		status.value = unwrap(await authService.mfaStatus());
		errorMessage.value = "";
	} catch (error) {
		errorMessage.value = error?.message || "Sign-in security could not be loaded.";
	} finally {
		loading.value = false;
	}
};

const toggleEmail = (enabled) =>
	run(
		"email",
		async () => {
			status.value = unwrap(await authService.setEmailFactor(enabled));
			ElMessage.success(enabled ? "Email codes are on." : "Email codes are off.");
		},
		"That change could not be saved.",
	);

const beginTotp = () =>
	run(
		"totp-start",
		async () => {
			const started = unwrap(await authService.startTotp());
			const QRCode = (await import("qrcode")).default;
			qr.value = await QRCode.toDataURL(started.otpauth_uri, { margin: 1, width: 196 });
			setup.value = started;
			totpCode.value = "";
			copied.value = false;
		},
		"Authenticator setup could not start.",
	);

const cancelTotp = () => {
	setup.value = null;
	qr.value = "";
	totpCode.value = "";
};

const copySecret = async () => {
	try {
		await navigator.clipboard.writeText(setup.value?.secret || "");
		copied.value = true;
	} catch {
		ElMessage.info("Select the key and copy it by hand.");
	}
};

const confirmTotp = () => {
	if (!/^\d{6}$/.test(totpCode.value)) {
		ElMessage.error("Enter the 6-digit code from the app.");
		return undefined;
	}
	return run(
		"totp-confirm",
		async () => {
			status.value = unwrap(await authService.confirmTotp(totpCode.value));
			cancelTotp();
			ElMessage.success("Authenticator app added.");
		},
		"That code was not accepted.",
	);
};

const removeTotp = async () => {
	if (!(await confirmRemoval("Sign-in will stop asking for authenticator codes."))) return;
	await run(
		"totp-remove",
		async () => {
			status.value = unwrap(await authService.removeTotp());
		},
		"The authenticator app could not be removed.",
	);
};

const addPasskey = () => {
	const label = passkeyLabel.value.trim();
	if (!label) {
		ElMessage.error("Name this passkey first.");
		return undefined;
	}
	return run(
		"passkey-add",
		async () => {
			const options = unwrap(await authService.passkeySetupOptions());
			const credential = await createPasskey(options.options);
			status.value = unwrap(await authService.savePasskey({ challenge_id: options.challenge_id, credential, label }));
			addingPasskey.value = false;
			ElMessage.success("Passkey saved.");
		},
		"The passkey was not saved.",
	);
};

const removePasskey = async (key) => {
	if (!(await confirmRemoval(`"${key.label}" will no longer sign you in.`))) return;
	await run(
		`passkey-${key.id}`,
		async () => {
			status.value = unwrap(await authService.removePasskey(key.id));
		},
		"The passkey could not be removed.",
	);
};

onMounted(load);
</script>

<style scoped lang="scss">
.security {
	padding: clamp(16px, 2.5vw, 24px);
	background: var(--cpl-surface, #fff);
	border: 1px solid var(--cpl-line);
	border-radius: var(--cpl-radius-md, 14px);
	box-shadow: var(--cpl-shadow-card);
}

.security-head {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 14px;
	margin-bottom: 18px;
}

.shield {
	width: 48px;
	height: 48px;
	display: grid;
	place-items: center;
	border-radius: 14px;
	font-size: 22px;
}

.security-intro {
	flex: 1 1 240px;
	min-width: 0;

	h2 {
		margin: 0;
		font-size: 20px;
		font-weight: 800;
		color: var(--cpl-ink-900);
	}

	p {
		margin: 2px 0 0;
		color: var(--cpl-ink-600);
		font-size: 14px;
	}
}

.level-pill {
	padding: 6px 12px;
	border-radius: 999px;
	font-size: 13px;
	font-weight: 700;
}

.level-low {
	background: var(--cpl-danger-soft);
	color: var(--cpl-danger-text);
}

.level-mid {
	background: var(--cpl-gold-100);
	color: var(--cpl-gold-text);
}

.level-high {
	background: var(--cpl-success-soft);
	color: var(--cpl-success-text);
}

.factor-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 14px;
}

.factor {
	display: flex;
	flex-direction: column;
	gap: 6px;
	min-height: 200px;
	padding: 16px;
	border: 1px solid var(--cpl-line);
	border-radius: 14px;
	background: linear-gradient(180deg, var(--cpl-surface), var(--cpl-surface-sunken));
	transition: border-color 0.2s ease, box-shadow 0.2s ease;

	&.on {
		border-color: var(--cpl-success-line);
		box-shadow: 0 0 0 3px rgba(17, 116, 63, 0.06);
	}

	h3 {
		margin: 6px 0 0;
		font-size: 16px;
		font-weight: 700;
		color: var(--cpl-ink-900);
	}

	p {
		flex: 1 1 auto;
		margin: 0;
		color: var(--cpl-ink-600);
		font-size: 13px;
		line-height: 1.45;
	}
}

.skeleton {
	background: linear-gradient(90deg, var(--cpl-skeleton) 25%, var(--cpl-skeleton-shine) 37%, var(--cpl-skeleton) 63%);
	background-size: 400% 100%;
	animation: shimmer 1.4s ease infinite;
}

.factor-top {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.factor-icon {
	width: 40px;
	height: 40px;
	display: grid;
	place-items: center;
	border-radius: 12px;
	background: var(--cpl-info-soft);
	color: var(--cpl-heading-soft);
	font-size: 18px;
}

.state {
	padding: 3px 10px;
	border-radius: 999px;
	background: var(--cpl-surface-sunken);
	color: var(--cpl-ink-600);
	font-size: 12px;
	font-weight: 700;

	&.on {
		background: var(--cpl-success-soft);
		color: var(--cpl-success-text);
	}
}

.factor-action {
	display: flex;
	align-items: center;
	min-height: 40px;
	margin-top: 6px;
}

.in-progress {
	color: var(--cpl-gold-text);
	font-size: 13px;
	font-weight: 600;
}

.panel {
	margin-top: 16px;
	padding: 16px;
	border: 1px solid var(--cpl-line);
	border-radius: 14px;
	background: var(--cpl-surface-sunken);
}

.panel-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 8px;

	h3 {
		margin: 0;
		font-size: 16px;
		font-weight: 700;
		color: var(--cpl-ink-900);
	}
}

.panel-lead,
.note {
	margin: 0 0 10px;
	color: var(--cpl-ink-600);
	font-size: 13px;
}

.note {
	margin-top: 10px;
}

.link {
	border: 0;
	background: none;
	color: var(--cpl-heading-soft);
	font-weight: 600;
	cursor: pointer;
	min-height: 32px;
}

.steps {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 14px;
	margin: 8px 0 0;
	padding: 0;
	list-style: none;

	li {
		display: flex;
		gap: 12px;
		padding: 14px;
		border-radius: 12px;
		background: var(--cpl-surface);
		border: 1px solid var(--cpl-line);
		min-width: 0;
	}

	strong {
		display: block;
		margin-bottom: 4px;
		font-size: 14px;
		color: var(--cpl-ink-900);
	}

	p {
		margin: 0 0 8px;
		color: var(--cpl-ink-600);
		font-size: 13px;
	}
}

.step-no {
	flex: 0 0 28px;
	width: 28px;
	height: 28px;
	display: grid;
	place-items: center;
	border-radius: 50%;
	background: var(--cpl-navy-900, #0b1426);
	color: var(--cpl-gold-400, #ffc94a);
	font-size: 13px;
	font-weight: 800;
}

.scan {
	min-width: 0;
}

.qr-wrap {
	width: fit-content;
	margin: 4px 0 10px;
	padding: 8px;
	border-radius: 12px;
	background: #fff;
	border: 1px solid var(--cpl-line);

	img {
		display: block;
		max-width: 100%;
		height: auto;
	}
}

.secret {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;

	code {
		padding: 6px 8px;
		border-radius: 8px;
		background: var(--cpl-info-soft);
		font-size: 13px;
		letter-spacing: 0.04em;
		overflow-wrap: anywhere;
	}
}

.code-row {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;

	.el-input {
		flex: 1 1 160px;
		max-width: 280px;
	}
}

.otp-input :deep(input) {
	font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
	font-size: 20px;
	letter-spacing: 0.35em;
	text-align: center;
}

.keys {
	margin: 0;
	padding: 0;
	list-style: none;

	li {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 0;
		border-top: 1px solid var(--cpl-line);

		&:first-child {
			border-top: 0;
		}
	}
}

.key-icon {
	width: 36px;
	height: 36px;
	display: grid;
	place-items: center;
	border-radius: 10px;
	background: var(--cpl-gold-100);
	color: var(--cpl-gold-text);
}

.key-text {
	flex: 1 1 auto;
	min-width: 0;

	strong,
	small {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	small {
		color: var(--cpl-ink-600);
		font-size: 12px;
	}
}

@keyframes shimmer {
	from {
		background-position: 100% 50%;
	}
	to {
		background-position: 0 50%;
	}
}

@media (max-width: 1199.98px) {
	.steps {
		grid-template-columns: minmax(0, 1fr);
	}
}

@media (max-width: 991.98px) {
	.factor-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

@media (max-width: 575.98px) {
	.factor-grid {
		grid-template-columns: minmax(0, 1fr);
	}

	.factor {
		min-height: 0;
	}

	.code-row .el-input {
		max-width: none;
	}

	.code-row .el-button {
		flex: 1 1 100%;
		margin-left: 0;
	}
}

@media (prefers-reduced-motion: reduce) {
	.skeleton {
		animation: none;
	}
}
</style>
