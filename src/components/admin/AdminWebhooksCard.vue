<template>
	<section class="admin-card integration-card" aria-label="Webhooks">
		<header class="integration-head">
			<div class="integration-title">
				<h2>Webhooks</h2>
				<p>Send HMAC-signed HTTP POST callbacks when matches, schedules, rosters, or competition rules change.</p>
			</div>
			<el-button v-if="canManage" type="primary" @click="openCreate">
				<el-icon class="me-1"><Plus /></el-icon>Create webhook
			</el-button>
		</header>

		<div v-if="!canManage" class="locked-banner" role="note">
			<el-icon class="locked-icon"><Lock /></el-icon>
			<div>
				<strong>Manage webhooks permission required</strong>
				<p>
					You need the <strong>Manage webhooks</strong> permission to view or create webhooks.
					<template v-if="canManagePermissions">
						Grant it from <router-link :to="permissionsPath">Permissions</router-link>.
					</template>
				</p>
			</div>
		</div>

		<template v-else>
			<p v-if="loadError" class="integration-msg is-error">{{ loadError }}</p>
			<p v-else-if="loading && !webhooks.length" class="integration-msg">Loading webhooks...</p>
			<div v-else-if="!webhooks.length" class="empty-state">
				<p>No webhooks configured yet. Create a webhook to push live match and league updates to an HTTPS endpoint.</p>
			</div>

			<ul v-else class="item-list">
				<li v-for="hook in webhooks" :key="hook.id" class="item-row" :class="{ 'is-inactive': !hook.is_active }">
					<div class="item-main">
						<div class="item-top">
							<strong>{{ hook.name }}</strong>
							<span class="state-pill" :class="{ 'is-on': hook.is_active }">
								{{ hook.is_active ? "Active" : "Paused" }}
							</span>
							<span v-if="hook.last_status_code" class="http-pill" :class="{ 'is-ok': hook.last_status_code >= 200 && hook.last_status_code < 300 }">
								HTTP {{ hook.last_status_code }}
							</span>
							<span v-if="hook.failure_count > 0" class="fail-pill">
								{{ hook.failure_count }} failed
							</span>
						</div>
						<code class="item-mono">{{ hook.url }}</code>
						<p v-if="hook.description" class="item-desc">{{ hook.description }}</p>
						<div class="item-meta">
							<span>Secret: <code>{{ hook.secret_hint }}</code></span>
							<span>{{ hook.events.length }} event{{ hook.events.length === 1 ? "" : "s" }}</span>
							<span v-if="hook.last_delivered_at">Last delivered {{ formatTime(hook.last_delivered_at) }}</span>
							<span v-if="hook.last_error" class="meta-err">{{ hook.last_error }}</span>
						</div>
					</div>
					<div class="item-actions">
						<el-switch
							:model-value="hook.is_active"
							size="small"
							:disabled="busyId === hook.id"
							:aria-label="`Toggle ${hook.name}`"
							@change="(val) => toggleActive(hook, val)"
						/>
						<el-button size="small" :loading="testingId === hook.id" @click="sendTest(hook)">
							Send test
						</el-button>
						<el-button size="small" @click="openDeliveries(hook)">
							Deliveries
						</el-button>
						<el-button size="small" @click="openEdit(hook)">
							Edit
						</el-button>
						<el-button size="small" :loading="busyId === hook.id" @click="rotateSecret(hook)">
							Rotate secret
						</el-button>
						<el-button size="small" type="danger" plain :loading="busyId === hook.id" @click="removeWebhook(hook)">
							Delete
						</el-button>
					</div>
				</li>
			</ul>
		</template>

		<el-dialog
			v-model="dialogOpen"
			:title="editingId ? 'Edit webhook' : 'Create webhook'"
			width="min(620px, 94vw)"
			destroy-on-close
		>
			<el-form label-position="top" @submit.prevent="submitForm">
				<div class="admin-form-grid">
					<el-form-item label="Name" required>
						<el-input v-model="form.name" maxlength="120" placeholder="e.g. Discord Match Bot" />
					</el-form-item>
					<el-form-item label="Active">
						<el-switch v-model="form.is_active" />
					</el-form-item>
					<el-form-item label="Payload URL (HTTPS)" class="span-2" required>
						<el-input v-model="form.url" maxlength="2000" placeholder="https://example.com/webhooks/cpl" />
					</el-form-item>
					<el-form-item label="Description" class="span-2">
						<el-input v-model="form.description" maxlength="400" placeholder="Optional note about what receives this webhook" />
					</el-form-item>
				</div>

				<div class="scope-picker">
					<div class="scope-picker-head">
						<span>Subscribed events ({{ form.events.length }})</span>
						<div class="scope-picker-links">
							<el-button text size="small" @click="selectAllEvents">Select all</el-button>
							<el-button text size="small" @click="form.events = []">Clear</el-button>
						</div>
					</div>
					<div v-for="group in eventGroups" :key="group.group" class="scope-group">
						<h4>{{ group.group }}</h4>
						<div class="scope-grid">
							<label v-for="ev in group.events" :key="ev.code" class="scope-option">
								<el-checkbox
									:model-value="form.events.includes(ev.code)"
									@change="(on) => toggleEvent(ev.code, on)"
								/>
								<span>
									<strong>{{ ev.name }}</strong>
									<small>{{ ev.description }}</small>
								</span>
							</label>
						</div>
					</div>
				</div>
			</el-form>
			<template #footer>
				<el-button @click="dialogOpen = false">Cancel</el-button>
				<el-button type="primary" :loading="submitting" @click="submitForm">
					{{ editingId ? "Save changes" : "Create webhook" }}
				</el-button>
			</template>
		</el-dialog>

		<el-dialog
			v-model="secretModalOpen"
			title="Copy webhook signing secret"
			width="min(540px, 94vw)"
			:close-on-click-modal="false"
		>
			<p class="secret-warning">
				Copy this signing secret now. For security, only a masked hint is shown after you close this dialog.
			</p>
			<div class="secret-box">
				<code>{{ revealedSecret }}</code>
				<el-button type="primary" size="small" @click="copySecret">Copy</el-button>
			</div>
			<p class="secret-help">
				Each delivery includes <code>X-CPL-Timestamp</code> and <code>X-CPL-Signature-256: sha256=HMAC(secret, timestamp + "." + rawBody)</code>.
			</p>
			<template #footer>
				<el-button type="primary" @click="closeSecretModal">Done</el-button>
			</template>
		</el-dialog>

		<el-dialog
			v-model="deliveriesOpen"
			:title="deliveriesTarget ? `Recent deliveries · ${deliveriesTarget.name}` : 'Recent deliveries'"
			width="min(680px, 95vw)"
		>
			<p v-if="deliveriesLoading" class="integration-msg">Loading deliveries...</p>
			<p v-else-if="!deliveries.length" class="integration-msg">No deliveries recorded for this webhook yet.</p>
			<ul v-else class="delivery-list">
				<li v-for="item in deliveries" :key="item.id" class="delivery-row">
					<div class="delivery-main">
						<strong>{{ item.event_type }}</strong>
						<span class="state-pill" :class="{ 'is-on': item.status === 'sent' }">{{ item.status }}</span>
						<span v-if="item.response_status" class="http-pill" :class="{ 'is-ok': item.response_status >= 200 && item.response_status < 300 }">
							HTTP {{ item.response_status }}
						</span>
						<small v-if="item.duration_ms != null">{{ item.duration_ms }} ms</small>
						<small>Attempt {{ item.attempts }}</small>
					</div>
					<div class="delivery-sub">
						<small>{{ formatTime(item.delivered_at || item.created_at) }}</small>
						<small v-if="item.error_detail" class="meta-err">{{ item.error_detail }}</small>
					</div>
				</li>
			</ul>
		</el-dialog>
	</section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { ElMessageBox } from "element-plus";
