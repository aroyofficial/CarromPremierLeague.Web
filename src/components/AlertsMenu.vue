<template>
	<el-popover
		v-if="shown"
		v-model:visible="open"
		trigger="click"
		placement="bottom-end"
		:width="340"
		:show-arrow="false"
		:offset="10"
		popper-class="alerts-popper"
	>
		<template #reference>
			<button
				type="button"
				class="alerts-toggle"
				:class="{ 'is-on': Boolean(endpoint) }"
				:aria-label="endpoint ? 'Match alerts are on for this device' : 'Match alerts'"
				:title="endpoint ? 'Match alerts are on' : 'Match alerts'"
				:aria-expanded="open"
				data-alerts-toggle
			>
				<el-icon class="alerts-icon"><Bell /></el-icon>
				<span v-if="endpoint" class="alerts-dot" aria-hidden="true"></span>
			</button>
		</template>

		<div class="alerts-panel" role="dialog" aria-label="Match alerts">
			<header class="alerts-head">
				<strong>Match alerts</strong>
				<span>Saved on this device, for every season</span>
			</header>

			<section v-if="caps.push?.ready" class="alerts-block">
				<div class="alerts-row">
					<div class="alerts-row-text">
						<span class="alerts-row-title">Push notifications</span>
						<span class="alerts-row-sub">{{ pushSub }}</span>
					</div>
					<el-switch
						:model-value="Boolean(endpoint)"
						:disabled="!pushAvailable && !endpoint"
						:loading="pushBusy"
						aria-label="Push notifications on this device"
						@change="togglePush"
					/>
				</div>
				<div v-if="endpoint" class="alerts-chips" role="group" aria-label="Which alerts">
					<button
						v-for="choice in visibleChoices"
						:key="choice.key"
						type="button"
						class="alerts-chip"
						:class="{ 'is-active': preferences[choice.key] }"
						:aria-pressed="preferences[choice.key]"
						@click="toggleChoice(choice.key)"
					>
						{{ choice.label }}
					</button>
				</div>
			</section>

			<section v-if="caps.calendar_feed?.ready && seasonId" class="alerts-block">
				<div class="alerts-row">
					<div class="alerts-row-text">
						<span class="alerts-row-title">Calendar</span>
						<span class="alerts-row-sub">{{ seasonName }} fixtures, kept up to date</span>
					</div>
					<button v-if="!feed" type="button" class="alerts-action" :disabled="feedBusy" @click="subscribeCalendar">
						{{ feedBusy ? "Creating..." : "Subscribe" }}
					</button>
				</div>
				<div v-if="feed" class="alerts-links">
					<a :href="feed.webcal_url">Apple Calendar</a>
					<button type="button" @click="copyLink">{{ copied ? "Copied" : "Copy link" }}</button>
					<button type="button" class="is-danger" :disabled="feedBusy" @click="revokeLink">Revoke</button>
				</div>
				<button
					v-if="caps.google?.ready && signedIn"
					type="button"
					class="alerts-action alerts-action-wide"
					:disabled="connecting"
					@click="connectGoogle"
				>
					{{ connecting ? "Connecting..." : "Connect Google Calendar" }}
				</button>
			</section>

			<p v-if="status" class="alerts-status" role="status">{{ status }}</p>
		</div>
	</el-popover>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { Bell } from "@element-plus/icons-vue";

import { notifyService } from "@/services/notifyService";
import { apiBaseUrl } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { useSeasonStore } from "@/store/seasonStore";
import {
	alertChoices,
	forgetFeed,
	pushSupported,
	reconcileSaved,
	rememberFeed,
	savedFeed,
	serviceWorkerUrl,
	unsubscribeSettled,
	urlBase64ToUint8Array,
} from "@/utils/matchFollow";

const STORAGE_KEY = "cpl-push-subscription";

