<template>
	<details v-if="visible" class="add-to-calendar" @toggle="onToggle" @click.stop @keydown.stop>
		<summary>Add to calendar</summary>
		<ul class="add-to-calendar-list">
			<li v-if="caps?.calendar_feed?.ready">
				<a :href="downloadUrl" download class="add-to-calendar-link">Download this match file</a>
				<small>One-time file. It will not update when the match changes.</small>
			</li>
			<li v-for="item in providerRows" :key="item.provider">
				<span class="add-to-calendar-name">{{ item.name }}</span>
				<small class="add-to-calendar-state">{{ item.state }}</small>
				<button v-if="item.canConnect" type="button" class="add-to-calendar-link" :disabled="busy" @click.stop.prevent="connect(item.provider)">
					{{ item.action }}
				</button>
				<button v-if="item.calendarAction" type="button" class="add-to-calendar-link" :disabled="busy" @click.stop.prevent="toggleMatch(item)">
					{{ item.calendarAction.label }}
				</button>
			</li>
		</ul>
		<p v-if="message" class="add-to-calendar-message" role="status">{{ message }}</p>
	</details>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";

import { authToken } from "@/utils/authToken";
import { matchCalendarAction, syncStateLabel } from "@/utils/matchFollow";
import { notifyService } from "@/services/notifyService";

const props = defineProps({
	matchId: { type: [Number, String], required: true },
});

// One capability request for the whole page, shared by every match card.
let capabilityRequest = null;
function sharedCapabilities() {
	if (!capabilityRequest) {
		capabilityRequest = notifyService
			.capabilities()
			.then((body) => body.data || {})
			.catch(() => ({}));
	}
	return capabilityRequest;
}

const caps = ref(null);
const connections = ref([]);
const matchStates = ref([]);
const busy = ref(false);
const message = ref("");
const connectionsLoaded = ref(false);
let connectionsRequested = false;

const signedIn = computed(() => Boolean(authToken.get()));
const visible = computed(() => {
	if (!caps.value) return false;
	return Boolean(caps.value.calendar_feed?.ready || (signedIn.value && (caps.value.google?.ready || caps.value.microsoft?.ready)));
});

onMounted(async () => {
	caps.value = await sharedCapabilities();
});
const downloadUrl = computed(() => notifyService.matchDownloadUrl(props.matchId));

const PROVIDERS = [
	{ provider: "google", name: "Google Calendar", capability: "google", label: "Connect and keep updated" },
	{ provider: "microsoft", name: "Outlook", capability: "microsoft", label: "Connect and keep updated" },
];

const providerRows = computed(() =>
	PROVIDERS.filter((item) => signedIn.value && caps.value?.[item.capability]?.ready).map((item) => {
		if (!connectionsLoaded.value) return { ...item, state: "Checking", canConnect: false };
		const saved = connections.value.find((row) => row.provider === item.provider);
		if (saved?.state === "connected") {
			const current = matchStates.value.find((row) => row.id === saved.id);
			const calendarAction = matchCalendarAction(current);
			const state = current?.removed ? "Removed from this match" : syncStateLabel(saved.sync_state);
			return { ...item, state, canConnect: false, calendarAction: calendarAction ? { ...calendarAction, connectionId: saved.id } : null };
		}
		if (saved?.state === "reauthorization_required") {
			return { ...item, state: "Reauthorization required", action: "Connect again", canConnect: true };
		}
		return { ...item, state: "Not connected", action: item.label, canConnect: true };
	}),
);

async function loadMatchStates() {
	try {
		const body = await notifyService.matchConnectionStates(props.matchId);
		matchStates.value = body.data || [];
	} catch {
		matchStates.value = [];
	}
}

async function onToggle(event) {
	if (!event.target.open || !signedIn.value) return;
	if (!connectionsRequested) {
		connectionsRequested = true;
		try {
			const body = await notifyService.listConnections();
			connections.value = body.data || [];
		} catch {
			connections.value = [];
		}
		connectionsLoaded.value = true;
	}
	await loadMatchStates();
}

async function toggleMatch(item) {
	const action = item.calendarAction;
	if (!action) return;
	busy.value = true;
	message.value = "";
	try {
		if (action.action === "withdraw") {
			await notifyService.withdrawMatch(action.connectionId, props.matchId);
			message.value = `Removed this match from ${item.name}. The change reaches your calendar shortly.`;
		} else {
			await notifyService.restoreMatch(action.connectionId, props.matchId);
			message.value = `Added this match back to ${item.name}. The change reaches your calendar shortly.`;
		}
		await loadMatchStates();
	} catch (error) {
		message.value = error?.response?.data?.detail || "The calendar could not be updated. Try again.";
	} finally {
		busy.value = false;
	}
}

async function connect(provider) {
	busy.value = true;
	message.value = "";
	try {
		const body = provider === "google" ? await notifyService.connectGoogle() : await notifyService.connectMicrosoft();
		window.location.assign(body.data.authorize_url);
	} catch (error) {
		message.value = error?.response?.data?.detail || "Calendar connection is not available.";
		busy.value = false;
	}
}
</script>

<style scoped>
.add-to-calendar {
	position: relative;
	font-size: 0.9rem;
}

.add-to-calendar summary {
	cursor: pointer;
	font-weight: 650;
	color: var(--cpl-gold-text, #92600a);
	list-style: none;
}

.add-to-calendar-list {
	display: grid;
	gap: 8px;
	margin: 8px 0 0;
	padding: 10px 12px;
	list-style: none;
	border: 1px solid var(--cpl-line, #e2e8f0);
	border-radius: 12px;
	background: var(--cpl-surface, #fff);
}

.add-to-calendar-list li {
	display: grid;
	gap: 2px;
}

.add-to-calendar-link {
	justify-self: start;
	border: 0;
	padding: 0;
	background: transparent;
	color: var(--cpl-gold-text, #92600a);
	font-weight: 650;
	text-decoration: none;
	cursor: pointer;
}

.add-to-calendar-list small,
.add-to-calendar-message {
	color: var(--cpl-ink-600, #475569);
}

.add-to-calendar-message {
	margin: 6px 0 0;
}
</style>
