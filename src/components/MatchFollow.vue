<template>
	<section v-if="shown" class="match-follow" aria-label="Follow this season">
		<div class="match-follow-copy">
			<h2>Follow this season</h2>
			<p>
				A calendar subscription stays up to date when a match is added, moved, started, or finished.
				Saving the file once does not.
			</p>
		</div>

		<div class="match-follow-actions">
			<button v-if="caps.calendar_feed?.ready" type="button" class="follow-btn" :disabled="busy" @click="subscribeCalendar">
				Subscribe calendar
			</button>
			<button v-if="canAskForPush" type="button" class="follow-btn follow-btn-quiet" :disabled="busy" @click="enablePush">
				{{ pushLabel }}
			</button>
			<button v-if="caps.google?.ready && signedIn" type="button" class="follow-btn follow-btn-quiet" :disabled="busy" @click="connect('google')">
				{{ connecting === "google" ? "Connecting..." : "Connect Google Calendar" }}
			</button>
			<button v-if="caps.microsoft?.ready && signedIn" type="button" class="follow-btn follow-btn-quiet" :disabled="busy" @click="connect('microsoft')">
				{{ connecting === "microsoft" ? "Connecting..." : "Connect Outlook" }}
			</button>
		</div>

		<p v-if="canAskForPush && !endpoint" class="match-follow-status">
			Get a device alert when a match is scheduled, moved, goes live, finishes, or is cancelled, and on match day.
			Your browser asks for permission only after you tap the button.
		</p>
		<p v-if="pushUnsupported" class="match-follow-status" role="status">
			This browser cannot show web push alerts. On iPhone or iPad, add this site to the Home Screen first (iOS 16.4 or later), then open it from there.
		</p>
		<p v-else-if="permissionText" class="match-follow-status" role="status">
			{{ permissionText }}
		</p>

		<p v-if="status" class="match-follow-status" role="status">{{ status }}</p>

		<div v-if="feed" class="match-follow-links">
			<a :href="feed.webcal_url">Open in Apple Calendar</a>
			<a :href="feed.https_url">Open the subscription link</a>
			<button type="button" class="follow-text" @click="copyLink">{{ copied ? "Copied" : "Copy subscription link" }}</button>
			<button type="button" class="follow-text" :disabled="busy" @click="revokeLink">Revoke this link</button>
		</div>

		<form v-if="endpoint" class="match-follow-prefs" @submit.prevent="saveChoices">
			<span>Alerts on this device</span>
			<label v-for="choice in visibleChoices" :key="choice.key">
				<input v-model="preferences[choice.key]" type="checkbox" />
				{{ choice.label }}
			</label>
			<button type="submit" class="follow-text" :disabled="busy">Save alerts</button>
			<button type="button" class="follow-text" :disabled="busy" @click="turnOff">Turn off</button>
		</form>
	</section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";

import { notifyService } from "@/services/notifyService";
import { apiBaseUrl } from "@/services/api";
import { authToken } from "@/utils/authToken";
import { alertChoices, forgetFeed, permissionLabel, pushSupported, reconcileSaved, rememberFeed, savedFeed, serviceWorkerUrl, unsubscribeSettled, urlBase64ToUint8Array } from "@/utils/matchFollow";

const props = defineProps({
	seasonId: { type: [Number, String], default: null },
	teamId: { type: [Number, String], default: null },
});

const router = useRouter();
const caps = ref(null);
const feed = ref(null);
const status = ref("");
const busy = ref(false);
const copied = ref(false);
const endpoint = ref("");
const preferences = reactive(alertChoices());
const STORAGE_KEY = "cpl-push-subscription";

const choices = [
	{ key: "notify_scheduled", label: "Scheduled" },
	{ key: "notify_changed", label: "Moved or updated" },
	{ key: "notify_cancelled", label: "Cancelled" },
	{ key: "notify_live", label: "Live" },
	{ key: "notify_ended", label: "Finished" },
	{ key: "notify_score", label: "Score" },
	{ key: "notify_reminder", label: "Match-day reminder" },
	// Only an admin's own device can hear this: a calendar connection of theirs needs attention.
	{ key: "notify_sync_problem", label: "Calendar needs attention", adminOnly: true },
];