const choices = [
	{ key: "notify_live", label: "Live" },
	{ key: "notify_ended", label: "Finished" },
	{ key: "notify_score", label: "Score" },
	{ key: "notify_reminder", label: "Match day" },
	{ key: "notify_scheduled", label: "Scheduled" },
	{ key: "notify_changed", label: "Moved" },
	{ key: "notify_cancelled", label: "Cancelled" },
	// Only an admin's own device can hear this: a calendar connection of theirs needs attention.
	{ key: "notify_sync_problem", label: "Calendar issues", adminOnly: true },
];

const authStore = useAuthStore();
const seasonStore = useSeasonStore();

const open = ref(false);
const caps = ref(null);
const endpoint = ref("");
const preferences = reactive(alertChoices());
const permissionState = ref("default");
const pushBusy = ref(false);
const feedBusy = ref(false);
const connecting = ref(false);
const copied = ref(false);
const status = ref("");
const feed = ref(null);

const signedIn = computed(() => authStore.isAuthenticated);
const visibleChoices = computed(() => choices.filter((choice) => !choice.adminOnly || signedIn.value));
const shown = computed(() =>
	Boolean(caps.value && (caps.value.push?.ready || caps.value.calendar_feed?.ready || caps.value.google?.ready)),
);
const pushAvailable = computed(() => pushSupported() && permissionState.value !== "denied");
const pushSub = computed(() => {
	if (!pushSupported()) return "Not available in this browser. On iPhone, add this site to the Home Screen first.";
	if (permissionState.value === "denied" && !endpoint.value) return "Blocked in this browser's site settings.";
	return endpoint.value ? "On for this device" : "Off";
});

const seasonId = computed(() => seasonStore.selectedSeason || seasonStore.visibleSeasons?.[0]?.id || null);
const seasonName = computed(() => seasonStore.seasons.find((season) => season.id === seasonId.value)?.name || "This season");

watch(seasonId, () => {
	copied.value = false;
	feed.value = seasonId.value ? savedFeed(localStorage, seasonId.value, null) : null;
});
watch(open, (visible) => {
	if (!visible) status.value = "";
});

onMounted(loadCapabilities);

function readSaved() {
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
	} catch {
		return null;
	}
}

function remember(value) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...value, scope: "device", choices: alertChoices(preferences) }));
	endpoint.value = value.endpoint;
}

// One row per device that follows every season and team.
function preferenceBody() {
	return { season_id: null, team_id: null, ...alertChoices(preferences) };
}

async function loadCapabilities() {
	try {
		const body = await notifyService.capabilities();
		caps.value = body.data;
	} catch {
		caps.value = null;
		return;
	}
	feed.value = seasonId.value ? savedFeed(localStorage, seasonId.value, null) : null;
	permissionState.value = pushSupported() ? Notification.permission : "default";
	const saved = readSaved();
	if (saved?.choices) Object.assign(preferences, alertChoices(saved.choices));
	if (saved?.endpoint) endpoint.value = saved.endpoint;
	if (caps.value?.push?.ready && pushSupported()) await reconcileWithBrowser(saved);
}

async function reconcileWithBrowser(saved) {
	try {
		const registration = await navigator.serviceWorker.getRegistration();
		const live = (await registration?.pushManager.getSubscription())?.toJSON() || null;
		const next = reconcileSaved(saved, live);
		if (next.action === "replace") {
			// Save locally only after the server has the new row, so a failure is retried next visit.
			await notifyService.subscribe({ ...next.value, replaces_endpoint: saved.endpoint, ...preferenceBody() });
			remember(next.value);
			return;
		}
		if (next.action === "clear") {
			endpoint.value = "";
			// The Windows push service keeps accepting messages for a dropped endpoint, so the server row is turned off too.
			try {
				await notifyService.unsubscribe(saved.endpoint);
			} catch (error) {
				if (!unsubscribeSettled(error)) return;
			}
			localStorage.removeItem(STORAGE_KEY);
			return;
		}
		// A device that subscribed from the old per-season card moves to device-wide once.
		if (saved?.endpoint && saved.scope !== "device") {
			await notifyService.savePreferences({ endpoint: saved.endpoint, ...preferenceBody() });
			remember(saved);
		}
	} catch {
		// The saved state stays as it was; the switch reports any mismatch.
	}
}