import { Lock, Plus } from "@element-plus/icons-vue";
import { adminApi, apiErrorMessage } from "@/services/adminService";
import { useAuthStore } from "@/store/authStore";
import { confirmDelete, runAction, unwrap } from "@/utils/adminHelpers";
import { holdPageData } from "@/utils/common";
import { Permission, Routes } from "@/utils/constants";
import { groupWebhookEvents } from "@/utils/integrations";
import { notify } from "@/utils/notify";
import { areas } from "@/utils/realtimeRules";
import { useAdminLive } from "@/utils/useLive";

const authStore = useAuthStore();
const releasePageData = holdPageData();

const canManage = computed(() => authStore.can(Permission.WEBHOOKS_MANAGE));
const canManagePermissions = computed(() => authStore.can(Permission.PERMISSIONS_MANAGE));
const permissionsPath = `${Routes.ADMIN}/permissions`;

const loading = ref(false);
const loadError = ref("");
const webhooks = ref([]);
const availableEvents = ref([]);

const dialogOpen = ref(false);
const editingId = ref(null);
const submitting = ref(false);
const busyId = ref(null);
const testingId = ref(null);

const secretModalOpen = ref(false);
const revealedSecret = ref("");

const deliveriesOpen = ref(false);
const deliveriesTarget = ref(null);
const deliveriesLoading = ref(false);
const deliveries = ref([]);

