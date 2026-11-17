<template>
	<div
		v-if="request"
		ref="dialogRef"
		class="session-handoff"
		role="alertdialog"
		aria-modal="true"
		aria-labelledby="session-handoff-title"
		aria-describedby="session-handoff-desc"
		@keydown="onKeydown"
	>
		<section class="handoff-card">
			<div class="badge" aria-hidden="true"><el-icon><Monitor /></el-icon></div>
			<span class="page-eyebrow">Sign-in request</span>
			<h2 id="session-handoff-title">Log out of this device?</h2>
			<p id="session-handoff-desc" class="handoff-lead">
				Someone is signing in as <strong>{{ authStore.username }}</strong> on another device. Only one device can be
				signed in at a time.
			</p>

			<ul class="devices">
				<li class="is-new">
					<el-icon aria-hidden="true"><Iphone /></el-icon>
					<div>
						<span class="device-role">Asking to sign in</span>
						<strong>{{ request.device_label }}</strong>
						<span class="device-meta">Asked {{ askedAgo }}</span>
					</div>
				</li>
				<li>
					<el-icon aria-hidden="true"><Monitor /></el-icon>
					<div>
						<span class="device-role">This device</span>
						<strong>{{ thisDevice }}</strong>
						<span class="device-meta">Signed in now</span>
					</div>
				</li>
			</ul>

			<el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon class="mb-3" role="alert" @close="errorMessage = ''" />

			<div class="allow-timer" role="timer" :aria-label="`${timeLeft} left to allow this sign-in`">
				<span class="timer-track"><span class="timer-fill" :style="{ width: timerShare }"></span></span>
				<span>{{ timeLeft }} left to allow this sign-in</span>
			</div>

			<div class="choices">
				<button ref="keepRef" type="button" class="choice is-keep" :disabled="busy !== ''" @click="deny">
					<span class="choice-title">
						<el-icon v-if="busy === 'deny'" class="is-loading" aria-hidden="true"><Loading /></el-icon>
						<el-icon v-else aria-hidden="true"><CircleCheck /></el-icon>
						Keep me signed in
					</span>
					<span class="choice-text">Declines the request. The other device does not get in.</span>
				</button>
				<button type="button" class="choice is-leave" :disabled="busy !== ''" @click="approve">
					<span class="choice-title">
						<el-icon v-if="busy === 'approve'" class="is-loading" aria-hidden="true"><Loading /></el-icon>
						<el-icon v-else aria-hidden="true"><SwitchButton /></el-icon>
						Log out and allow it
					</span>
					<span class="choice-text">Ends your session here. {{ request.device_label }} signs in instead.</span>
				</button>
			</div>

			<p class="hint">
				Not you? Keep me signed in, then change the password. Pressing Esc keeps you signed in.
			</p>
		</section>
	</div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { notify } from "@/utils/notify";
import { CircleCheck, Iphone, Loading, Monitor, SwitchButton } from "@element-plus/icons-vue";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/store/authStore";
import { Routes } from "@/utils/constants";
import { deviceLabel } from "@/utils/deviceSession";
import { requestDeadline, secondsLeft } from "@/utils/loginRequest";
import { formatDuration } from "@/utils/passwordRules";

const authStore = useAuthStore();
const router = useRouter();
const request = ref(null);
const busy = ref("");
const errorMessage = ref("");
const dialogRef = ref(null);
const keepRef = ref(null);
const seenAt = ref(0);
const now = ref(Date.now());
const deadline = ref(0);
const windowSeconds = ref(600);
const thisDevice = deviceLabel();
let timer = 0;
let clock = 0;
let returnFocus = null;

const askedAgo = computed(() => {
	const seconds = seenAt.value ? (now.value - seenAt.value) / 1000 : 0;
	return seconds < 5 ? "just now" : `${formatDuration(seconds)} ago`;
});
const left = computed(() => secondsLeft(deadline.value, now.value));
const timeLeft = computed(() => formatDuration(left.value));
const timerShare = computed(() => {
	const total = windowSeconds.value || 1;
	return `${Math.min(100, Math.max(0, (left.value / total) * 100))}%`;
});