async function togglePush(on) {
	if (on) await enablePush();
	else await turnOff();
}

async function enablePush() {
	if (endpoint.value) return;
	pushBusy.value = true;
	status.value = "";
	try {
		const permission = await Notification.requestPermission();
		permissionState.value = permission;
		if (permission !== "granted") {
			status.value = "Notifications stay off until this browser allows them.";
			return;
		}
		const registration = await navigator.serviceWorker.register(serviceWorkerUrl(import.meta.env.BASE_URL, apiBaseUrl));
		const subscription = await registration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: urlBase64ToUint8Array(caps.value.push.public_key),
		});
		const json = subscription.toJSON();
		const keys = { endpoint: subscription.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth };
		await notifyService.subscribe({ ...keys, ...preferenceBody() });
		remember(keys);
	} catch (error) {
		status.value = error?.response?.data?.detail || "This device could not be subscribed.";
	} finally {
		pushBusy.value = false;
	}
}

async function turnOff() {
	if (!endpoint.value) return;
	pushBusy.value = true;
	status.value = "";
	try {
		await notifyService.unsubscribe(endpoint.value);
		const registration = await navigator.serviceWorker.getRegistration();
		const current = await registration?.pushManager.getSubscription();
		await current?.unsubscribe();
		localStorage.removeItem(STORAGE_KEY);
		endpoint.value = "";
	} catch (error) {
		status.value = error?.response?.data?.detail || "Alerts could not be turned off.";
	} finally {
		pushBusy.value = false;
	}
}

let saveSequence = 0;
async function toggleChoice(key) {
	preferences[key] = !preferences[key];
	const sequence = ++saveSequence;
	status.value = "";
	try {
		await notifyService.savePreferences({ endpoint: endpoint.value, ...preferenceBody() });
		if (sequence === saveSequence) remember(readSaved() || { endpoint: endpoint.value });
	} catch (error) {
		if (sequence !== saveSequence) return;
		preferences[key] = !preferences[key];
		status.value = error?.response?.data?.detail || "That choice could not be saved.";
	}
}

async function subscribeCalendar() {
	const season = seasonId.value;
	if (!season) return;
	feedBusy.value = true;
	status.value = "";
	try {
		const body = await notifyService.createFeed({ season_id: Number(season), team_id: null });
		feed.value = body.data;
		rememberFeed(localStorage, season, null, body.data);
		status.value = "Add the link as a subscription. A downloaded copy does not update.";
	} catch (error) {
		status.value = error?.response?.data?.detail || "The calendar link could not be created.";
	} finally {
		feedBusy.value = false;
	}
}

async function revokeLink() {
	if (!feed.value?.token) return;
	feedBusy.value = true;
	try {
		await notifyService.revokeFeed(feed.value.token);
		forgetFeed(localStorage, seasonId.value, null);
		feed.value = null;
		copied.value = false;
		status.value = "That link no longer updates.";
	} catch (error) {
		status.value = error?.response?.data?.detail || "The link could not be revoked. Try again.";
	} finally {
		feedBusy.value = false;
	}
}

async function copyLink() {
	if (!feed.value?.https_url) return;
	try {
		await navigator.clipboard.writeText(feed.value.https_url);
		copied.value = true;
	} catch {
		status.value = feed.value.https_url;
	}
}

async function connectGoogle() {
	connecting.value = true;
	status.value = "";
	try {
		const body = await notifyService.connectGoogle();
		window.location.assign(body.data.authorize_url);
	} catch (error) {
		status.value = error?.response?.data?.detail || "Calendar connection is not available.";
		connecting.value = false;
	}
}
</script>

