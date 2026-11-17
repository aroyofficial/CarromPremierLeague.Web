<template>
	<section class="notify-host" aria-label="Notifications">
		<!-- Screen readers announce changes only in live regions that already exist, so these two stay mounted. -->
		<div class="visually-hidden" role="status" aria-live="polite" aria-atomic="true">{{ politeText }}</div>
		<div class="visually-hidden" role="alert" aria-live="assertive" aria-atomic="true">{{ assertiveText }}</div>
		<TransitionGroup name="notify" tag="div" class="notify-stack">
			<div
				v-for="item in notifyState.items"
				:key="item.id"
				:ref="(el) => setItemRef(item.id, el)"
				class="notify-item"
				:class="`is-${item.type}`"
				:aria-busy="item.type === 'loading' ? 'true' : undefined"
				@mouseenter="pause(item.id)"
				@mouseleave="resumeUnlessFocused(item.id, $event)"
				@focusin="pause(item.id)"
				@focusout="onFocusOut(item.id, $event)"
			>
				<span class="notify-icon" aria-hidden="true">
					<el-icon v-if="item.type === 'loading'" class="is-loading"><Loading /></el-icon>
					<el-icon v-else-if="item.type === 'success'"><SuccessFilled /></el-icon>
					<el-icon v-else-if="item.type === 'info'"><InfoFilled /></el-icon>
					<el-icon v-else-if="item.type === 'warning'"><WarningFilled /></el-icon>
					<el-icon v-else><CircleCloseFilled /></el-icon>
				</span>
				<div class="notify-body">
					<p v-if="item.title" class="notify-title">{{ item.title }}</p>
					<p class="notify-message">
						{{ item.message }}
						<span v-if="item.count > 1" class="notify-count" :aria-label="`repeated ${item.count} times`">×{{ item.count }}</span>
					</p>
				</div>
				<button
					v-if="item.type !== 'loading' || item.critical"
					type="button"
					class="notify-close"
					aria-label="Dismiss notification"
					@click="dismiss(item.id)"
				>
					<el-icon aria-hidden="true"><Close /></el-icon>
				</button>
			</div>
		</TransitionGroup>
	</section>
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import { Close, CircleCloseFilled, InfoFilled, Loading, SuccessFilled, WarningFilled } from "@element-plus/icons-vue";
import { dismiss, notifyState } from "@/utils/notify";
import { liveRole } from "@/utils/notifyRules";

const politeText = ref("");
const assertiveText = ref("");
const announced = new Map();

// Each new message, repeat, or loading update is written into the matching region. The region is
// emptied first so the same text twice is still read out.
const announce = async (item) => {
	const target = liveRole(item.type) === "alert" ? assertiveText : politeText;
	target.value = "";
	await nextTick();
	target.value = [item.title, item.message].filter(Boolean).join(". ");
};

watch(
	() => notifyState.items.map((item) => `${item.id}:${item.serial}`),
	() => {
		const live = new Set();
		for (const item of notifyState.items) {
			live.add(item.id);
			if (announced.get(item.id) !== item.serial) {
				announced.set(item.id, item.serial);
				announce(item);
			}
		}
		for (const id of [...announced.keys()]) if (!live.has(id)) announced.delete(id);
	},
	{ immediate: true },
);

// Timers live here so hover and focus can pause them. Each entry tracks the time left.
const timers = new Map();
const elements = new Map();

const setItemRef = (id, el) => {
	if (el) elements.set(id, el);
	else elements.delete(id);
};

const clearTimer = (id) => {
	const entry = timers.get(id);
	if (entry?.handle) clearTimeout(entry.handle);
};

const arm = (id, duration, serial) => {
	const entry = timers.get(id) || { remaining: duration, serial, handle: null, paused: false };
	if (entry.serial !== serial) {
		clearTimer(id);
		entry.remaining = duration;
		entry.serial = serial;
		entry.handle = null;
	}
	timers.set(id, entry);
	if (duration <= 0 || entry.handle || entry.paused) return;
	entry.started = Date.now();
	entry.handle = setTimeout(() => dismiss(id), Math.max(0, entry.remaining));
};

const pause = (id) => {
	const entry = timers.get(id);
	if (!entry?.handle) return;
	clearTimeout(entry.handle);
	entry.remaining -= Date.now() - entry.started;
	entry.handle = null;
	entry.paused = true;
};