const form = reactive({
	name: "",
	url: "",
	description: "",
	events: [],
	is_active: true,
});

const eventGroups = computed(() => groupWebhookEvents(availableEvents.value));

const formatTime = (value) => {
	if (!value) return "";
	try {
		return new Date(value).toLocaleString();
	} catch {
		return String(value);
	}
};

const load = async () => {
	if (!canManage.value) {
		webhooks.value = [];
		return;
	}
	loading.value = true;
	loadError.value = "";
	try {
		const data = unwrap(await adminApi.webhooks.list()) || {};
		webhooks.value = data.webhooks || [];
		availableEvents.value = data.available_events || [];
	} catch (error) {
		loadError.value = apiErrorMessage(error, "Webhooks could not be loaded.");
	} finally {
		loading.value = false;
	}
};

watch(canManage, (allowed) => {
	if (allowed) load();
	else webhooks.value = [];
});

useAdminLive(
	async () => {
		if (!canManage.value || loading.value || dialogOpen.value || secretModalOpen.value) return;
		await load();
	},
	{ areas: areas.adminIntegrations },
);

const openCreate = () => {
	if (!canManage.value) return;
	editingId.value = null;
	form.name = "";
	form.url = "";
	form.description = "";
	form.events = availableEvents.value.filter((item) => item.group === "Matches").map((item) => item.code);
	form.is_active = true;
	dialogOpen.value = true;
};

const openEdit = (hook) => {
	if (!canManage.value) return;
	editingId.value = hook.id;
	form.name = hook.name;
	form.url = hook.url;
	form.description = hook.description || "";
	form.events = [...(hook.events || [])];
	form.is_active = Boolean(hook.is_active);
	dialogOpen.value = true;
};

const toggleEvent = (code, on) => {
	const set = new Set(form.events);
	if (on) set.add(code);
	else set.delete(code);
	form.events = availableEvents.value.filter((item) => set.has(item.code)).map((item) => item.code);
};

const selectAllEvents = () => {
	form.events = availableEvents.value.map((item) => item.code);
};

const submitForm = async () => {
	if (!canManage.value) return;
	if (!form.name.trim()) {
		notify.warning("Enter a name for the webhook.");
		return;
	}
	if (!form.url.trim()) {
		notify.warning("Enter the target HTTPS URL.");
		return;
	}
	if (!form.events.length) {
		notify.warning("Select at least one event.");
		return;
	}
	submitting.value = true;
	try {
		const payload = {
			name: form.name.trim(),
			url: form.url.trim(),
			description: form.description.trim() || null,
			events: form.events,
			is_active: form.is_active,
		};
		if (editingId.value) {
			await adminApi.webhooks.update(editingId.value, payload);
			notify.success("Webhook updated.");
			dialogOpen.value = false;
			await load();
		} else {
			const created = unwrap(await adminApi.webhooks.create(payload));
			dialogOpen.value = false;
			await load();
			if (created?.signing_secret) {
				revealedSecret.value = created.signing_secret;
				secretModalOpen.value = true;
			}
		}
	} catch (error) {
		notify.error(apiErrorMessage(error, "Webhook could not be saved."));
	} finally {
		submitting.value = false;
	}
};

const toggleActive = async (hook, nextValue) => {
	busyId.value = hook.id;
	await runAction(
		async () => {
			await adminApi.webhooks.update(hook.id, { is_active: Boolean(nextValue) });
			await load();
		},
		nextValue ? "Webhook enabled." : "Webhook paused.",
	);
	busyId.value = null;
};