<style scoped>
.alerts-toggle {
	position: relative;
	flex: 0 0 auto;
	width: 40px;
	height: 40px;
	display: inline-grid;
	place-items: center;
	padding: 0;
	border: 1px solid rgba(255, 255, 255, 0.2);
	border-radius: 12px;
	background: transparent;
	color: var(--cpl-gold-400);
	cursor: pointer;
	transition: background 0.2s ease, border-color 0.2s ease;
}

.alerts-toggle:hover,
.alerts-toggle[aria-expanded="true"] {
	background: rgba(255, 255, 255, 0.08);
	border-color: rgba(255, 209, 102, 0.55);
}

.alerts-toggle:focus-visible {
	outline: 2px solid var(--cpl-gold-400);
	outline-offset: 2px;
}

.alerts-icon {
	font-size: 19px;
}

.alerts-dot {
	position: absolute;
	top: 8px;
	right: 9px;
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: #34d399;
	box-shadow: 0 0 0 2px var(--cpl-navy-900, #0b1426);
}

.alerts-panel {
	display: grid;
	gap: 14px;
}

.alerts-head {
	display: grid;
	gap: 2px;
}

.alerts-head strong {
	font-family: var(--cpl-font-display);
	font-size: 16px;
	color: var(--cpl-heading);
}

.alerts-head span,
.alerts-row-sub {
	font-size: 12.5px;
	color: var(--cpl-ink-600);
	line-height: 1.4;
}

.alerts-block {
	display: grid;
	gap: 10px;
	padding-top: 12px;
	border-top: 1px solid var(--cpl-line);
}

.alerts-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
}

.alerts-row-text {
	display: grid;
	gap: 2px;
	min-width: 0;
}

.alerts-row-title {
	font-size: 14px;
	font-weight: 650;
	color: var(--cpl-heading);
}

.alerts-chips {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}

.alerts-chip {
	padding: 5px 11px;
	border: 1px solid var(--cpl-line);
	border-radius: 999px;
	background: transparent;
	color: var(--cpl-ink-600);
	font-size: 12.5px;
	font-weight: 600;
	cursor: pointer;
	transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.alerts-chip.is-active {
	border-color: var(--cpl-gold-500);
	background: var(--cpl-gold-100);
	color: var(--cpl-heading);
}

.alerts-action {
	flex: 0 0 auto;
	padding: 6px 14px;
	border: 1px solid var(--cpl-gold-500);
	border-radius: 999px;
	background: var(--cpl-navy-900);
	color: var(--cpl-gold-400);
	font-size: 13px;
	font-weight: 650;
	cursor: pointer;
}

.alerts-action-wide {
	width: 100%;
	padding: 8px 14px;
	background: transparent;
	color: var(--cpl-heading);
	border-color: var(--cpl-line);
}

.alerts-action:disabled {
	opacity: 0.6;
	cursor: progress;
}

.alerts-links {
	display: flex;
	flex-wrap: wrap;
	gap: 14px;
	font-size: 13px;
}

.alerts-links a,
.alerts-links button {
	padding: 0;
	border: 0;
	background: transparent;
	color: var(--cpl-gold-text);
	font-weight: 650;
	text-decoration: none;
	cursor: pointer;
}

.alerts-links .is-danger {
	color: var(--el-color-danger);
}

.alerts-status {
	margin: 0;
	font-size: 12.5px;
	color: var(--cpl-ink-600);
	line-height: 1.4;
}
</style>

<style>
.alerts-popper.el-popover.el-popper {
	max-width: calc(100vw - 24px);
	padding: 16px;
	border-radius: var(--cpl-radius-lg, 16px);
	border-color: var(--cpl-line);
	background: var(--cpl-surface, #fff);
	box-shadow: 0 18px 40px rgba(11, 20, 38, 0.22);
}
</style>