const resume = (id) => {
	const entry = timers.get(id);
	if (!entry || !entry.paused) return;
	entry.paused = false;
	if (entry.remaining <= 0) {
		dismiss(id);
		return;
	}
	entry.started = Date.now();
	entry.handle = setTimeout(() => dismiss(id), entry.remaining);
};

const resumeUnlessFocused = (id, event) => {
	const el = elements.get(id);
	if (el && el.contains(document.activeElement)) return;
	resume(id);
};

const onFocusOut = (id, event) => {
	const el = elements.get(id);
	if (el && event.relatedTarget && el.contains(event.relatedTarget)) return;
	resume(id);
};

watch(
	() => notifyState.items.map((item) => ({ id: item.id, duration: item.duration, serial: item.serial })),
	(list) => {
		const live = new Set(list.map((item) => item.id));
		for (const id of [...timers.keys()]) {
			if (!live.has(id)) {
				clearTimer(id);
				timers.delete(id);
				elements.delete(id);
			}
		}
		for (const item of list) arm(item.id, item.duration, item.serial);
	},
	{ deep: true, immediate: true },
);

onBeforeUnmount(() => {
	for (const id of timers.keys()) clearTimer(id);
	timers.clear();
});
</script>

<style scoped>
.notify-host {
	position: fixed;
	z-index: 4000;
	top: calc(var(--app-header-height, 64px) + 12px);
	right: 16px;
	width: min(400px, calc(100vw - 32px));
	pointer-events: none;
}

.visually-hidden {
	position: absolute;
	width: 1px;
	height: 1px;
	margin: -1px;
	padding: 0;
	overflow: hidden;
	clip: rect(0 0 0 0);
	white-space: nowrap;
	border: 0;
}

.notify-stack {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.notify-item {
	pointer-events: auto;
	display: flex;
	align-items: flex-start;
	gap: 10px;
	padding: 12px 12px 12px 14px;
	border-radius: 12px;
	border: 1px solid var(--cpl-line, #d5dbe7);
	border-left-width: 4px;
	background: var(--cpl-surface, #fff);
	color: var(--cpl-ink-900, #0b1426);
	box-shadow: 0 12px 28px rgba(11, 20, 38, 0.18);
}

.notify-item.is-success {
	border-left-color: #3d8a2b;
}
.notify-item.is-info {
	border-left-color: #2f5fbf;
}
.notify-item.is-warning {
	border-left-color: #b7791f;
}
.notify-item.is-error {
	border-left-color: #c53030;
}
.notify-item.is-loading {
	border-left-color: var(--cpl-gold-500, #f5b82e);
}

.notify-icon {
	flex: none;
	display: grid;
	place-items: center;
	width: 22px;
	height: 22px;
	font-size: 20px;
}
.is-success .notify-icon {
	color: #3d8a2b;
}
.is-info .notify-icon {
	color: #2f5fbf;
}
.is-warning .notify-icon {
	color: #b7791f;
}
.is-error .notify-icon {
	color: #c53030;
}

.notify-body {
	flex: 1 1 auto;
	min-width: 0;
}

.notify-title {
	margin: 0 0 2px;
	font-weight: 700;
}

.notify-message {
	margin: 0;
	font-size: 14px;
	line-height: 1.4;
	overflow-wrap: anywhere;
}

.notify-count {
	margin-left: 6px;
	padding: 0 6px;
	border-radius: 999px;
	background: var(--cpl-surface-muted, #eef2f9);
	font-size: 12px;
	font-weight: 700;
}

.notify-close {
	flex: none;
	display: grid;
	place-items: center;
	width: 44px;
	height: 44px;
	margin: -10px -10px -10px 0;
	border: 0;
	border-radius: 8px;
	background: none;
	color: var(--cpl-ink-600, #4a5873);
	cursor: pointer;
}

.notify-close:hover {
	background: var(--cpl-surface-muted, #eef2f9);
}

.notify-close:focus-visible {
	outline: 2px solid var(--cpl-gold-500, #f5b82e);
	outline-offset: 2px;
}

.notify-enter-active,
.notify-leave-active {
	transition: opacity 0.18s ease, transform 0.18s ease;
}
.notify-enter-from,
.notify-leave-to {
	opacity: 0;
	transform: translateX(16px);
}

/* Small screens: full width, pinned to the top edge. */
@media (max-width: 600px) {
	.notify-host {
		top: 8px;
		right: 8px;
		left: 8px;
		width: auto;
	}
}

@media (prefers-reduced-motion: reduce) {
	.notify-enter-active,
	.notify-leave-active {
		transition: none;
	}
}
</style>