watch(left, (value) => {
	if (request.value && value <= 0 && !busy.value) request.value = null;
});

const look = async () => {
	if (!authStore.isAuthenticated || busy.value) return;
	try {
		const response = await authService.pendingLogin();
		const data = response?.data || null;
		if (!data) {
			request.value = null;
			return;
		}
		const same = request.value?.request_id === data.request_id;
		request.value = data;
		if (!same) {
			deadline.value = requestDeadline(Date.now(), data.expires_in);
			windowSeconds.value = Math.max(1, secondsLeft(deadline.value, Date.now()));
		}
	} catch {
		request.value = null;
	}
};

watch(
	() => request.value?.request_id,
	async (id, previous) => {
		if (id && id !== previous) {
			seenAt.value = Date.now();
			now.value = seenAt.value;
			errorMessage.value = "";
			if (!previous) returnFocus = document.activeElement;
			await nextTick();
			keepRef.value?.focus();
		}
		if (!id && previous) {
			if (returnFocus?.isConnected) returnFocus.focus();
			returnFocus = null;
		}
	},
);

const approve = async () => {
	if (!request.value) return;
	busy.value = "approve";
	errorMessage.value = "";
	try {
		await authService.approveLogin(request.value.request_id);
		request.value = null;
		authStore.dropLocal();
		notify.success("This device is logged out. The other device can sign in.");
		router.push(Routes.LOGIN);
	} catch (error) {
		errorMessage.value = error?.detail || error?.message || "The approval could not be sent. Try again.";
	} finally {
		busy.value = "";
	}
};

const deny = async () => {
	if (!request.value) return;
	busy.value = "deny";
	errorMessage.value = "";
	try {
		await authService.denyLogin(request.value.request_id);
		request.value = null;
		notify.success("The other sign-in was declined. You are still signed in here.");
	} catch (error) {
		errorMessage.value = error?.detail || error?.message || "The decline could not be sent. Try again.";
	} finally {
		busy.value = "";
	}
};

const onKeydown = (event) => {
	if (event.key === "Escape") {
		event.preventDefault();
		if (!busy.value) deny();
		return;
	}
	if (event.key !== "Tab") return;
	const focusable = [...(dialogRef.value?.querySelectorAll("button:not([disabled])") || [])];
	if (!focusable.length) return;
	const first = focusable[0];
	const last = focusable[focusable.length - 1];
	if (event.shiftKey && document.activeElement === first) {
		event.preventDefault();
		last.focus();
	} else if (!event.shiftKey && document.activeElement === last) {
		event.preventDefault();
		first.focus();
	}
};

onMounted(() => {
	look();
	timer = window.setInterval(look, 4000);
	clock = window.setInterval(() => {
		now.value = Date.now();
	}, 1000);
});
onUnmounted(() => {
	window.clearInterval(timer);
	window.clearInterval(clock);
});
</script>

<style scoped lang="scss">
.session-handoff {
	position: fixed;
	inset: 0;
	z-index: 4000;
	display: grid;
	place-items: center;
	padding: 20px;
	background: rgba(11, 20, 38, 0.6);
	backdrop-filter: blur(3px);
	animation: fade 0.2s ease both;
}

.handoff-card {
	width: min(680px, 100%);
	max-height: calc(100vh - 40px);
	overflow-y: auto;
	padding: clamp(22px, 5vw, 32px);
	border-radius: 20px;
	background: var(--cpl-surface-raised);
	color: var(--cpl-ink-900);
	box-shadow: 0 28px 70px rgba(11, 20, 38, 0.35);
	animation: pop 0.25s ease both;
}

.badge {
	width: 48px;
	height: 48px;
	margin-bottom: 14px;
	border-radius: 14px;
	display: grid;
	place-items: center;
	font-size: 22px;
	color: var(--cpl-gold-400);
	background: linear-gradient(135deg, var(--cpl-navy-900), var(--cpl-navy-700));
}

h2 {
	margin: 6px 0 8px;
	font-family: var(--cpl-font-display);
	font-size: clamp(22px, 4vw, 26px);
	font-weight: 800;
	color: var(--cpl-ink-900);
}

