<template>
	<div class="striker" :class="[`is-${mode}`, { 'is-open': open }]">
		<transition name="striker-pop">
			<button
				v-show="!open || !isPhone"
				ref="launcher"
				type="button"
				class="striker-launcher"
				:class="{ 'is-open': open, 'is-fresh': fresh, 'is-placed': placed, 'is-dragging': dragging }"
				:style="launcherStyle"
				:aria-expanded="open"
				aria-controls="striker-panel"
				:aria-label="open ? 'Close Striker assistant' : 'Open Striker assistant'"
				@pointerdown="onPointerDown"
				@pointermove="onPointerMove"
				@pointerup="onPointerUp"
				@pointercancel="onPointerUp"
				@click="toggle"
			>
				<span class="launcher-icon">
					<el-icon v-if="open"><Close /></el-icon>
					<StrikerMark v-else />
				</span>
				<span v-if="!open" class="launcher-label">Ask Striker</span>
			</button>
		</transition>

		<transition name="striker-panel">
			<section
				v-if="open"
				id="striker-panel"
				class="striker-panel"
				:style="panelStyle"
				role="dialog"
				:aria-modal="isPhone ? 'true' : 'false'"
				aria-labelledby="striker-title"
				@keydown.esc.stop="close"
			>
				<header class="panel-head">
					<span class="head-avatar"><StrikerMark /></span>
					<div class="head-text">
						<h2 id="striker-title">Striker</h2>
						<p>
							<span class="status-dot" :class="statusClass" aria-hidden="true"></span>
							{{ subtitle }}
						</p>
					</div>
					<button
						v-if="messages.length"
						type="button"
						class="head-btn"
						title="New conversation"
						aria-label="Start a new conversation"
						@click="reset"
					>
						<el-icon><RefreshLeft /></el-icon>
					</button>
					<button type="button" class="head-btn" title="Close" aria-label="Close Striker" @click="close">
						<el-icon><Close /></el-icon>
					</button>
				</header>

				<div ref="scroller" class="panel-body" aria-live="polite" aria-relevant="additions" :aria-busy="busy">
					<div class="welcome">
						<span class="welcome-avatar"><StrikerMark /></span>
						<div class="bubble is-assistant">
							<p class="welcome-title">{{ greeting }}</p>
							<p>{{ intro }}</p>
						</div>
					</div>

					<div v-if="status && !status.available" class="notice" role="status">
						<el-icon><WarningFilled /></el-icon>
						Striker is offline right now. Please check back soon.
					</div>

					<div v-if="!messages.length" class="suggestions" aria-label="Suggested questions">
						<button
							v-for="suggestion in suggestions"
							:key="suggestion"
							type="button"
							class="chip"
							:disabled="busy || unavailable"
							@click="send(suggestion)"
						>
							{{ suggestion }}
						</button>
					</div>

					<div
						v-for="message in messages"
						:key="message.id"
						class="row"
						:class="`is-${message.role}`"
					>
						<span v-if="message.role === 'assistant'" class="row-avatar"><StrikerMark /></span>
						<div class="row-content">
							<div
								v-if="message.role === 'user'"
								class="bubble is-user"
							>{{ message.text }}</div>
							<div
								v-else
								class="bubble is-assistant"
								:class="{ 'is-error': message.error }"
							>
								<div class="md" v-html="render(message.text)"></div>
								<button
									v-if="message.error && message.retry"
									type="button"
									class="retry"
									:disabled="busy"
									@click="retry(message)"
								>
									<el-icon><RefreshRight /></el-icon> Try again
								</button>
							</div>

							<div
								v-if="message.action"
								class="action-card"
								:class="[`is-${message.action.state}`, { 'is-destructive': message.action.destructive }]"
							>
								<div class="action-head">
									<el-icon><component :is="message.action.destructive ? WarningFilled : EditPen" /></el-icon>
									<strong>{{ message.action.title }}</strong>
								</div>
								<dl v-if="message.action.details.length" class="action-details">
									<template v-for="detail in message.action.details" :key="detail.label">
										<dt>{{ detail.label }}</dt>
										<dd>{{ detail.value }}</dd>
									</template>
								</dl>
								<div v-if="message.action.state === 'pending'" class="action-buttons">
									<button
										type="button"
										class="btn-confirm"
										:class="{ 'is-danger': message.action.destructive }"
										:disabled="busy"
										@click="decide(message, true)"
									>
										<el-icon><Check /></el-icon> Confirm
									</button>
									<button type="button" class="btn-cancel" :disabled="busy" @click="decide(message, false)">
										Cancel
									</button>
								</div>
								<p v-else class="action-state">{{ actionStateLabel(message.action.state) }}</p>
							</div>

							<div v-if="message.sources?.length" class="sources" aria-label="Data sources">
								<span class="sources-label">From</span>
								<span v-for="source in message.sources" :key="source.tool" class="source">{{ source.label }}</span>
							</div>
						</div>
					</div>

					<div v-if="busy" class="row is-assistant">
						<span class="row-avatar is-thinking"><StrikerMark /></span>
						<div class="bubble is-assistant typing" role="status">
							<span class="dot"></span><span class="dot"></span><span class="dot"></span>
							<span class="visually-hidden">Striker is thinking</span>
						</div>
					</div>
				</div>

				<form class="composer" @submit.prevent="submit">
					<label class="visually-hidden" for="striker-input">Message Striker</label>
					<textarea
						id="striker-input"
						ref="input"
						v-model="draft"
						rows="1"
						:maxlength="maxLength"
						:placeholder="placeholder"
						:disabled="unavailable"
						enterkeyhint="send"
						autocomplete="off"
						@keydown.enter.exact="onEnter"
						@input="autosize"
					></textarea>
					<button
						type="submit"
						class="send"
						:disabled="!canSend"
						aria-label="Send message"
					>
						<el-icon><Promotion /></el-icon>
					</button>
				</form>
				<p class="composer-foot">
					<span v-if="draft.length > maxLength - 150">{{ maxLength - draft.length }} characters left</span>
					<span v-else>{{ footnote }}</span>
				</p>
			</section>
		</transition>
	</div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import {
	Check,
	Close,
	EditPen,
	Promotion,
	RefreshLeft,
	RefreshRight,
	WarningFilled,
} from "@element-plus/icons-vue";
import StrikerMark from "./StrikerMark.vue";
import { assistantService } from "@/services/assistantService";
import { renderMarkdown } from "@/utils/markdown";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/settingsStore";

