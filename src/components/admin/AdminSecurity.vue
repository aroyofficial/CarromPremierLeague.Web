<template>
	<section class="security" aria-labelledby="security-title">
		<h2 id="security-title">Sign-in security</h2>
		<p class="lead">After your password, sign-in can also ask for an email code, an authenticator app, or a passkey.</p>
		<p v-if="loading" class="lead">Loading…</p>
		<el-alert v-else-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" />
		<template v-else-if="status">
			<div class="factor">
				<div>
					<strong>Email code</strong>
					<p>{{ status.email_available ? "A code is emailed when you sign in." : "Add an email address above before this can be turned on." }}</p>
				</div>
				<el-switch
					:model-value="status.email_enabled"
					:disabled="busy || !status.email_available"
					aria-label="Email sign-in codes"
					@change="toggleEmail"
				/>
			</div>

			<div class="factor">
				<div>
					<strong>Authenticator app</strong>
					<p>Microsoft Authenticator, or any app that scans a QR code.</p>
				</div>
				<el-button v-if="status.totp_enabled" :disabled="busy" @click="removeTotp">Remove</el-button>
				<el-button v-else type="primary" plain :disabled="busy" @click="beginTotp">Set up</el-button>
			</div>
			<div v-if="setup" class="setup">
				<img v-if="qr" :src="qr" width="220" height="220" alt="QR code for the authenticator app" />
				<p>If you cannot scan it, type this key into the app: <code>{{ setup.secret }}</code></p>
				<div class="code-row">
					<el-input v-model.trim="totpCode" maxlength="6" inputmode="numeric" placeholder="6-digit code" />
					<el-button type="primary" :loading="busy" @click="confirmTotp">Confirm</el-button>
				</div>
			</div>

			<div class="factor">
				<div>
					<strong>Passkeys</strong>
					<p>A security key, this device, or a password manager such as Google Password Manager.</p>
				</div>
			</div>
			<ul v-if="status.passkeys.length" class="keys">
				<li v-for="key in status.passkeys" :key="key.id">
					<span>{{ key.label }}</span>
					<el-button size="small" :disabled="busy" @click="removePasskey(key.id)">Remove</el-button>
				</li>
			</ul>
			<div class="code-row">
				<el-input v-model="passkeyLabel" maxlength="100" placeholder="Name this passkey" />
				<el-button type="primary" plain :disabled="busy" @click="addPasskey">Add passkey</el-button>
			</div>
		</template>
	</section>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { authService } from "@/services/authService";
import { unwrap } from "@/utils/adminHelpers";
import { createPasskey } from "@/utils/webauthn";

const status = ref(null);
const loading = ref(true);
const busy = ref(false);
const errorMessage = ref("");
const setup = ref(null);
const qr = ref("");
const totpCode = ref("");
const passkeyLabel = ref("This device");

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

const toggleEmail = async (enabled) => {
	busy.value = true;
	try {
		status.value = unwrap(await authService.setEmailFactor(enabled));
	} catch (error) {
		ElMessage.error(error?.message || "That change could not be saved.");
		await load();
	} finally {
		busy.value = false;
	}
};

const beginTotp = async () => {
	busy.value = true;
	try {
		setup.value = unwrap(await authService.startTotp());
		const QRCode = (await import("qrcode")).default;
		qr.value = await QRCode.toDataURL(setup.value.otpauth_uri, { margin: 1, width: 220 });
		totpCode.value = "";
	} catch (error) {
		ElMessage.error(error?.message || "Authenticator setup could not start.");
	} finally {
		busy.value = false;
	}
};

const confirmTotp = async () => {
	if (!/^\d{6}$/.test(totpCode.value)) {
		ElMessage.error("Enter the 6-digit code from the app.");
		return;
	}
	busy.value = true;
	try {
		status.value = unwrap(await authService.confirmTotp(totpCode.value));
		setup.value = null;
		qr.value = "";
		totpCode.value = "";
		ElMessage.success("Authenticator app added.");
	} catch (error) {
		ElMessage.error(error?.message || "That code was not accepted.");
	} finally {
		busy.value = false;
	}
};

const removeTotp = async () => {
	busy.value = true;
	try {
		status.value = unwrap(await authService.removeTotp());
	} catch (error) {
		ElMessage.error(error?.message || "The authenticator app could not be removed.");
	} finally {
		busy.value = false;
	}
};

const addPasskey = async () => {
	const label = passkeyLabel.value.trim();
	if (!label) {
		ElMessage.error("Name this passkey first.");
		return;
	}
	busy.value = true;
	try {
		const options = unwrap(await authService.passkeySetupOptions());
		const credential = await createPasskey(options.options);
		status.value = unwrap(await authService.savePasskey({ challenge_id: options.challenge_id, credential, label }));
		ElMessage.success("Passkey saved.");
	} catch (error) {
		if (error?.name !== "NotAllowedError") ElMessage.error(error?.message || "The passkey was not saved.");
	} finally {
		busy.value = false;
	}
};

const removePasskey = async (id) => {
	busy.value = true;
	try {
		status.value = unwrap(await authService.removePasskey(id));
	} catch (error) {
		ElMessage.error(error?.message || "The passkey could not be removed.");
	} finally {
		busy.value = false;
	}
};

onMounted(load);
</script>

<style scoped>
.security {
	margin-top: 8px;
	padding-top: 8px;
	border-top: 1px solid var(--cpl-line, #e7e1d4);
}

h2 {
	margin: 12px 0 4px;
	font-size: 20px;
}

.lead,
.factor p {
	margin: 0;
	color: var(--cpl-ink-600);
	font-size: 14px;
	line-height: 1.45;
}

.factor,
.keys li,
.code-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin-top: 14px;
}

.keys {
	list-style: none;
	margin: 0;
	padding: 0;
}

.setup {
	margin-top: 12px;
}

.setup code {
	font-size: 13px;
	overflow-wrap: anywhere;
}

.code-row .el-input {
	max-width: 240px;
}
</style>
