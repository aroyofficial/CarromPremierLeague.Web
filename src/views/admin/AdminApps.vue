<template>
	<div class="ip-page">
		<div class="admin-page-head">
			<div>
				<h1>Apps</h1>
				<p>Issue scoped API keys for outside tools and scripts. A key can only do what you allow, and never more than you can.</p>
			</div>
			<el-button v-if="canManage" type="primary" @click="openCreate">
				<el-icon class="me-1"><Plus /></el-icon>Create app
			</el-button>
		</div>

		<div v-if="!canManage" class="admin-card ip-locked" role="note">
			<el-icon><Lock /></el-icon>
			<div>
				<strong>Manage apps permission required</strong>
				<p>
					You need the <strong>Manage apps</strong> permission to see or issue API keys.
					<template v-if="canManagePermissions">
						Grant it from <router-link :to="permissionsPath">Permissions</router-link>.
					</template>
				</p>
			</div>
		</div>

		<template v-else>
			<section class="ip-stats" aria-label="App summary">
				<div class="ip-stat">
					<span>Total</span>
					<strong>{{ summary.total }}</strong>
					<small>Keys issued</small>
				</div>
				<div class="ip-stat">
					<span>Active</span>
					<strong>{{ summary.active }}</strong>
					<small>Can call the API now</small>
				</div>
				<div class="ip-stat" :class="{ 'is-warn': summary.attention > 0 }">
					<span>Need attention</span>
					<strong>{{ summary.attention }}</strong>
					<small>{{ summary.attention ? "Expired or expiring soon" : "No key is close to expiry" }}</small>
				</div>
			</section>

			<div class="admin-card ip-list-card" v-loading="loading && !loaded">
				<div v-if="loadError" class="ip-error">
					<span>{{ loadError }}</span>
					<el-button size="small" type="primary" @click="load">Try again</el-button>
				</div>

				<div v-else-if="loaded && !apps.length" class="ip-empty">
					<div class="ip-empty-icon"><el-icon><Key /></el-icon></div>
					<h2>No apps yet</h2>
					<p>Create an app to give a script or tool its own key. You choose what it may do, and you can revoke it any time.</p>
					<el-button type="primary" @click="openCreate">
						<el-icon class="me-1"><Plus /></el-icon>Create your first app
					</el-button>
				</div>

				<template v-else-if="loaded">
					<div class="ip-filters">
						<el-input v-model="search" placeholder="Search by name or key" clearable :prefix-icon="Search" aria-label="Search apps" />
						<el-select v-model="status" style="width: 170px" aria-label="Filter by status">
							<el-option v-for="option in STATUS_FILTERS" :key="option.value" :label="option.label" :value="option.value" />
						</el-select>
						<span class="ip-count">{{ rows.length }} of {{ apps.length }}</span>
					</div>

					<div class="ip-head ip-cols" aria-hidden="true">
						<span>App</span>
						<span>Key</span>
						<span>Permissions</span>
						<span>Status</span>
						<span></span>
					</div>

					<div v-if="!rows.length" class="ip-empty">
						<h2>No apps match</h2>
						<p>Try a different search or status.</p>
						<el-button @click="clearFilters">Clear filters</el-button>
					</div>

					<article
						v-for="app in rows"
						:key="app.id"
						class="ip-row ip-cols"
						:class="{ 'is-dim': state(app) === 'paused' || state(app) === 'expired' }"
					>
						<div class="ip-cell">
							<span class="ip-name">{{ app.name }}</span>
							<span v-if="app.description" class="ip-sub">{{ app.description }}</span>
						</div>

						<div class="ip-cell">
							<span class="ip-cell-label">Key</span>
							<span class="ip-mono">
								<code>{{ app.key_prefix }}...</code>
								<button type="button" class="ip-copy" :aria-label="`Copy key prefix of ${app.name}`" @click="copyText(app.key_prefix, 'Key prefix copied.')">
									<el-icon><CopyDocument /></el-icon>
								</button>
							</span>
							<span class="ip-sub">Only the start is kept. The full key was shown once.</span>
						</div>

						<div class="ip-cell">
							<span class="ip-cell-label">Permissions</span>
							<span v-if="!app.permissions.length">
								<span class="ip-pill is-plain">Read-only</span>
							</span>
							<template v-else>
								<AppTooltip placement="top" :content="permissionNames(app)" :show-after="200">
									<span class="ip-name" style="font-weight: 600">
										{{ app.permissions.length }} permission{{ app.permissions.length === 1 ? "" : "s" }}
									</span>
								</AppTooltip>
								<span class="ip-sub">{{ permissionPreview(app) }}</span>
							</template>
						</div>

						<div class="ip-cell">
							<span class="ip-cell-label">Status</span>
							<span>
								<span class="ip-pill" :class="tone(app)">{{ APP_STATUS_LABEL[state(app)] }}</span>
							</span>
							<span v-if="app.last_used_at" class="ip-sub" :title="fullTime(app.last_used_at)">
								Used {{ relativeTime(app.last_used_at, now) }}
							</span>
							<span v-else class="ip-sub">Never used</span>
							<span v-if="app.expires_at" class="ip-sub" :title="fullTime(app.expires_at)">
								{{ state(app) === "expired" ? "Expired" : "Expires" }} {{ relativeTime(app.expires_at, now) }}
							</span>
						</div>

						<div class="ip-cell is-main-actions">
							<div class="ip-actions">
								<el-switch
									:model-value="app.is_active"
									size="small"
									:disabled="busyId === app.id"
									:aria-label="`${app.is_active ? 'Pause' : 'Enable'} ${app.name}`"
									@change="(value) => toggleActive(app, value)"
								/>
								<el-button size="small" @click="openEdit(app)">Edit</el-button>
								<el-dropdown trigger="click" @command="(command) => onCommand(command, app)">
									<el-button size="small" :loading="busyId === app.id" :aria-label="`More actions for ${app.name}`">
										<el-icon><MoreFilled /></el-icon>
									</el-button>
									<template #dropdown>
										<el-dropdown-menu>
											<el-dropdown-item command="rotate">Rotate key</el-dropdown-item>
											<el-dropdown-item command="revoke" divided>Revoke</el-dropdown-item>
										</el-dropdown-menu>
									</template>
								</el-dropdown>
							</div>
						</div>
					</article>
				</template>
			</div>
		</template>

		<AppDrawer
			v-model="formOpen"
			:app="editing"
			:scopes="availableScopes"
			:held="authStore.permissions"
			:saving="saving"
			@submit="submit"
		/>
		<SecretRevealDialog
			v-model="keyOpen"
			:title="keyTitle"
			lead="Copy this API key now. For safety it is shown only once. Later you will see just its start, and you can rotate it if it is lost."
			:secret="apiKey"
			copied-message="API key copied."
		>
			Send it on each request as the <code>X-API-Key</code> header. Check that it works with <code>GET /apps/me</code>.
		</SecretRevealDialog>
	</div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { ElMessageBox } from "element-plus";