const props = defineProps({
	mode: {
		type: String,
		default: "public",
		validator: (value) => ["public", "admin"].includes(value),
	},
});
const emit = defineEmits(["changed"]);

const authStore = useAuthStore();
const settingsStore = useSettingsStore();
const maxLength = 1000;
const historyTurns = 12;
const phoneQuery = "(max-width: 575.98px)";

const open = ref(false);
const draft = ref("");
const busy = ref(false);
const messages = ref([]);
const status = ref(null);
const isPhone = ref(false);
const fresh = ref(false);
const scroller = ref(null);
const input = ref(null);
const launcher = ref(null);
let media = null;
let nextId = 1;

const storageKey = computed(() =>
	props.mode === "admin" ? `cpl-striker-admin-${authStore.adminId ?? authStore.username ?? "me"}` : "cpl-striker-public",
);
const unavailable = computed(() => status.value?.available === false);
const canSend = computed(() => Boolean(draft.value.trim()) && !busy.value && !unavailable.value);
const statusClass = computed(() => {
	if (!status.value) return "is-pending";
	return status.value.available ? "is-online" : "is-offline";
});
const subtitle = computed(() =>
	props.mode === "admin" ? "Acts with your permissions" : "Answers from league data",
);
const greeting = computed(() => {
	if (props.mode !== "admin") return "Hi, I'm Striker!";
	return authStore.greetingName ? `Hi ${authStore.greetingName}, I'm Striker.` : "Hi, I'm Striker.";
});
const intro = computed(() =>
	props.mode === "admin"
		? "Tell me what you need, like adding a team, scheduling a match or publishing photos. I'll prepare the change and you confirm it before anything is saved."
		: "Ask me anything about the Carrom Premier League: standings, fixtures, results, teams, players and stats. I answer only from the league's own data.",
);
const placeholder = computed(() => (props.mode === "admin" ? "Ask or tell Striker what to do…" : "Ask about the league…"));
const footnote = computed(() =>
	props.mode === "admin" ? "Changes run only after you confirm." : "Striker can make mistakes. Check key details.",
);

const suggestions = computed(() => {
	if (props.mode !== "admin") {
		return [
			"Who's top of the league table?",
			"When is the next match?",
			"Top coin potters this season",
			"Show last season's champion",
		];
	}
	const list = ["What can I do here?"];
	if (authStore.can("matches.create")) list.push("Schedule a league match for the latest season");
	if (authStore.can("teams.create")) list.push("Create a team called Thunder Strikers");
	if (authStore.canAny(["gallery.update", "gallery.publish"])) list.push("Publish all draft gallery photos");
	if (authStore.can("rosters.manage")) list.push("Show the rosters for the latest season");
	if (list.length < 4) list.push("Show the current league table");
	return list.slice(0, 4);
});

const render = (text) => renderMarkdown(text);

