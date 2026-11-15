<template>
	<div class="panel-body challenge">
		<el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon class="mb-3" role="alert" @close="errorMessage = ''" />
		<div v-if="methods.includes('passkey')" class="block">
			<el-button type="primary" class="w-100" :loading="busy" @click="signInWithPasskey">Use a passkey</el-button>
		</div>
		<div v-if="methods.includes('totp')" class="block">
			<label for="totp-code">Authenticator code</label>
			<el-input id="totp-code" v-model.trim="code" maxlength="6" inputmode="numeric" autocomplete="one-time-code" placeholder="6-digit code" />
			<el-button class="w-100" :loading="busy" @click="verify('totp')">Verify authenticator code</el-button>
		</div>
		<div v-if="methods.includes('email')" class="block">
			<el-button class="w-100" :loading="sending" @click="sendEmail">Email me a sign-in code</el-button>
			<p v-if="sent" class="note">Check your inbox, then enter the code.</p>
			<el-input v-model.trim="emailCode" maxlength="6" inputmode="numeric" autocomplete="one-time-code" placeholder="6-digit email code" />
			<el-button class="w-100" :loading="busy" @click="verify('email')">Verify email code</el-button>
		</div>
		<button type="button" class="text-link" :disabled="busy" @click="emit('cancel')">Use a different account</button>
	</div>
</template>

<script setup>
import { ref } from "vue";
import { authService } from "@/services/authService";
import { unwrap } from "@/utils/adminHelpers";
import { usePasskey } from "@/utils/webauthn";

const props = defineProps({
	mfaToken: { type: String, required: true },
	methods: { type: Array, default: () => [] },
});
const emit = defineEmits(["done", "cancel"]);

const code = ref("");
const emailCode = ref("");
const busy = ref(false);
const sending = ref(false);
const sent = ref(false);
const errorMessage = ref("");

const sendEmail = async () => {
	errorMessage.value = "";
	sending.value = true;
	try {
		await authService.mfaEmailCode(props.mfaToken);
		sent.value = true;
	} catch (error) {
		errorMessage.value = error?.message || "The code could not be sent.";
	} finally {
		sending.value = false;
	}
};

const verify = async (method) => {
	const entered = method === "email" ? emailCode.value : code.value;
	if (!/^\d{6}$/.test(entered)) {
		errorMessage.value = "Enter the 6-digit code.";
		return;
	}
	errorMessage.value = "";
	busy.value = true;
	try {
		const data = unwrap(await authService.verifyMfa({ mfa_token: props.mfaToken, method, code: entered }));
		emit("done", data);
	} catch (error) {
		errorMessage.value = error?.message || "That code was not accepted.";
	} finally {
		busy.value = false;
	}
};

const signInWithPasskey = async () => {
	errorMessage.value = "";
	busy.value = true;
	try {
		const options = unwrap(await authService.mfaPasskeyOptions(props.mfaToken));
		const credential = await usePasskey(options);
		const data = unwrap(await authService.verifyMfa({ mfa_token: props.mfaToken, method: "passkey", credential }));
		emit("done", data);
	} catch (error) {
		if (error?.name !== "NotAllowedError") errorMessage.value = error?.message || "That passkey was not accepted.";
	} finally {
		busy.value = false;
	}
};
</script>

<style scoped>
.block {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin-bottom: 16px;
}

label,
.note {
	color: var(--cpl-ink-600);
	font-size: 14px;
}

.text-link {
	border: 0;
	background: none;
	color: var(--cpl-navy-700);
	font-weight: 600;
	cursor: pointer;
}
</style>