const sendTest = async (hook) => {
	testingId.value = hook.id;
	try {
		const response = await adminApi.webhooks.test(hook.id);
		const result = unwrap(response);
		if (result?.ok) {
			notify.success(`Test ping delivered (HTTP ${result.status_code} in ${result.duration_ms} ms).`);
		} else {
			notify.warning(`Test ping failed: ${result?.error || "endpoint did not return 2xx"}.`);
		}
		await load();
	} catch (error) {
		notify.error(apiErrorMessage(error, "Could not send test webhook."));
	} finally {
		testingId.value = null;
	}
};

const rotateSecret = async (hook) => {
	const confirmed = await ElMessageBox.confirm(
		`Rotate the signing secret for "${hook.name}"? The current secret will stop signing new deliveries immediately.`,
		"Rotate signing secret",
		{ confirmButtonText: "Rotate secret", cancelButtonText: "Cancel", type: "warning" },
	)
		.then(() => true)
		.catch(() => false);
	if (!confirmed) return;
	busyId.value = hook.id;
	try {
		const rotated = unwrap(await adminApi.webhooks.rotateSecret(hook.id));
		await load();
		if (rotated?.signing_secret) {
			revealedSecret.value = rotated.signing_secret;
			secretModalOpen.value = true;
		}
	} catch (error) {
		notify.error(apiErrorMessage(error, "Signing secret could not be rotated."));
	} finally {
		busyId.value = null;
	}
};

const removeWebhook = async (hook) => {
	if (!(await confirmDelete(`webhook "${hook.name}"`))) return;
	busyId.value = hook.id;
	await runAction(async () => {
		await adminApi.webhooks.remove(hook.id);
		await load();
	}, "Webhook deleted.");
	busyId.value = null;
};

const openDeliveries = async (hook) => {
	deliveriesTarget.value = hook;
	deliveries.value = [];
	deliveriesOpen.value = true;
	deliveriesLoading.value = true;
	try {
		deliveries.value = unwrap(await adminApi.webhooks.deliveries(hook.id)) || [];
	} catch (error) {
		notify.error(apiErrorMessage(error, "Deliveries could not be loaded."));
	} finally {
		deliveriesLoading.value = false;
	}
};

const copySecret = async () => {
	try {
		await navigator.clipboard.writeText(revealedSecret.value);
		notify.success("Signing secret copied to clipboard.");
	} catch {
		notify.warning("Select and copy the signing secret manually.");
	}
};

const closeSecretModal = () => {
	secretModalOpen.value = false;
	revealedSecret.value = "";
};

onMounted(async () => {
	try {
		await load();
	} finally {
		releasePageData();
	}
});
</script>

<style scoped lang="scss">
.integration-card {
	padding: 6px 16px 16px;
}

.integration-head {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 14px 0 12px;
}

.integration-title {
	min-width: 0;

	h2 {
		margin: 0;
		font-family: var(--cpl-font-display);
		font-size: 18px;
		font-weight: 800;
		color: var(--cpl-ink-900);
	}

	p {
		margin: 4px 0 0;
		color: var(--cpl-ink-600);
		font-size: 14px;
		line-height: 1.45;
	}
}

.locked-banner {
	display: flex;
	align-items: flex-start;
	gap: 12px;
	padding: 14px 16px;
	border: 1px solid var(--cpl-line);
	border-left: 3px solid var(--cpl-gold-400);
	border-radius: 0 12px 12px 0;
	background: var(--cpl-surface-muted);

	.locked-icon {
		flex: 0 0 auto;
		margin-top: 2px;
		font-size: 18px;
		color: var(--cpl-heading);
	}

	strong {
		font-size: 14px;
		color: var(--cpl-ink-900);
	}

	p {
		margin: 3px 0 0;
		font-size: 13px;
		color: var(--cpl-ink-600);
		line-height: 1.45;
	}
}

.empty-state {
	padding: 14px 16px;
	border: 1px dashed var(--cpl-line);
	border-radius: var(--cpl-radius-md);
	background: var(--cpl-surface-muted);

	p {
		margin: 0;
		color: var(--cpl-ink-600);
		font-size: 14px;
	}
}