const actionStateLabel = (state) =>
	({
		done: "Done. The change was saved.",
		failed: "This change didn't go through.",
		cancelled: "Cancelled. Nothing was changed.",
		closed: "This request was closed.",
		expired: "This request expired.",
	})[state] || "";

const save = () => {
	try {
		const stored = messages.value.slice(-40).map(({ retry, ...message }) => message);
		sessionStorage.setItem(storageKey.value, JSON.stringify(stored));
	} catch {
		// Storage can be full or blocked (private mode); the chat still works in memory.
	}
};

const load = () => {
	try {
		const stored = JSON.parse(sessionStorage.getItem(storageKey.value) || "[]");
		messages.value = Array.isArray(stored) ? stored : [];
		nextId = messages.value.reduce((max, message) => Math.max(max, Number(message.id) || 0), 0) + 1;
	} catch {
		messages.value = [];
	}
};

const scrollToEnd = async () => {
	await nextTick();
	const element = scroller.value;
	if (element) element.scrollTop = element.scrollHeight;
};

const autosize = () => {
	const element = input.value;
	if (!element) return;
	element.style.height = "auto";
	element.style.height = `${Math.min(element.scrollHeight, 132)}px`;
};

const loadStatus = async () => {
	if (status.value) return;
	try {
		const response = await assistantService.status();
		status.value = response?.data || { available: false };
	} catch {
		status.value = null;
	}
};

const lockScroll = (locked) => {
	document.documentElement.classList.toggle("striker-lock", locked && isPhone.value);
};

const focusInput = async () => {
	await nextTick();
	if (!isPhone.value) input.value?.focus({ preventScroll: true });
};

const openPanel = () => {
	open.value = true;
	fresh.value = false;
	try {
		localStorage.setItem("cpl-striker-seen", "1");
	} catch {
		// Ignore blocked storage.
	}
	loadStatus();
	scrollToEnd();
	focusInput();
};

const close = () => {
	open.value = false;
	nextTick(() => launcher.value?.focus({ preventScroll: true }));
};

const spot = ref(null);
const dragging = ref(false);
const viewport = ref({ width: 0, height: 0 });
const placed = computed(() => Boolean(spot.value));
let drag = null;
let ignoreClick = false;

const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));

const launcherStyle = computed(() => {
	if (!spot.value) return {};
	return { left: `${spot.value.x}px`, top: `${spot.value.y}px`, right: "auto", bottom: "auto" };
});

const panelStyle = computed(() => {
	if (!spot.value || isPhone.value) return {};
	const width = Math.min(420, viewport.value.width - 32);
	const height = Math.min(660, viewport.value.height - 80);
	const buttonWidth = launcher.value?.offsetWidth || 160;
	const buttonHeight = launcher.value?.offsetHeight || 56;
	const left = clamp(spot.value.x + buttonWidth - width, 8, viewport.value.width - width - 8);
	let top = spot.value.y - height - 12;
	if (top < 8) top = spot.value.y + buttonHeight + 12;
	top = clamp(top, 8, viewport.value.height - height - 8);
	return { left: `${left}px`, top: `${top}px`, right: "auto", bottom: "auto" };
});

const keepInside = () => {
	if (!spot.value || !launcher.value) return;
	const rect = launcher.value.getBoundingClientRect();
	spot.value = {
		x: clamp(spot.value.x, 8, window.innerWidth - rect.width - 8),
		y: clamp(spot.value.y, 8, window.innerHeight - rect.height - 8),
	};
};

const syncViewport = () => {
	viewport.value = { width: window.innerWidth, height: window.innerHeight };
	keepInside();
};

const onPointerDown = (event) => {
	if (event.button != null && event.button !== 0) return;
	const rect = launcher.value.getBoundingClientRect();
	drag = {
		id: event.pointerId,
		x: event.clientX,
		y: event.clientY,
		ox: event.clientX - rect.left,
		oy: event.clientY - rect.top,
		moved: false,
	};
	launcher.value.setPointerCapture?.(event.pointerId);
};

const onPointerMove = (event) => {
	if (!drag || event.pointerId !== drag.id) return;
	if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 6) return;
	drag.moved = true;
	dragging.value = true;
	const rect = launcher.value.getBoundingClientRect();
	spot.value = {
		x: clamp(event.clientX - drag.ox, 8, window.innerWidth - rect.width - 8),
		y: clamp(event.clientY - drag.oy, 8, window.innerHeight - rect.height - 8),
	};
};

const onPointerUp = (event) => {
	if (!drag || event.pointerId !== drag.id) return;
	if (drag.moved) ignoreClick = true;
	dragging.value = false;
	drag = null;
	syncViewport();
};

