<template>
	<div class="ip-page">
		<div class="admin-page-head">
			<div>
				<h1>Webhooks</h1>
				<p>Push live match and league updates to other tools. Each delivery is signed, and can carry your receiver's credential.</p>
			</div>
			<el-button v-if="canManage" type="primary" @click="openCreate">
				<el-icon class="me-1"><Plus /></el-icon>Create webhook
			</el-button>
		</div>

		<div v-if="!canManage" class="admin-card ip-locked" role="note">
			<el-icon><Lock /></el-icon>
			<div>
				<strong>Manage webhooks permission required</strong>
				<p>
					You need the <strong>Manage webhooks</strong> permission to see or change webhooks.
					<template v-if="canManagePermissions">
						Grant it from <router-link :to="permissionsPath">Permissions</router-link>.
					</template>
				</p>
			</div>
		</div>

		<template v-else>
			<section class="ip-stats" aria-label="Webhook summary">
				<div class="ip-stat">
					<span>Total</span>
					<strong>{{ summary.total }}</strong>
					<small>Registered endpoints</small>
				</div>
				<div class="ip-stat">
					<span>Active</span>
					<strong>{{ summary.active }}</strong>
					<small>Receiving events now</small>
				</div>
				<div class="ip-stat" :class="{ 'is-danger': summary.failing > 0 }">
					<span>Failing</span>
					<strong>{{ summary.failing }}</strong>
					<small>{{ summary.failing ? "Need a look" : "All deliveries healthy" }}</small>
				</div>
			</section>

			<div class="admin-card ip-list-card" v-loading="loading && !loaded">
				<div v-if="loadError" class="ip-error">
					<span>{{ loadError }}</span>
					<el-button size="small" type="primary" @click="load">Try again</el-button>
				</div>

				<div v-else-if="loaded && !webhooks.length" class="ip-empty">
					<div class="ip-empty-icon"><el-icon><Connection /></el-icon></div>
					<h2>No webhooks yet</h2>
					<p>Create one to send match, schedule and roster updates to a Discord bot, a scoreboard or your own service.</p>
					<el-button type="primary" @click="openCreate">
						<el-icon class="me-1"><Plus /></el-icon>Create your first webhook
					</el-button>
				</div>

				<template v-else-if="loaded">
					<div class="ip-filters">
						<el-input v-model="search" placeholder="Search by name or URL" clearable :prefix-icon="Search" aria-label="Search webhooks" />
						<el-select v-model="status" style="width: 170px" aria-label="Filter by status">
							<el-option v-for="option in STATUS_FILTERS" :key="option.value" :label="option.label" :value="option.value" />
						</el-select>
						<span class="ip-count">{{ rows.length }} of {{ webhooks.length }}</span>
					</div>

					<div class="ip-head ip-cols" aria-hidden="true">
						<span>Webhook</span>
						<span>Endpoint</span>
						<span>Events</span>
						<span>Health</span>
						<span></span>
					</div>

					<div v-if="!rows.length" class="ip-empty">
						<h2>No webhooks match</h2>
						<p>Try a different search or status.</p>
						<el-button @click="clearFilters">Clear filters</el-button>
					</div>

					<article
						v-for="hook in rows"
						:key="hook.id"
						class="ip-row ip-cols"
						:class="{ 'is-dim': !hook.is_active }"
					>
						<div class="ip-cell">
							<span class="ip-name">
								{{ hook.name }}
								<span v-if="hook.auth_type && hook.auth_type !== 'none'" class="ip-pill is-plain is-gold" :title="authTitle(hook)">
									<el-icon><Lock /></el-icon>{{ authSummary(hook) }}
								</span>
							</span>
							<span v-if="hook.description" class="ip-sub">{{ hook.description }}</span>
						</div>

						<div class="ip-cell">
							<span class="ip-cell-label">Endpoint</span>
							<span class="ip-mono">
								<code :title="hook.url">{{ hook.url }}</code>
								<button type="button" class="ip-copy" :aria-label="`Copy URL of ${hook.name}`" @click="copyText(hook.url, 'URL copied.')">
									<el-icon><CopyDocument /></el-icon>
								</button>
							</span>
							<span class="ip-sub">Secret <code>{{ hook.secret_hint }}</code></span>
						</div>

						<div class="ip-cell">
							<span class="ip-cell-label">Events</span>
							<el-tooltip placement="top" :content="eventNames(hook)" :show-after="200">
								<span class="ip-name" style="font-weight: 600">
									{{ hook.events.length }} event{{ hook.events.length === 1 ? "" : "s" }}
								</span>
							</el-tooltip>
							<span class="ip-sub">{{ eventPreview(hook) }}</span>
						</div>

						<div class="ip-cell">
							<span class="ip-cell-label">Health</span>
							<span>
								<span class="ip-pill" :class="statusTone(hook)">{{ WEBHOOK_STATUS_LABEL[webhookStatus(hook)] }}</span>
							</span>
							<span v-if="hook.last_delivered_at" class="ip-sub" :title="fullTime(hook.last_delivered_at)">
								Delivered {{ relativeTime(hook.last_delivered_at, now) }}<template v-if="hook.last_status_code"> · HTTP {{ hook.last_status_code }}</template>
							</span>
							<span v-else-if="hook.last_status_code" class="ip-sub">Last reply HTTP {{ hook.last_status_code }}</span>
							<span v-if="hook.failure_count > 0" class="ip-sub" style="color: var(--cpl-danger-text); font-weight: 600">
								{{ hook.failure_count }} failed{{ hook.last_error ? `: ${hook.last_error}` : "" }}
							</span>
						</div>

						<div class="ip-cell is-main-actions">
							<div class="ip-actions">
								<el-switch
									:model-value="hook.is_active"
									size="small"
									:disabled="busyId === hook.id"
									:aria-label="`${hook.is_active ? 'Pause' : 'Enable'} ${hook.name}`"
									@change="(value) => toggleActive(hook, value)"
								/>
								<el-button size="small" @click="openEdit(hook)">Edit</el-button>
								<el-dropdown trigger="click" @command="(command) => onCommand(command, hook)">
									<el-button size="small" :loading="testingId === hook.id || busyId === hook.id" :aria-label="`More actions for ${hook.name}`">
										<el-icon><MoreFilled /></el-icon>
									</el-button>
									<template #dropdown>
										<el-dropdown-menu>
											<el-dropdown-item command="test">Send test</el-dropdown-item>
											<el-dropdown-item command="deliveries">View deliveries</el-dropdown-item>
											<el-dropdown-item command="rotate">Rotate signing secret</el-dropdown-item>
											<el-dropdown-item command="delete" divided>Delete</el-dropdown-item>
										</el-dropdown-menu>
									</template>
								</el-dropdown>
							</div>
						</div>
					</article>
				</template>
			</div>
		</template>

		<WebhookDrawer
			v-model="formOpen"
			:webhook="editing"
			:events="availableEvents"
			:saving="saving"
			@submit="submit"
		/>
		<WebhookDeliveriesDrawer v-model="deliveriesOpen" :webhook="deliveriesTarget" />
		<SecretRevealDialog
			v-model="secretOpen"
			:title="secretTitle"
			lead="Copy this signing secret now. For safety it is shown only once. Later you will see just a short hint, and you can rotate it if it is lost."
			:secret="secret"
			copied-message="Signing secret copied."
		>
			Each delivery carries <code>X-CPL-Timestamp</code> and
			<code>X-CPL-Signature-256: sha256=HMAC(secret, timestamp + "." + rawBody)</code>. Check it before trusting a request.
		</SecretRevealDialog>
	</div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { ElMessageBox } from "element-plus";