.integration-msg {
	margin: 6px 0 0;
	color: var(--cpl-ink-600);
	font-size: 14px;

	&.is-error {
		color: var(--cpl-heading);
		font-weight: 700;
	}
}

.item-list,
.delivery-list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.item-row {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 12px 16px;
	padding: 14px 16px;
	border: 1px solid var(--cpl-line);
	border-left: 3px solid var(--cpl-gold-400);
	border-radius: 0 12px 12px 0;
	background: var(--cpl-surface-muted);

	&.is-inactive {
		opacity: 0.72;
		border-left-color: var(--cpl-line);
	}
}

.item-main {
	display: flex;
	flex-direction: column;
	gap: 5px;
	min-width: 0;
	flex: 1 1 300px;
}

.item-top {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;

	strong {
		font-size: 15px;
		color: var(--cpl-ink-900);
	}
}

.item-mono {
	font-size: 12.5px;
	color: var(--cpl-ink-600);
	word-break: break-all;
}

.item-desc {
	margin: 0;
	font-size: 13px;
	color: var(--cpl-ink-600);
}

.item-meta {
	display: flex;
	flex-wrap: wrap;
	gap: 6px 14px;
	font-size: 12.5px;
	color: var(--cpl-ink-600);
}

.meta-err {
	color: var(--el-color-danger);
	font-weight: 600;
}

.state-pill,
.http-pill,
.fail-pill {
	padding: 2px 8px;
	border-radius: 999px;
	font-size: 11px;
	font-weight: 800;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	border: 1px solid var(--cpl-line);
	background: var(--cpl-surface);
	color: var(--cpl-ink-600);
}

.state-pill.is-on,
.http-pill.is-ok {
	background: var(--cpl-gold-400);
	border-color: var(--cpl-gold-400);
	color: var(--cpl-navy-900);
}

.fail-pill {
	border-color: var(--el-color-danger);
	color: var(--el-color-danger);
}

.item-actions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;

	.el-button + .el-button {
		margin-left: 0;
	}
}

.scope-picker {
	margin-top: 8px;
	border-top: 1px solid var(--cpl-line);
	padding-top: 12px;
}

.scope-picker-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	margin-bottom: 8px;
	font-weight: 700;
	color: var(--cpl-ink-900);
}

.scope-group + .scope-group {
	margin-top: 12px;
}

.scope-group h4 {
	margin: 0 0 6px;
	font-size: 13px;
	font-weight: 800;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--cpl-ink-600);
}

.scope-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
	gap: 8px;
}

.scope-option {
	display: flex;
	align-items: flex-start;
	gap: 8px;
	padding: 8px 10px;
	border: 1px solid var(--cpl-line);
	border-radius: var(--cpl-radius-md);
	background: var(--cpl-surface-muted);
	cursor: pointer;

	span {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	strong {
		font-size: 13px;
		color: var(--cpl-ink-900);
	}

	small {
		font-size: 12px;
		color: var(--cpl-ink-600);
		line-height: 1.35;
	}
}

.secret-warning {
	margin: 0 0 10px;
	font-size: 13.5px;
	font-weight: 600;
	color: var(--cpl-ink-900);
}

.secret-box {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	padding: 10px 12px;
	border: 1px solid var(--cpl-line);
	border-radius: var(--cpl-radius-md);
	background: var(--cpl-surface-muted);

	code {
		font-size: 13px;
		word-break: break-all;
		color: var(--cpl-ink-900);
	}
}

.secret-help {
	margin: 10px 0 0;
	font-size: 12.5px;
	color: var(--cpl-ink-600);
	line-height: 1.45;
}

.delivery-row {
	padding: 10px 12px;
	border: 1px solid var(--cpl-line);
	border-radius: var(--cpl-radius-md);
	background: var(--cpl-surface-muted);
}

.delivery-main,
.delivery-sub {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px 12px;
}

.delivery-sub {
	margin-top: 4px;
	color: var(--cpl-ink-600);
}

@media (max-width: 575.98px) {
	.integration-card {
		padding: 4px 12px 12px;
	}

	.integration-head > .el-button {
		width: 100%;
	}

	.item-actions {
		width: 100%;
	}
}
</style>