import { CopyDocument, Key, Lock, MoreFilled, Plus, Search } from "@element-plus/icons-vue";
import AppDrawer from "@/components/admin/integrations/AppDrawer.vue";
import AppTooltip from "@/components/AppTooltip.vue";
import SecretRevealDialog from "@/components/admin/integrations/SecretRevealDialog.vue";
import { adminApi, apiErrorMessage } from "@/services/adminService";
import { useAuthStore } from "@/store/authStore";
import { runAction, unwrap } from "@/utils/adminHelpers";
import { settlePageLoader } from "@/utils/common";
import { Permission, Routes } from "@/utils/constants";
import {
	APP_STATUS_LABEL,
	appStatus,
	filterApps,
	fullTime,
	relativeTime,
	summarizeApps,
} from "@/utils/integrations";
import { notify } from "@/utils/notify";
import { areas } from "@/utils/realtimeRules";
import { useAdminLive } from "@/utils/useLive";
import "@/assets/styles/integrations.css";

const authStore = useAuthStore();
const canManage = computed(() => authStore.can(Permission.APPS_MANAGE));
const canManagePermissions = computed(() => authStore.can(Permission.PERMISSIONS_MANAGE));
const permissionsPath = `${Routes.ADMIN}/permissions`;

const STATUS_FILTERS = [
	{ value: "all", label: "All statuses" },
	{ value: "active", label: "Active" },
	{ value: "expiring", label: "Expiring soon" },
	{ value: "expired", label: "Expired" },
	{ value: "paused", label: "Paused" },
];

const loading = ref(false);
const loaded = ref(false);
const loadError = ref("");
const apps = ref([]);
const availableScopes = ref([]);
const search = ref("");
const status = ref("all");
const now = ref(Date.now());

const formOpen = ref(false);
const editing = ref(null);
const saving = ref(false);
const busyId = ref(null);

const keyOpen = ref(false);
const apiKey = ref("");
const keyTitle = ref("Copy the API key");

const summary = computed(() => summarizeApps(apps.value, now.value));
const rows = computed(() => filterApps(apps.value, search.value, status.value, now.value));
const scopeNameByCode = computed(() => new Map(availableScopes.value.map((item) => [item.code, item.name])));