const toggle = () => {
	if (ignoreClick) {
		ignoreClick = false;
		return;
	}
	if (open.value) close();
	else openPanel();
};

const reset = () => {
	messages.value = [];
	save();
	focusInput();
};

const history = () =>
	messages.value
		.filter((message) => !message.error && message.text && ["user", "assistant"].includes(message.role))
		.slice(-historyTurns)
		.map((message) => ({ role: message.role, content: message.text.slice(0, 2000) }));

const pendingMessage = () =>
	[...messages.value].reverse().find((message) => message.action?.state === "pending") || null;

const push = (message) => {
	messages.value.push({ id: nextId++, ...message });
	save();
	scrollToEnd();
};

const errorText = (error) => {
	if (error?.message && typeof error.message === "string" && error.success === false) return error.message;
	if (error?.code === "ECONNABORTED") return "That took too long. Please try again.";
	return "I couldn't reach the server. Check your connection and try again.";
};

const handleReply = (data) => {
	if (data?.available === false) settingsStore.noteAssistantUnavailable();
	push({
		role: "assistant",
		text: data?.reply || "I don't have an answer for that.",
		sources: data?.sources || [],
		action: data?.action ? { ...data.action, state: "pending" } : null,
	});
	if (data?.changed) emit("changed");
};

const ask = async (text, { record = true } = {}) => {
	const turns = history();
	if (record) push({ role: "user", text });
	else turns.pop();
	const pending = props.mode === "admin" ? pendingMessage() : null;
	busy.value = true;
	scrollToEnd();
	try {
		const response =
			props.mode === "admin"
				? await assistantService.adminChat(text, turns, pending?.action?.token || null)
				: await assistantService.publicChat(text, turns);
		if (pending) pending.action.state = response?.data?.changed ? "done" : "closed";
		handleReply(response?.data);
	} catch (error) {
		push({ role: "assistant", text: errorText(error), error: true, retry: text });
	} finally {
		busy.value = false;
		focusInput();
	}
};

const send = (text) => {
	const message = String(text || "").trim().slice(0, maxLength);
	if (!message || busy.value || unavailable.value) return;
	ask(message);
};

const submit = () => {
	const text = draft.value;
	draft.value = "";
	nextTick(autosize);
	send(text);
};

const onEnter = (event) => {
	if (event.isComposing || event.keyCode === 229) return;
	event.preventDefault();
	submit();
};

const retry = (message) => {
	messages.value = messages.value.filter((item) => item.id !== message.id);
	ask(message.retry, { record: false });
};

const decide = async (message, approve) => {
	if (busy.value || message.action?.state !== "pending") return;
	if (!approve) {
		message.action.state = "cancelled";
		push({ role: "assistant", text: "Okay, I've cancelled that. Nothing was changed." });
		return;
	}
	busy.value = true;
	scrollToEnd();
	try {
		const response = await assistantService.confirm(message.action.token, true);
		const data = response?.data;
		message.action.state = data?.changed ? "done" : "failed";
		handleReply(data);
	} catch (error) {
		message.action.state = "failed";
		push({ role: "assistant", text: errorText(error), error: true });
	} finally {
		busy.value = false;
		save();
		focusInput();
	}
};

const onMedia = () => {
	isPhone.value = media?.matches ?? false;
	lockScroll(open.value);
};

watch(open, (value) => lockScroll(value));
watch(storageKey, load);

onMounted(() => {
	media = window.matchMedia(phoneQuery);
	onMedia();
	media.addEventListener?.("change", onMedia);
	syncViewport();
	window.addEventListener("resize", syncViewport);
	load();
	try {
		fresh.value = !localStorage.getItem("cpl-striker-seen");
	} catch {
		fresh.value = false;
	}
});

onUnmounted(() => {
	media?.removeEventListener?.("change", onMedia);
	window.removeEventListener("resize", syncViewport);
	document.documentElement.classList.remove("striker-lock");
});
</script>

<style lang="scss">
html.striker-lock,
html.striker-lock body {
	overflow: hidden;
	overscroll-behavior: none;
}
</style>

