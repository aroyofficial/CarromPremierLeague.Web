<template>
	<section class="notify-status" aria-label="Match alerts and calendars">
		<header class="notify-head">
			<h2>Match alerts and calendars</h2>
			<p>What this server can send, and the calendars connected to this account.</p>
		</header>

		<p v-if="error" class="notify-message is-error">{{ error }}</p>
		<p v-else-if="!rows.length" class="notify-message">Checking what this server can send.</p>
		<ul v-else class="status-grid">
			<li v-for="row in rows" :key="row.name" class="status-card" :class="{ 'is-on': row.state === 'On' }">
				<div class="status-top">
					<strong>{{ row.name }}</strong>
					<span class="status-pill">{{ row.state }}</span>
				</div>
				<small v-if="row.reason">{{ row.reason }}</small>
			</li>
		</ul>

		<div v-if="connections.length" class="connections">
			<h3>Your calendar connections</h3>
			<ul>
				<li v-for="item in connections" :key="item.id" :class="{ 'needs-auth': item.state === 'reauthorization_required' }">
					<div class="connection-copy">
						<strong>{{ providerName(item.provider) }}</strong>
						<span>{{ stateLabel(item) }}</span>
						<small v-if="item.last_synced_at">Last update {{ new Date(item.last_synced_at).toLocaleString() }}</small>
					</div>
					<div class="connection-actions">
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
					</div>
				</li>
			</ul>
		</div>
		<p v-if="actionMessage" class="notify-message" role="status">{{ actionMessage }}</p>
	</section>
</template>

<script setup>
import { onMounted, ref } from "vue";

import { notifyService } from "@/services/notifyService";
import { holdPageData } from "@/utils/common";
import { syncStateLabel } from "@/utils/matchFollow";

const rows = ref([]);
const connections = ref([]);
const capabilities = ref({});
const error = ref("");
const actionMessage = ref("");
const busy = ref(false);
const releasePageData = holdPageData();

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
	try {
		await loadConnections();
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
	} finally {
		releasePageData();
	}
});
</script>

<style scoped>
.notify-status {
	padding: 6px 16px 16px;
	border: 1px solid var(--cpl-line);
	border-radius: var(--cpl-radius-md);
	background: var(--cpl-surface);
	box-shadow: var(--cpl-shadow-card);
}

.notify-head {
	padding: 14px 0 12px;
}

.notify-head h2,
.connections h3 {
	margin: 0;
	font-family: var(--cpl-font-display);
	font-weight: 800;
	color: var(--cpl-ink-900);
}

.notify-head h2 {
	font-size: 18px;
}

.notify-head p,
.notify-message {
	margin: 4px 0 0;
	color: var(--cpl-ink-600);
	font-size: 14px;
	line-height: 1.45;
}

.notify-message.is-error {
	color: var(--cpl-heading);
	font-weight: 700;
}

.status-grid,
.connections ul {
	list-style: none;
	margin: 0;
	padding: 0;
}

.status-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	gap: 12px;
}

.status-card {
	display: flex;
	flex-direction: column;
	gap: 8px;
	min-width: 0;
	padding: 14px 16px;
	border: 1px solid var(--cpl-line);
	border-radius: var(--cpl-radius-md);
	background: var(--cpl-surface-muted);
}

.status-card.is-on {
	border-color: color-mix(in srgb, var(--cpl-gold-400) 55%, var(--cpl-line));
	background: linear-gradient(180deg, var(--cpl-surface) 0%, var(--cpl-gold-100) 140%);
}

.status-top {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 10px;
}

.status-top strong,
.connection-copy strong {
	font-size: 15px;
	font-weight: 700;
	color: var(--cpl-ink-900);
}

.status-pill {
	flex: 0 0 auto;
	padding: 3px 9px;
	border-radius: 999px;
	background: var(--cpl-surface);
	border: 1px solid var(--cpl-line);
	color: var(--cpl-ink-600);
	font-size: 11px;
	font-weight: 800;
	letter-spacing: 0.06em;
	text-transform: uppercase;
}

.status-card.is-on .status-pill {
	background: var(--cpl-gold-400);
	border-color: var(--cpl-gold-400);
	color: var(--cpl-navy-900);
}

.status-card small,
.connection-copy span,
.connection-copy small {
	color: var(--cpl-ink-600);
	font-size: 13px;
	line-height: 1.4;
}

.connections {
	margin-top: 16px;
	padding-top: 4px;
}

.connections h3 {
	font-size: 16px;
}

.connections li {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px 16px;
	margin-top: 10px;
	padding: 14px 14px 14px 16px;
	border: 1px solid var(--cpl-line);
	border-left: 3px solid var(--cpl-gold-400);
	border-radius: 0 12px 12px 0;
	background: var(--cpl-surface-muted);
}

.connections li.needs-auth {
	border-left-color: var(--cpl-heading);
}

.connection-copy {
	display: flex;
	flex-direction: column;
	gap: 3px;
	min-width: 0;
}

.connection-actions {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-end;
	gap: 8px;
}

.notify-action {
	border: 0;
	border-radius: 999px;
	padding: 7px 14px;
	background: var(--cpl-navy-900);
	color: var(--cpl-gold-400);
	font-weight: 700;
	cursor: pointer;
}

.notify-action-quiet {
	background: transparent;
	color: var(--cpl-heading);
	border: 1px solid var(--cpl-line);
}

.notify-action:disabled {
	opacity: 0.6;
	cursor: progress;
}

@media (max-width: 575.98px) {
	.notify-status {
		padding: 4px 12px 12px;
	}

	.connections li {
		flex-direction: column;
		align-items: stretch;
	}

	.connection-actions {
		justify-content: stretch;
	}

	.notify-action {
		width: 100%;
	}
}
</style>
