<template>
	<div class="panel-body challenge">
		<el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon class="mb-3" role="alert" @close="errorMessage = ''" />

		<div v-if="picking" class="block choices">
			<p class="note">Choose how you want to confirm it's you.</p>
			<el-button v-if="methods.includes('totp')" class="w-100" :disabled="locked" @click="choose('totp')">
				Authenticator app
			</el-button>
			<el-button v-if="methods.includes('email')" class="w-100" :disabled="locked" @click="choose('email')">
				Email code
			</el-button>
			<el-button v-if="methods.includes('passkey')" type="primary" class="w-100" :disabled="locked" @click="signInWithPasskey">
				Use a passkey
			</el-button>
		</div>

		<div v-else-if="method === 'totp' || method === 'email'" class="block">
			<p class="note">{{ method === "email" ? "Enter the 6-digit code from your email." : "Enter the 6-digit code from your authenticator app." }}</p>
			<CodeBoxes v-model="code" :disabled="locked" @complete="verify" />
			<p v-if="locked" class="note">Checking the code…</p>
			<button
				v-if="method === 'email'"
				type="button"
				class="text-link"
				:disabled="locked || resendWait > 0"
				@click="sendEmail"
			>
				{{ resendWait > 0 ? `Resend code in ${resendWait}s` : sent ? "Resend code" : "Email me a sign-in code" }}
			</button>
			<p v-if="method === 'email' && sent && !resendWait" class="note">Check your inbox. It can take a minute to arrive.</p>
			<button v-if="canSwitch" type="button" class="text-link" :disabled="locked" @click="backToChoices">
				Use a different method
			</button>
			<el-button v-if="methods.includes('passkey') && method !== 'passkey'" class="w-100" :disabled="locked" @click="signInWithPasskey">
				Use a passkey
			</el-button>
		</div>

		<button type="button" class="text-link" :disabled="locked" @click="emit('cancel')">Use a different account</button>
	</div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
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
const sent = ref(false);
const errorMessage = ref("");
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
	try {
		const data = unwrap(await authService.verifyMfa({ mfa_token: props.mfaToken, method: method.value, code: code.value }));
		emit("done", data);
	} catch (error) {
		errorMessage.value = error?.message || "That code was not accepted.";
		code.value = "";
	} finally {
		locked.value = false;
	}
};

const signInWithPasskey = async () => {
	if (locked.value) return;
	errorMessage.value = "";
	locked.value = true;
	try {
		const options = unwrap(await authService.mfaPasskeyOptions(props.mfaToken));
		const credential = await usePasskey(options);
		const data = unwrap(await authService.verifyMfa({ mfa_token: props.mfaToken, method: "passkey", credential }));
		emit("done", data);
	} catch (error) {
		if (error?.name !== "NotAllowedError") errorMessage.value = error?.message || "That passkey was not accepted.";
	} finally {
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

.block :deep(.el-button + .el-button) {
	margin-left: 0;
}

.note {
	margin: 0;
	color: var(--cpl-ink-600);
	font-size: 14px;
}

.text-link {
	align-self: flex-start;
	border: 0;
	background: none;
	padding: 0;
	color: var(--cpl-navy-700);
	font-weight: 600;
	cursor: pointer;
}

.text-link:disabled {
	color: var(--cpl-ink-400, #98a);
	cursor: not-allowed;
}

@container auth-panel (min-width: 560px) {
	.choices {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		align-items: stretch;
	}

	.choices .note {
		grid-column: 1 / -1;
	}
}
</style>