import { Connection, CopyDocument, Lock, MoreFilled, Plus, Search } from "@element-plus/icons-vue";
import SecretRevealDialog from "@/components/admin/integrations/SecretRevealDialog.vue";
import WebhookDeliveriesDrawer from "@/components/admin/integrations/WebhookDeliveriesDrawer.vue";
import WebhookDrawer from "@/components/admin/integrations/WebhookDrawer.vue";
import { adminApi, apiErrorMessage } from "@/services/adminService";
import { useAuthStore } from "@/store/authStore";
import { confirmDelete, runAction, unwrap } from "@/utils/adminHelpers";
import { settlePageLoader } from "@/utils/common";
import { Permission, Routes } from "@/utils/constants";
import {
	WEBHOOK_STATUS_LABEL,
	authSummary,
	filterWebhooks,
	fullTime,
	relativeTime,
	summarizeWebhooks,
	webhookStatus,
} from "@/utils/integrations";
import { notify } from "@/utils/notify";
import { areas } from "@/utils/realtimeRules";
import { useAdminLive } from "@/utils/useLive";
import "@/assets/styles/integrations.css";

const authStore = useAuthStore();
const canManage = computed(() => authStore.can(Permission.WEBHOOKS_MANAGE));
const canManagePermissions = computed(() => authStore.can(Permission.PERMISSIONS_MANAGE));
const permissionsPath = `${Routes.ADMIN}/permissions`;

const STATUS_FILTERS = [
	{ value: "all", label: "All statuses" },
	{ value: "healthy", label: "Healthy" },
	{ value: "failing", label: "Failing" },
	{ value: "new", label: "No deliveries yet" },
	{ value: "paused", label: "Paused" },
];

const loading = ref(false);
const loaded = ref(false);
const loadError = ref("");
const webhooks = ref([]);
const availableEvents = ref([]);
const search = ref("");
const status = ref("all");
const now = ref(Date.now());

const formOpen = ref(false);
const editing = ref(null);
const saving = ref(false);
const busyId = ref(null);
const testingId = ref(null);

const deliveriesOpen = ref(false);
const deliveriesTarget = ref(null);

const secretOpen = ref(false);
const secret = ref("");
const secretTitle = ref("Copy the signing secret");

const summary = computed(() => summarizeWebhooks(webhooks.value));
const rows = computed(() => filterWebhooks(webhooks.value, search.value, status.value));
const eventNameByCode = computed(() => new Map(availableEvents.value.map((item) => [item.code, item.name])));