const visibleChoices = computed(() => choices.filter((choice) => !choice.adminOnly || signedIn.value));
const permissionState = ref("default");
const connecting = ref("");
const permissionText = computed(() => {
	if (!caps.value?.push?.ready || !pushSupported()) return "";
	return permissionLabel(permissionState.value, true);
});

const shown = computed(() => {
	if (!props.seasonId || !caps.value) return false;
	return Boolean(
		caps.value.calendar_feed?.ready || caps.value.push?.ready || caps.value.google?.ready || caps.value.microsoft?.ready,
	);
});

// A blocked permission cannot be asked again from the page, so the button only returns once the site settings allow it.
const canAskForPush = computed(
	() => caps.value?.push?.ready && pushSupported() && (permissionState.value !== "denied" || Boolean(endpoint.value)),
);
const signedIn = computed(() => Boolean(authToken.get()));
const pushUnsupported = ref(false);
const pushLabel = computed(() => (endpoint.value ? "Alerts are on" : "Notify this device"));

onMounted(loadCapabilities);
watch(() => [props.seasonId, props.teamId], () => {
	status.value = "";
	restoreFeed();
});

function restoreFeed() {
	feed.value = props.seasonId ? savedFeed(localStorage, props.seasonId, props.teamId) : null;
}

async function loadCapabilities() {
	try {
		const body = await notifyService.capabilities();
		caps.value = body.data;
		restoreFeed();
		const pushReady = Boolean(caps.value?.push?.ready);
		pushUnsupported.value = pushReady && !pushSupported();
		permissionState.value = pushSupported() ? Notification.permission : "default";
		const saved = readSaved();
		if (saved?.endpoint) endpoint.value = saved.endpoint;
		if (pushReady && pushSupported()) await reconcileWithBrowser(saved);
	} catch {
		caps.value = null;
	}
}

async function reconcileWithBrowser(saved) {
	try {
		const registration = await navigator.serviceWorker.getRegistration();
		const live = (await registration?.pushManager.getSubscription())?.toJSON() || null;
		const next = reconcileSaved(saved, live);
		if (next.action === "replace") {
			// Save locally only after the server has the new row. If the call fails, the old
			// endpoint stays saved, so the next visit reports the rotation again.
			await notifyService.subscribe({ ...next.value, replaces_endpoint: saved.endpoint, ...preferenceBody() });
			remember(next.value);
		}
		if (next.action === "clear") {
			endpoint.value = "";
			// The Windows push service keeps accepting messages for a dropped endpoint, so the
			// server row is turned off as well. Any other failure keeps it saved to retry next visit.
			try {
				await notifyService.unsubscribe(saved.endpoint);
			} catch (error) {
				if (!unsubscribeSettled(error)) return;
			}
			localStorage.removeItem(STORAGE_KEY);
		}
	} catch {
		// The saved state stays as it was; Save and Turn off report any mismatch.
	}
}

function readSaved() {
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
	} catch {
		return null;
	}
}

function remember(value) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
	endpoint.value = value.endpoint;
}

function preferenceBody() {
	return {
		season_id: props.seasonId ? Number(props.seasonId) : null,
		team_id: props.teamId ? Number(props.teamId) : null,
		...alertChoices(preferences),
	};
}

async function subscribeCalendar() {
	busy.value = true;
	status.value = "";
	try {
		const body = await notifyService.createFeed({
			season_id: Number(props.seasonId),
			team_id: props.teamId ? Number(props.teamId) : null,
		});
		const previous = savedFeed(localStorage, props.seasonId, props.teamId);
		if (previous?.token && previous.token !== body.data.token) {
			try {
				await notifyService.revokeFeed(previous.token);
			} catch {
				// The new link is the one in use. The old one stays revocable from this page.
			}
		}
		feed.value = body.data;
		rememberFeed(localStorage, props.seasonId, props.teamId, body.data);
		status.value = "Subscribe to the link. The calendar updates when this season changes. A downloaded copy will not.";
	} catch (error) {
		status.value = error?.response?.data?.detail || "The calendar link could not be created.";
	} finally {
		busy.value = false;
	}
}

