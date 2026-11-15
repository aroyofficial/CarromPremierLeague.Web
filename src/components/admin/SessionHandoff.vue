<template>
	<div v-if="request" class="session-handoff" role="dialog" aria-modal="true" aria-labelledby="session-handoff-title">
		<section class="handoff-card">
			<span class="page-eyebrow">Another sign-in</span>
			<h2 id="session-handoff-title">Log out of this device?</h2>
			<p>
				<strong>{{ request.device_label }}</strong> is asking to sign in as
				<strong>{{ authStore.username }}</strong>. This device stays signed in until you approve.
			</p>
			<div class="handoff-actions">
				<el-button type="danger" size="large" :loading="busy" @click="approve">Log out and allow it</el-button>
				<el-button size="large" :disabled="busy" @click="deny">Keep me signed in</el-button>
			</div>
		</section>
	</div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/store/authStore";
import { Routes } from "@/utils/constants";

const authStore = useAuthStore();
const router = useRouter();
const request = ref(null);
const busy = ref(false);
let timer = 0;

const look = async () => {
	if (!authStore.isAuthenticated || busy.value) return;
	try {
		const response = await authService.pendingLogin();
		request.value = response?.data || null;
	} catch {
		request.value = null;
	}
};

const approve = async () => {
	if (!request.value) return;
	busy.value = true;
	try {
		await authService.approveLogin(request.value.request_id);
		request.value = null;
		authStore.dropLocal();
		ElMessage.success("This device is logged out. The other device can sign in.");
		router.push(Routes.LOGIN);
	} catch (error) {
		ElMessage.error(error?.detail || error?.message || "The approval could not be sent.");
	} finally {
		busy.value = false;
	}
};

const deny = async () => {
	if (!request.value) return;
	busy.value = true;
	try {
		await authService.denyLogin(request.value.request_id);
		request.value = null;
		ElMessage.success("The other sign-in was declined.");
	} catch (error) {
		ElMessage.error(error?.detail || error?.message || "The decline could not be sent.");
	} finally {
		busy.value = false;
	}
};

onMounted(() => {
	look();
	timer = window.setInterval(look, 4000);
});
onUnmounted(() => window.clearInterval(timer));
</script>

<style scoped lang="scss">
.session-handoff {
	position: fixed;
	inset: 0;
	z-index: 4000;
	display: grid;
	place-items: center;
	padding: 24px;
	background: rgba(15, 23, 42, 0.55);
}

.handoff-card {
	width: min(440px, 100%);
	padding: 28px 24px;
	border-radius: 18px;
	background: #fff;
	box-shadow: 0 24px 60px rgba(15, 23, 42, 0.25);
}

.handoff-card h2 {
	margin: 8px 0 12px;
}

.handoff-card p {
	margin: 0 0 20px;
	line-height: 1.5;
}

.handoff-actions {
	display: grid;
	gap: 10px;
}
</style>