<style scoped lang="scss">
.striker {
	--striker-ink: var(--cpl-ink-900, #0f172a);
	--striker-muted: var(--cpl-ink-600, #475569);
	--striker-navy: var(--cpl-navy-900, #0b1426);
	--striker-navy-2: var(--cpl-navy-700, #18294d);
	--striker-gold: var(--cpl-gold-500, #f5b82e);
	--striker-gold-soft: var(--cpl-gold-100, #fff6dc);
	--striker-line: var(--cpl-line, #e2e8f0);
	--striker-accent: var(--cpl-navy-700, #18294d);
	--striker-accent-wash: rgba(24, 41, 77, 0.08);
	--striker-gap: 20px;
	font-family: inherit;
	color: var(--striker-ink);
}

html.dark .striker {
	--striker-accent: var(--cpl-heading-soft);
	--striker-accent-wash: rgba(201, 213, 238, 0.12);
}

.visually-hidden {
	position: absolute !important;
	width: 1px !important;
	height: 1px !important;
	padding: 0 !important;
	margin: -1px !important;
	overflow: hidden !important;
	clip: rect(0, 0, 0, 0) !important;
	white-space: nowrap !important;
	border: 0 !important;
}

/* Launcher */
.striker-launcher {
	position: fixed;
	right: calc(var(--striker-gap) + env(safe-area-inset-right, 0px));
	bottom: calc(var(--striker-gap) + env(safe-area-inset-bottom, 0px));
	z-index: 1200;
	display: inline-flex;
	align-items: center;
	gap: 10px;
	height: 56px;
	padding: 0 20px 0 8px;
	border: 0;
	border-radius: 999px;
	background: linear-gradient(135deg, var(--striker-navy-2), var(--striker-navy));
	color: #fff;
	font: inherit;
	font-weight: 700;
	font-size: 15px;
	letter-spacing: 0.01em;
	box-shadow: 0 12px 28px rgba(11, 20, 38, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.08) inset;
	cursor: grab;
	touch-action: none;
	user-select: none;
	-webkit-tap-highlight-color: transparent;
	transition: transform 0.2s ease, box-shadow 0.2s ease;

	&:hover {
		transform: translateY(-2px);
		box-shadow: 0 16px 34px rgba(11, 20, 38, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.12) inset;
	}

	&:focus-visible {
		outline: 3px solid var(--striker-gold);
		outline-offset: 3px;
	}

	&.is-open {
		width: 56px;
		padding: 0;
		justify-content: center;
	}

	&.is-placed:hover,
	&.is-dragging,
	&.is-dragging:hover {
		transform: none;
	}

	&.is-dragging {
		cursor: grabbing;
	}

	&.is-fresh::after {
		content: "";
		position: absolute;
		inset: -4px;
		border-radius: inherit;
		border: 2px solid var(--striker-gold);
		animation: striker-ring 2.2s ease-out infinite;
		pointer-events: none;
	}
}

.launcher-icon {
	display: grid;
	place-items: center;
	width: 40px;
	height: 40px;
	border-radius: 50%;
	background: var(--striker-gold);
	color: var(--striker-navy);
	font-size: 20px;

	.striker-mark {
		width: 30px;
		height: 30px;
	}

	.is-open & {
		background: transparent;
		color: #fff;
	}
}

/* Panel */
.striker-panel {
	position: fixed;
	right: calc(var(--striker-gap) + env(safe-area-inset-right, 0px));
	bottom: calc(var(--striker-gap) + 68px + env(safe-area-inset-bottom, 0px));
	z-index: 1250;
	display: flex;
	flex-direction: column;
	width: min(420px, calc(100vw - 2 * var(--striker-gap)));
	height: min(660px, calc(100vh - var(--app-header-height, 64px) - 120px));
	height: min(660px, calc(100dvh - var(--app-header-height, 64px) - 120px));
	min-height: 360px;
	overflow: hidden;
	background: var(--cpl-surface);
	border: 1px solid var(--striker-line);
	border-radius: 22px;
	box-shadow: 0 30px 70px rgba(11, 20, 38, 0.28), 0 6px 18px rgba(11, 20, 38, 0.12);
	transform-origin: bottom right;
}

.panel-head {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 14px 12px 14px 16px;
	padding-top: calc(14px + var(--striker-head-safe, 0px));
	background:
		radial-gradient(120% 140% at 0% 0%, rgba(245, 184, 46, 0.25), transparent 55%),
		linear-gradient(135deg, var(--striker-navy-2), var(--striker-navy));
	color: #fff;
}

.head-avatar {
	flex: 0 0 auto;
	display: grid;
	place-items: center;
	width: 42px;
	height: 42px;
	padding: 6px;
	border-radius: 50%;
	background: var(--striker-gold);
	color: var(--striker-navy);
	box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.15);
}

.head-text {
	flex: 1 1 auto;
	min-width: 0;

	h2 {
		margin: 0;
		font-family: var(--cpl-font-display, inherit);
		font-size: 18px;
		font-weight: 800;
		line-height: 1.2;
		color: #fff;
	}

	p {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: 2px 0 0;
		font-size: 12px;
		color: rgba(255, 255, 255, 0.78);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
}

.status-dot {
	flex: 0 0 auto;
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: #94a3b8;

	&.is-online {
		background: #34d399;
		box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.25);
	}

	&.is-offline {
		background: #f87171;
	}
}

.head-btn {
	flex: 0 0 auto;
	display: grid;
	place-items: center;
	width: 36px;
	height: 36px;
	border: 0;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.1);
	color: #fff;
	font-size: 18px;
	cursor: pointer;
	-webkit-tap-highlight-color: transparent;

	&:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	&:focus-visible {
		outline: 2px solid var(--striker-gold);
		outline-offset: 2px;
	}
}

.panel-body {
	flex: 1 1 auto;
	min-height: 0;
	overflow-y: auto;
	overscroll-behavior: contain;
	-webkit-overflow-scrolling: touch;
	padding: 16px 14px 8px;
	background:
		radial-gradient(circle at 100% 0%, rgba(245, 184, 46, 0.08), transparent 40%),
		var(--cpl-surface-muted, #f6f8fc);
	scrollbar-width: thin;
	scrollbar-color: rgba(15, 23, 42, 0.2) transparent;
}

.welcome,
.row {
	display: flex;
	align-items: flex-end;
	gap: 8px;
	margin-bottom: 12px;
}

.row.is-user {
	justify-content: flex-end;
}

.row-content {
	display: flex;
	flex-direction: column;
	gap: 6px;
	min-width: 0;
	max-width: 85%;

	.is-user & {
		align-items: flex-end;
	}
}

.welcome-avatar,
.row-avatar {
	flex: 0 0 auto;
	display: grid;
	place-items: center;
	width: 28px;
	height: 28px;
	padding: 4px;
	border-radius: 50%;
	background: var(--striker-navy);
	color: var(--striker-gold);
	align-self: flex-start;

	&.is-thinking .striker-mark {
		animation: striker-spin 1.4s linear infinite;
	}
}

.bubble {
	padding: 10px 14px;
	border-radius: 18px;
	font-size: 14px;
	line-height: 1.5;
	overflow-wrap: anywhere;
	word-break: break-word;

	&.is-assistant {
		background: var(--cpl-surface);
		color: var(--striker-ink);
		border: 1px solid var(--striker-line);
		border-top-left-radius: 6px;
		box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);
	}

	&.is-user {
		background: linear-gradient(135deg, var(--striker-navy-2), var(--striker-navy));
		color: #fff;
		border-bottom-right-radius: 6px;
		white-space: pre-wrap;
	}

	&.is-error {
		background: var(--cpl-danger-soft);
		border-color: var(--cpl-danger-line);
		color: var(--cpl-danger-text);
	}

	p {
		margin: 0;
	}
}

.welcome .bubble {
	max-width: 85%;
}

.welcome-title {
	font-weight: 700;
	margin-bottom: 4px !important;
}

.md {
	:deep(p) {
		margin: 0 0 8px;
	}

	:deep(p:last-child),
	:deep(ul:last-child),
	:deep(ol:last-child),
	:deep(.md-table:last-child) {
		margin-bottom: 0;
	}

	:deep(.md-heading) {
		font-weight: 700;
		margin-top: 4px;
	}

	:deep(ul),
	:deep(ol) {
		margin: 0 0 8px;
		padding-left: 20px;
	}

	:deep(li + li) {
		margin-top: 2px;
	}

	:deep(strong) {
		font-weight: 700;
	}

	:deep(a) {
		color: var(--cpl-info-text);
		text-decoration: underline;
	}

	:deep(code) {
		padding: 1px 5px;
		border-radius: 5px;
		background: var(--cpl-surface-sunken);
		font-size: 12.5px;
	}

	:deep(pre) {
		margin: 0 0 8px;
		padding: 10px;
		border-radius: 10px;
		background: #0f172a;
		color: #e2e8f0;
		overflow-x: auto;

		code {
			background: none;
			padding: 0;
			color: inherit;
		}
	}

	:deep(.md-table) {
		margin: 4px 0 8px;
		max-width: 100%;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		border: 1px solid var(--striker-line);
		border-radius: 10px;
	}

	:deep(table) {
		width: 100%;
		border-collapse: collapse;
		font-size: 12.5px;
	}

	:deep(th),
	:deep(td) {
		padding: 6px 8px;
		text-align: left;
		white-space: nowrap;
		border-bottom: 1px solid var(--striker-line);
	}

	:deep(th) {
		background: var(--striker-gold-soft);
		font-weight: 700;
	}

	:deep(tr:last-child td) {
		border-bottom: 0;
	}
}

.retry {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	margin-top: 8px;
	padding: 4px 10px;
	border: 1px solid currentColor;
	border-radius: 999px;
	background: transparent;
	color: inherit;
	font: inherit;
	font-size: 12px;
	font-weight: 600;
	cursor: pointer;
}

.suggestions {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin: 4px 0 14px 36px;
}

.chip {
	padding: 8px 12px;
	border: 1px solid var(--striker-line);
	border-radius: 999px;
	background: var(--cpl-surface);
	color: var(--striker-accent);
	font: inherit;
	font-size: 13px;
	font-weight: 600;
	text-align: left;
	cursor: pointer;
	transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
	-webkit-tap-highlight-color: transparent;

	&:hover:not(:disabled) {
		background: var(--striker-gold-soft);
		border-color: var(--striker-gold);
		transform: translateY(-1px);
	}

	&:disabled {
		opacity: 0.6;
		cursor: default;
	}

	&:focus-visible {
		outline: 2px solid var(--striker-gold);
		outline-offset: 2px;
	}
}

.notice {
	display: flex;
	align-items: center;
	gap: 8px;
	margin: 0 0 12px 36px;
	padding: 10px 12px;
	border-radius: 12px;
	background: var(--cpl-warn-soft);
	color: var(--cpl-warn-text);
	font-size: 13px;
}

.sources {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 4px;
	padding-left: 4px;
	font-size: 11px;
}

.sources-label {
	color: var(--striker-muted);
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.06em;
}

.source {
	padding: 2px 8px;
	border-radius: 999px;
	background: var(--striker-accent-wash);
	color: var(--striker-accent);
	font-weight: 600;
}

/* Confirmation card */
.action-card {
	width: 100%;
	min-width: min(260px, 100%);
	padding: 12px;
	border: 1px solid rgba(245, 184, 46, 0.6);
	border-radius: 14px;
	background: linear-gradient(180deg, var(--cpl-gold-wash), var(--cpl-surface));
	box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);

	&.is-destructive {
		border-color: var(--cpl-danger-line);
		background: linear-gradient(180deg, var(--cpl-danger-soft), var(--cpl-surface));
	}

	&.is-done {
		border-color: var(--cpl-success-line);
		background: var(--cpl-success-soft);
	}

	&.is-cancelled,
	&.is-closed,
	&.is-failed {
		opacity: 0.8;
		background: var(--cpl-surface-sunken);
		border-color: var(--striker-line);
	}
}

.action-head {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 14px;
	color: var(--striker-ink);

	.el-icon {
		color: var(--cpl-warn-text);

		.is-destructive & {
			color: var(--cpl-danger-text);
		}
	}
}

.action-details {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr);
	gap: 4px 12px;
	margin: 10px 0 0;
	font-size: 13px;

	dt {
		color: var(--striker-muted);
		font-weight: 600;
	}

	dd {
		margin: 0;
		overflow-wrap: anywhere;
	}
}

.action-buttons {
	display: flex;
	gap: 8px;
	margin-top: 12px;

	button {
		flex: 1 1 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		min-height: 40px;
		border-radius: 10px;
		font: inherit;
		font-size: 14px;
		font-weight: 700;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;

		&:disabled {
			opacity: 0.6;
			cursor: default;
		}

		&:focus-visible {
			outline: 2px solid var(--striker-gold);
			outline-offset: 2px;
		}
	}
}

.btn-confirm {
	border: 0;
	background: var(--striker-navy-2);
	color: #fff;

	&.is-danger {
		background: #dc2626;
	}
}

.btn-cancel {
	border: 1px solid var(--striker-line);
	background: var(--cpl-surface);
	color: var(--striker-ink);
}

.action-state {
	margin: 10px 0 0;
	font-size: 12.5px;
	font-weight: 600;
	color: var(--striker-muted);

	.is-done & {
		color: var(--cpl-success-text);
	}
}

/* Typing indicator */
.typing {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 12px 14px;
}

.dot {
	width: 7px;
	height: 7px;
	border-radius: 50%;
	background: var(--striker-accent);
	opacity: 0.35;
	animation: striker-bounce 1.2s ease-in-out infinite;

	&:nth-child(2) {
		animation-delay: 0.15s;
	}

	&:nth-child(3) {
		animation-delay: 0.3s;
	}
}

/* Composer */
.composer {
	display: flex;
	align-items: flex-end;
	gap: 8px;
	padding: 10px 12px 4px;
	background: var(--cpl-surface);
	border-top: 1px solid var(--striker-line);

	textarea {
		flex: 1 1 auto;
		min-width: 0;
		min-height: 44px;
		max-height: 132px;
		padding: 11px 14px;
		border: 1px solid var(--striker-line);
		border-radius: 14px;
		background: var(--cpl-surface-muted, #f6f8fc);
		color: var(--striker-ink);
		font: inherit;
		font-size: 16px;
		line-height: 1.4;
		resize: none;
		outline: none;
		-webkit-appearance: none;
		appearance: none;
		transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;

		&:focus {
			background: var(--cpl-surface);
			border-color: var(--striker-accent);
			box-shadow: 0 0 0 3px rgba(24, 41, 77, 0.12);
		}

		&:disabled {
			opacity: 0.6;
		}
	}
}

.send {
	flex: 0 0 auto;
	display: grid;
	place-items: center;
	width: 44px;
	height: 44px;
	border: 0;
	border-radius: 14px;
	background: var(--striker-gold);
	color: var(--striker-navy);
	font-size: 20px;
	cursor: pointer;
	transition: transform 0.15s ease, opacity 0.15s ease;
	-webkit-tap-highlight-color: transparent;

	&:hover:not(:disabled) {
		transform: translateY(-1px);
	}

	&:disabled {
		opacity: 0.45;
		cursor: default;
	}

	&:focus-visible {
		outline: 2px solid var(--striker-accent);
		outline-offset: 2px;
	}
}

.composer-foot {
	margin: 0;
	padding: 2px 14px 10px;
	padding-bottom: calc(10px + var(--striker-foot-safe, 0px));
	background: var(--cpl-surface);
	font-size: 11px;
	color: var(--cpl-ink-400, #94a3b8);
	text-align: center;
}

/* Tablet: a little narrower gap */
@media (max-width: 991.98px) {
	.striker {
		--striker-gap: 16px;
	}
}

/* Phone: full-screen sheet */
@media (max-width: 575.98px) {
	.striker {
		--striker-gap: 14px;
	}

	.striker-launcher {
		height: 52px;
		padding: 0 16px 0 6px;
		font-size: 14px;
	}

	.striker-panel {
		inset: 0;
		width: 100%;
		height: 100vh;
		height: 100dvh;
		min-height: 0;
		max-height: none;
		border: 0;
		border-radius: 0;
		z-index: 1300;
		--striker-head-safe: env(safe-area-inset-top, 0px);
		--striker-foot-safe: env(safe-area-inset-bottom, 0px);
	}

	.panel-head {
		padding-left: calc(16px + env(safe-area-inset-left, 0px));
		padding-right: calc(12px + env(safe-area-inset-right, 0px));
	}

	.row-content,
	.welcome .bubble {
		max-width: 88%;
	}
}

/* Very small phones: icon-only launcher */
@media (max-width: 359.98px) {
	.launcher-label {
		display: none;
	}

	.striker-launcher {
		width: 52px;
		padding: 0;
		justify-content: center;
	}
}

/* Short landscape screens */
@media (max-height: 520px) and (min-width: 576px) {
	.striker-panel {
		bottom: calc(var(--striker-gap) + env(safe-area-inset-bottom, 0px));
		right: calc(var(--striker-gap) + 72px + env(safe-area-inset-right, 0px));
		height: calc(100vh - var(--app-header-height, 64px) - 2 * var(--striker-gap));
		height: calc(100dvh - var(--app-header-height, 64px) - 2 * var(--striker-gap));
		min-height: 0;
	}
}

/* Transitions */
.striker-panel-enter-active,
.striker-panel-leave-active {
	transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.striker-panel-enter-from,
.striker-panel-leave-to {
	opacity: 0;
	transform: translateY(12px) scale(0.96);
}

.striker-pop-enter-active,
.striker-pop-leave-active {
	transition: opacity 0.18s ease, transform 0.18s ease;
}

.striker-pop-enter-from,
.striker-pop-leave-to {
	opacity: 0;
	transform: scale(0.85);
}

@keyframes striker-bounce {
	0%,
	80%,
	100% {
		transform: translateY(0);
		opacity: 0.35;
	}
	40% {
		transform: translateY(-4px);
		opacity: 1;
	}
}

@keyframes striker-ring {
	0% {
		transform: scale(1);
		opacity: 0.9;
	}
	100% {
		transform: scale(1.25);
		opacity: 0;
	}
}

@keyframes striker-spin {
	to {
		transform: rotate(360deg);
	}
}

@media (prefers-reduced-motion: reduce) {
	.striker-launcher,
	.chip,
	.send,
	.striker-panel-enter-active,
	.striker-panel-leave-active,
	.striker-pop-enter-active,
	.striker-pop-leave-active {
		transition: none;
	}

	.striker-launcher.is-fresh::after,
	.dot,
	.row-avatar.is-thinking .striker-mark {
		animation: none;
	}

	.dot {
		opacity: 0.7;
	}
}

@media print {
	.striker {
		display: none;
	}
}
</style>