const state = (app) => appStatus(app, now.value);
const permissionLabels = (app) => app.permissions.map((code) => scopeNameByCode.value.get(code) || code);
const permissionNames = (app) => permissionLabels(app).join(", ");
const permissionPreview = (app) => {
	const names = permissionLabels(app);
	return names.length > 2 ? `${names.slice(0, 2).join(", ")} +${names.length - 2} more` : names.join(", ");
};

const tone = (app) => {
	const current = state(app);
	if (current === "active") return "is-success";
	if (current === "expired") return "is-danger";
	if (current === "expiring") return "is-warn";
	return "";
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
		apps.value = [];
		loaded.value = true;
		return;
	}
	loading.value = true;
	loadError.value = "";
	try {
		const data = unwrap(await adminApi.apps.list()) || {};
		apps.value = data.apps || [];
		availableScopes.value = data.available_scopes || [];
		now.value = Date.now();
	} catch (error) {
		loadError.value = apiErrorMessage(error, "Apps could not be loaded.");
	} finally {
		loading.value = false;
		loaded.value = true;
	}
};

watch(canManage, () => load());

useAdminLive(
	async () => {
		if (!canManage.value || loading.value || saving.value || formOpen.value || keyOpen.value) return;
		await load();
	},
	{ areas: areas.adminIntegrations },
);

const tick = setInterval(() => {
	now.value = Date.now();
}, 30_000);
onUnmounted(() => clearInterval(tick));

const openCreate = () => {
	if (!canManage.value) return;
	editing.value = null;
	formOpen.value = true;
};

const openEdit = (app) => {
	if (!canManage.value) return;
	editing.value = app;
	formOpen.value = true;
};

const submit = async (payload) => {
	if (!canManage.value) return;
	saving.value = true;
	try {
		if (editing.value) {
			await adminApi.apps.update(editing.value.id, payload);
			notify.success("App updated.");
			formOpen.value = false;
			await load();
		} else {
			const created = unwrap(await adminApi.apps.create(payload));
			formOpen.value = false;
			await load();
			if (created?.api_key) {
				apiKey.value = created.api_key;
				keyTitle.value = "Copy the API key";
				keyOpen.value = true;
			}
		}
	} catch (error) {
		notify.error(apiErrorMessage(error, "The app could not be saved."));
	} finally {
		saving.value = false;
	}
};

const toggleActive = async (app, next) => {
	busyId.value = app.id;
	await runAction(
		async () => {
			await adminApi.apps.update(app.id, { is_active: Boolean(next) });
			await load();
		},
		next ? `${app.name} is active.` : `${app.name} is paused.`,
	);
	busyId.value = null;
};

const rotateKey = async (app) => {
	const confirmed = await ElMessageBox.confirm(
		`Rotate the API key for "${app.name}"? The current key stops working right away, so update the tool straight after.`,
		"Rotate API key",
		{ confirmButtonText: "Rotate key", cancelButtonText: "Cancel", type: "warning" },
	)
		.then(() => true)
		.catch(() => false);
	if (!confirmed) return;
	busyId.value = app.id;
	try {
		const rotated = unwrap(await adminApi.apps.rotate(app.id));
		await load();
		if (rotated?.api_key) {
			apiKey.value = rotated.api_key;
			keyTitle.value = "Copy the new API key";
			keyOpen.value = true;
		}
	} catch (error) {
		notify.error(apiErrorMessage(error, "The API key could not be rotated."));
	} finally {
		busyId.value = null;
	}
};

const revokeApp = async (app) => {
	const confirmed = await ElMessageBox.confirm(
		`Revoke "${app.name}"? Anything using this key loses access immediately. This cannot be undone.`,
		"Revoke API key",
		{ confirmButtonText: "Revoke", cancelButtonText: "Cancel", type: "warning", confirmButtonClass: "el-button--danger" },
	)
		.then(() => true)
		.catch(() => false);
	if (!confirmed) return;
	busyId.value = app.id;
	await runAction(async () => {
		await adminApi.apps.remove(app.id);
		await load();
	}, "API key revoked.");
	busyId.value = null;
};

const onCommand = (command, app) => {
	if (command === "rotate") rotateKey(app);
	else if (command === "revoke") revokeApp(app);
};

onMounted(() => settlePageLoader(load));
</script>

<style scoped lang="scss">
.ip-cols {
	grid-template-columns: minmax(0, 1.5fr) minmax(0, 1.3fr) minmax(0, 1.4fr) minmax(0, 1.1fr) auto;
}
</style>