.handoff-lead {
	margin: 0 0 16px;
	line-height: 1.5;
	color: var(--cpl-ink-600);
	overflow-wrap: anywhere;
}

.devices {
	list-style: none;
	margin: 0 0 18px;
	padding: 0;
	display: grid;
	border: 1px solid var(--cpl-line);
	border-radius: var(--cpl-radius-md);
	overflow: hidden;

	li {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 14px;

		+ li {
			border-top: 1px solid var(--cpl-line);
		}

		> .el-icon {
			flex: none;
			font-size: 20px;
			color: var(--cpl-ink-400);
		}

		div {
			display: grid;
			min-width: 0;
		}

		strong {
			color: var(--cpl-ink-900);
			overflow-wrap: anywhere;
		}
	}

	.is-new {
		background: var(--cpl-gold-100);

		> .el-icon {
			color: var(--cpl-gold-text);
		}
	}
}

.device-role {
	font-size: 11px;
	font-weight: 700;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--cpl-ink-600);
}

.device-meta {
	font-size: 12px;
	color: var(--cpl-ink-600);
}

.allow-timer {
	display: grid;
	gap: 6px;
	margin-bottom: 14px;
	color: var(--cpl-ink-600);
	font-size: 13px;
	font-weight: 600;
	font-variant-numeric: tabular-nums;
}

.timer-track {
	display: block;
	height: 6px;
	border-radius: 999px;
	background: var(--cpl-track);
	overflow: hidden;
}

.timer-fill {
	display: block;
	height: 100%;
	border-radius: inherit;
	background: linear-gradient(90deg, #e2a01a, #ffc94a);
	transition: width 1s linear;
}

.choices {
	display: grid;
	gap: 10px;
}

.choice {
	display: grid;
	gap: 4px;
	width: 100%;
	padding: 14px 16px;
	border-radius: var(--cpl-radius-md);
	border: 1.5px solid var(--cpl-line);
	background: var(--cpl-surface);
	color: var(--cpl-ink-900);
	text-align: left;
	cursor: pointer;
	transition: border-color 0.15s ease, background 0.15s ease;

	&:disabled {
		cursor: wait;
		opacity: 0.7;
	}

	&:focus-visible {
		outline: 3px solid var(--cpl-gold-500);
		outline-offset: 2px;
	}
}

.choice-title {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 15px;
	font-weight: 700;
}

.choice-text {
	font-size: 13px;
	color: var(--cpl-ink-600);
	overflow-wrap: anywhere;
}

.is-keep {
	border-color: var(--cpl-navy-900);
	background: var(--cpl-navy-900);

	.choice-title {
		color: #fff;
	}

	.choice-text {
		color: rgba(255, 255, 255, 0.78);
	}

	&:hover:not(:disabled) {
		background: var(--cpl-navy-700);
		border-color: var(--cpl-navy-700);
	}
}

.is-leave {
	.choice-title {
		color: var(--cpl-red-500);
	}

	&:hover:not(:disabled) {
		border-color: var(--cpl-red-500);
		background: var(--cpl-danger-soft);
	}
}

html.dark .is-keep {
	border-color: var(--cpl-gold-500);
}

html.dark .is-leave .choice-title {
	color: var(--cpl-danger-text);
}

.hint {
	margin: 14px 0 0;
	font-size: 12px;
	color: var(--cpl-ink-600);
	text-align: center;
}

@keyframes fade {
	from { opacity: 0; }
}

@keyframes pop {
	from { opacity: 0; transform: translateY(10px) scale(0.98); }
}

@media (min-width: 640px) {
	.devices {
		grid-template-columns: 1fr 1fr;
	}

	.devices li + li {
		border-top: 0;
		border-left: 1px solid var(--cpl-line);
	}

	.choices {
		grid-template-columns: 1fr 1fr;
	}
}

@media (prefers-reduced-motion: reduce) {
	.session-handoff,
	.handoff-card,
	.timer-fill {
		animation: none;
		transition: none;
	}
}
</style>
