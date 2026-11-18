<template>
	<section class="notify-status" aria-label="Match alerts and calendars">
		<h2>Match alerts and calendars</h2>
		<p v-if="error">{{ error }}</p>
		<ul v-else-if="rows.length">
			<li v-for="row in rows" :key="row.name">
				<strong>{{ row.name }}</strong>
				<span>{{ row.state }}</span>
				<small v-if="row.reason">{{ row.reason }}</small>
			</li>
		</ul>
		<p v-else>Checking what this server can send.</p>

		<div v-if="connections.length" class="notify-connections">
			<h3>Your calendar connections</h3>
			<ul>
				<li v-for="item in connections" :key="item.id">
					<strong>{{ providerName(item.provider) }}</strong>
					<span>{{ stateLabel(item) }}</span>
					<small v-if="item.last_synced_at">Last update {{ new Date(item.last_synced_at).toLocaleString() }}</small>
					<button
						v-if="item.state === 'reauthorization_required' && canConnect(item.provider)"
						type="button"
						class="notify-action"
						:disabled="busy"
						@click="reconnect(item.provider)"
					>
						Connect again
					</button>
					<button type="button" class="notify-action notify-action-quiet" :disabled="busy" @click="disconnect(item)">
						Disconnect
					</button>
				</li>
			</ul>
		</div>
		<p v-if="actionMessage" role="status">{{ actionMessage }}</p>
	</section>
</template>

<script setup>
import { onMounted, ref } from "vue";

import { notifyService } from "@/services/notifyService";
import { syncStateLabel } from "@/utils/matchFollow";

const rows = ref([]);
const connections = ref([]);
const capabilities = ref({});
const error = ref("");
const actionMessage = ref("");
const busy = ref(false);

const PROVIDER_NAMES = { google: "Google Calendar", microsoft: "Outlook" };
function providerName(provider) {
	return PROVIDER_NAMES[provider] || provider;
}

function stateLabel(item) {
	if (item.state === "reauthorization_required") return "Reauthorization required. Connect again to keep events updated.";
	return syncStateLabel(item.sync_state || item.state);
}

function canConnect(provider) {
	const key = provider === "google" ? "google" : "microsoft";
	return Boolean(capabilities.value[key]?.ready);
}

async function loadConnections() {
	try {
		const body = await notifyService.listConnections();
		connections.value = body.data || [];
	} catch {
		connections.value = [];
	}
}

async function reconnect(provider) {
	busy.value = true;
	actionMessage.value = "";
	try {
		const body = provider === "google" ? await notifyService.connectGoogle() : await notifyService.connectMicrosoft();
		window.location.assign(body.data.authorize_url);
	} catch (failure) {
		actionMessage.value = failure?.response?.data?.detail || "Calendar connection is not available.";
		busy.value = false;
	}
}

async function disconnect(item) {
	busy.value = true;
	actionMessage.value = "";
	try {
		const body = await notifyService.disconnectConnection(item.id);
		actionMessage.value = body.message || "Calendar disconnected.";
		await loadConnections();
	} catch (failure) {
		actionMessage.value = failure?.response?.data?.detail || "The calendar could not be disconnected.";
	} finally {
		busy.value = false;
	}
}

onMounted(async () => {
	await loadConnections();
	try {
		const body = await notifyService.capabilities();
		const data = body.data || {};
		capabilities.value = data;
		rows.value = [
			["Push alerts", data.push],
			["Calendar subscription", data.calendar_feed],
			["Google Calendar", data.google],
			["Outlook", data.microsoft],
		].map(([name, item]) => ({
			name,
			state: item?.ready ? "On" : "Off",
			reason: item?.ready ? "" : item?.reason || "",
		}));
	} catch {
		error.value = "The alert status could not be loaded.";
	}
});
</script>

<style scoped>
.notify-status {
	margin-top: 18px;
	padding: 18px;
	border: 1px solid var(--cpl-line, #e2e8f0);
	border-radius: 16px;
	background: var(--cpl-surface, #fff);
}

.notify-status h2 {
	margin: 0 0 8px;
	font-size: 1.05rem;
}

.notify-status h3 {
	margin: 14px 0 6px;
	font-size: 0.95rem;
}

.notify-status ul {
	list-style: none;
	margin: 0;
	padding: 0;
	display: grid;
	gap: 10px;
}

.notify-status li {
	display: grid;
	gap: 2px;
}

.notify-status span {
	color: var(--cpl-ink-600, #475569);
}

.notify-status small {
	color: var(--cpl-ink-400, #5b6b82);
}

.notify-action {
	justify-self: start;
	margin-top: 4px;
	border: 0;
	border-radius: 999px;
	padding: 6px 14px;
	background: var(--cpl-navy-900, #0b1426);
	color: var(--cpl-gold-400, #ffd166);
	font-weight: 650;
	cursor: pointer;
}

.notify-action-quiet {
	background: transparent;
	color: var(--cpl-heading, #0b1426);
	border: 1px solid var(--cpl-line, #e2e8f0);
}

.notify-action:disabled {
	opacity: 0.6;
	cursor: progress;
}
</style>