const eventNames = (hook) => hook.events.map((code) => eventNameByCode.value.get(code) || code).join(", ") || "None";
const eventPreview = (hook) => {
	const names = hook.events.map((code) => eventNameByCode.value.get(code) || code);
	return names.length > 2 ? `${names.slice(0, 2).join(", ")} +${names.length - 2} more` : names.join(", ");
};

const authTitle = (hook) => `${authSummary(hook)}${hook.auth_hint ? ` (${hook.auth_hint})` : ""}`;

const statusTone = (hook) => {
	const state = webhookStatus(hook);
	if (state === "healthy") return "is-success";
	if (state === "failing") return "is-danger";
	if (state === "paused") return "";
	return "is-warn";
};

const clearFilters = () => {
	search.value = "";
	status.value = "all";
};

const copyText = async (text, message) => {
	try {
		await navigator.clipboard.writeText(text);
		notify.success(message);
	} catch {
		notify.warning("Could not copy. Select the text and copy it yourself.");
	}
};

const load = async () => {
	if (!canManage.value) {
		webhooks.value = [];
		loaded.value = true;
		return;
	}
	loading.value = true;
	loadError.value = "";
	try {
		const data = unwrap(await adminApi.webhooks.list()) || {};
		webhooks.value = data.webhooks || [];
		availableEvents.value = data.available_events || [];
		now.value = Date.now();
	} catch (error) {
		loadError.value = apiErrorMessage(error, "Webhooks could not be loaded.");
	} finally {
		loading.value = false;
		loaded.value = true;
	}
};

watch(canManage, () => load());

useAdminLive(
	async () => {
		if (!canManage.value || loading.value || saving.value || formOpen.value || secretOpen.value) return;
		await load();
	},
	{ areas: areas.adminIntegrations },
);

// Keeps "5 min ago" honest between refreshes.
const tick = setInterval(() => {
	now.value = Date.now();
}, 30_000);
onUnmounted(() => clearInterval(tick));

const openCreate = () => {
	if (!canManage.value) return;
	editing.value = null;
	formOpen.value = true;
};

const openEdit = (hook) => {
	if (!canManage.value) return;
	editing.value = hook;
	formOpen.value = true;
};

const runTest = async (hook) => {
	testingId.value = hook.id;
	try {
		const result = unwrap(await adminApi.webhooks.test(hook.id));
		if (result?.ok) {
			notify.success(`Test ping delivered to ${hook.name} (HTTP ${result.status_code}, ${result.duration_ms} ms).`);
		} else {
			notify.warning(`Test ping to ${hook.name} failed: ${result?.error || "the endpoint did not answer with 2xx"}.`);
		}
		await load();
	} catch (error) {
		notify.error(apiErrorMessage(error, "Could not send the test ping."));
	} finally {
		testingId.value = null;
	}
};

const submit = async ({ payload, sendTest }) => {
	if (!canManage.value) return;
	saving.value = true;
	try {
		let hook;
		let revealed = "";
		if (editing.value) {
			hook = unwrap(await adminApi.webhooks.update(editing.value.id, payload));
			notify.success("Webhook updated.");
		} else {
			const created = unwrap(await adminApi.webhooks.create(payload));
			hook = created;
			revealed = created?.signing_secret || "";
		}
		formOpen.value = false;
		await load();
		if (revealed) {
			secret.value = revealed;
			secretTitle.value = "Copy the signing secret";
			secretOpen.value = true;
		}
		if (sendTest && hook?.id) await runTest(hook);
	} catch (error) {
		notify.error(apiErrorMessage(error, "The webhook could not be saved."));
	} finally {
		saving.value = false;
	}
};

const toggleActive = async (hook, next) => {
	busyId.value = hook.id;
	await runAction(
		async () => {
			await adminApi.webhooks.update(hook.id, { is_active: Boolean(next) });
			await load();
		},
		next ? `${hook.name} is active.` : `${hook.name} is paused.`,
	);
	busyId.value = null;
};

const openDeliveries = (hook) => {
	deliveriesTarget.value = hook;
	deliveriesOpen.value = true;
};

const rotateSecret = async (hook) => {
	const confirmed = await ElMessageBox.confirm(
		`Rotate the signing secret for "${hook.name}"? The current secret stops signing new deliveries right away, so update the receiver straight after.`,
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
			secret.value = rotated.signing_secret;
			secretTitle.value = "Copy the new signing secret";
			secretOpen.value = true;
		}
	} catch (error) {
		notify.error(apiErrorMessage(error, "The signing secret could not be rotated."));
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

const onCommand = (command, hook) => {
	if (command === "test") runTest(hook);
	else if (command === "deliveries") openDeliveries(hook);
	else if (command === "rotate") rotateSecret(hook);
	else if (command === "delete") removeWebhook(hook);
};

onMounted(() => settlePageLoader(load));
</script>

<style scoped lang="scss">
.ip-cols {
	grid-template-columns: minmax(0, 1.5fr) minmax(0, 1.7fr) minmax(0, 1fr) minmax(0, 1.2fr) auto;
}
</style>