async function revokeLink() {
	if (!feed.value?.token) return;
	busy.value = true;
	try {
		await notifyService.revokeFeed(feed.value.token);
		forgetFeed(localStorage, props.seasonId, props.teamId);
		feed.value = null;
		copied.value = false;
		status.value = "That link no longer updates. Create a new one to subscribe again.";
	} catch (error) {
		status.value = error?.response?.data?.detail || "The link could not be revoked. Try again.";
	} finally {
		busy.value = false;
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

async function enablePush() {
	if (endpoint.value) return;
	busy.value = true;
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
		const payload = {
			endpoint: subscription.endpoint,
			p256dh: json.keys.p256dh,
			auth: json.keys.auth,
			...preferenceBody(),
		};
		await notifyService.subscribe(payload);
		remember({ endpoint: subscription.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth });
		status.value = "This device will be notified about this season.";
	} catch (error) {
		status.value = error?.response?.data?.detail || "This device could not be subscribed.";
	} finally {
		busy.value = false;
	}
}

async function saveChoices() {
	if (!endpoint.value) return;
	busy.value = true;
	try {
		await notifyService.savePreferences({ endpoint: endpoint.value, ...preferenceBody() });
		status.value = "Alert choices saved on this device.";
	} catch (error) {
		status.value = error?.response?.data?.detail || "The alert choices could not be saved.";
	} finally {
		busy.value = false;
	}
}

async function turnOff() {
	if (!endpoint.value) return;
	busy.value = true;
	try {
		await notifyService.unsubscribe(endpoint.value);
		const registration = await navigator.serviceWorker.getRegistration();
		const current = await registration?.pushManager.getSubscription();
		await current?.unsubscribe();
		localStorage.removeItem(STORAGE_KEY);
		endpoint.value = "";
		status.value = "Alerts are off on this device.";
	} catch (error) {
		status.value = error?.response?.data?.detail || "Alerts could not be turned off.";
	} finally {
		busy.value = false;
	}
}

async function connect(provider) {
	if (!authToken.get()) {
		router.push({ path: "/login", query: { redirect: "/schedule" } });
		return;
	}
	busy.value = true;
	connecting.value = provider;
	status.value = "";
	try {
		const body = provider === "google" ? await notifyService.connectGoogle() : await notifyService.connectMicrosoft();
		window.location.assign(body.data.authorize_url);
	} catch (error) {
		status.value = error?.response?.data?.detail || "Calendar connection is not available.";
		busy.value = false;
		connecting.value = "";
	}
}
</script>

<style scoped>
.match-follow {
	display: grid;
	gap: 14px;
	margin: 8px 0 22px;
	padding: 18px 18px 16px;
	border: 1px solid var(--cpl-gold-border, #f3d79a);
	border-radius: var(--cpl-radius-lg, 18px);
	background: var(--cpl-paper, #fffdf8);
}

.match-follow-copy h2 {
	margin: 0 0 4px;
	font-family: var(--cpl-font-display, Outfit, sans-serif);
	font-size: 1.15rem;
	color: var(--cpl-heading, #0b1426);
}

.match-follow-copy p,
.match-follow-status {
	margin: 0;
	color: var(--cpl-ink-600, #475569);
	line-height: 1.45;
}

.match-follow-actions,
.match-follow-links,
.match-follow-prefs {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	align-items: center;
}

.follow-btn {
	border: 0;
	border-radius: 999px;
	padding: 10px 16px;
	background: var(--cpl-navy-900, #0b1426);
	color: var(--cpl-gold-400, #ffd166);
	font-weight: 650;
	cursor: pointer;
}

.follow-btn-quiet {
	background: transparent;
	color: var(--cpl-heading, #0b1426);
	border: 1px solid var(--cpl-line, #e2e8f0);
}

.follow-btn:disabled {
	opacity: 0.6;
	cursor: progress;
}

.match-follow-links a,
.follow-text {
	border: 0;
	background: transparent;
	color: var(--cpl-gold-text, #92600a);
	font-weight: 650;
	text-decoration: none;
	cursor: pointer;
	padding: 0;
}

.match-follow-prefs {
	padding-top: 4px;
}

.match-follow-prefs span {
	width: 100%;
	font-size: 0.82rem;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	color: var(--cpl-ink-400, #5b6b82);
}

.match-follow-prefs label {
	display: inline-flex;
	gap: 6px;
	align-items: center;
	color: var(--cpl-heading, #0b1426);
}
</style>
