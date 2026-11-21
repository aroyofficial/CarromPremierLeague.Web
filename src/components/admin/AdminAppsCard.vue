<template>
	<section class="admin-card integration-card" aria-label="Apps and API keys">
		<header class="integration-head">
			<div class="integration-title">
				<h2>Apps and API keys</h2>
				<p>Issue scoped API keys for external tools and scripts. An app can only receive permissions that you hold.</p>
			</div>
			<el-button v-if="canManage" type="primary" @click="openCreate">
				<el-icon class="me-1"><Plus /></el-icon>Create app
			</el-button>
		</header>

		<div v-if="!canManage" class="locked-banner" role="note">
			<el-icon class="locked-icon"><Lock /></el-icon>
			<div>
				<strong>Manage apps permission required</strong>
				<p>
					You need the <strong>Manage apps</strong> permission to view or create API keys.
					<template v-if="canManagePermissions">
						Grant it from <router-link :to="permissionsPath">Permissions</router-link>.
					</template>
				</p>
			</div>
		</div>

		<template v-else>
			<p v-if="loadError" class="integration-msg is-error">{{ loadError }}</p>
			<p v-else-if="loading && !apps.length" class="integration-msg">Loading apps...</p>
			<div v-else-if="!apps.length" class="empty-state">
				<p>No apps registered yet. Create an app to issue a scoped <code>X-API-Key</code> credential.</p>
			</div>

			<ul v-else class="item-list">
				<li v-for="app in apps" :key="app.id" class="item-row" :class="{ 'is-inactive': !app.is_active || isExpired(app) }">
					<div class="item-main">
						<div class="item-top">
							<strong>{{ app.name }}</strong>
							<span class="state-pill" :class="{ 'is-on': app.is_active && !isExpired(app) }">
								{{ isExpired(app) ? "Expired" : app.is_active ? "Active" : "Paused" }}
							</span>
							<span class="scope-pill">
								{{ app.permissions.length ? `${app.permissions.length} permission${app.permissions.length === 1 ? "" : "s"}` : "Read-only" }}
							</span>
						</div>
						<code class="item-mono">{{ app.key_prefix }}...</code>
						<p v-if="app.description" class="item-desc">{{ app.description }}</p>
						<div v-if="app.permissions.length" class="scope-tags">
							<span v-for="code in app.permissions" :key="code" class="scope-tag">{{ scopeLabel(code) }}</span>
						</div>
						<div class="item-meta">
							<span v-if="app.last_used_at">Last used {{ formatTime(app.last_used_at) }}</span>
							<span v-else>Never used</span>
							<span v-if="app.expires_at">Expires {{ formatTime(app.expires_at) }}</span>
						</div>
					</div>
					<div class="item-actions">
						<el-switch
							:model-value="app.is_active"
							size="small"
							:disabled="busyId === app.id"
							:aria-label="`Toggle ${app.name}`"
							@change="(val) => toggleActive(app, val)"
						/>
						<el-button size="small" @click="openEdit(app)">
							Edit
						</el-button>
						<el-button size="small" :loading="busyId === app.id" @click="rotateKey(app)">
							Rotate key
						</el-button>
						<el-button size="small" type="danger" plain :loading="busyId === app.id" @click="revokeApp(app)">
							Revoke
						</el-button>
					</div>
				</li>
			</ul>
		</template>

		<el-dialog
			v-model="dialogOpen"
			:title="editingId ? 'Edit app' : 'Create app'"
			width="min(620px, 94vw)"
			destroy-on-close
		>
			<el-form label-position="top" @submit.prevent="submitForm">
				<div class="admin-form-grid">
					<el-form-item label="App name" required>
						<el-input v-model="form.name" maxlength="120" placeholder="e.g. Scoreboard Sync Script" />
					</el-form-item>
					<el-form-item label="Expiration (optional)">
						<el-date-picker
							v-model="form.expires_at"
							type="datetime"
							placeholder="No expiration"
							clearable
						/>
					</el-form-item>
					<el-form-item label="Description" class="span-2">
						<el-input v-model="form.description" maxlength="400" placeholder="Optional note on where this key is used" />
					</el-form-item>
				</div>

				<div class="scope-picker">
					<div class="scope-picker-head">
						<span>Permissions ({{ form.permissions.length || "Read-only" }})</span>
						<div v-if="scopeGroups.length" class="scope-picker-links">
							<el-button text size="small" @click="form.permissions = []">Read-only (none)</el-button>
						</div>
					</div>
					<p v-if="!scopeGroups.length" class="integration-msg">
						You do not hold any delegable league permissions, so keys you create will have read-only access.
					</p>
					<div v-for="group in scopeGroups" :key="group.area" class="scope-group">
						<h4>{{ group.areaName }}</h4>
						<div class="scope-grid">
							<label v-for="scope in group.scopes" :key="scope.code" class="scope-option">
								<el-checkbox
									:model-value="form.permissions.includes(scope.code)"
									@change="(on) => onToggleScope(scope.code, on)"
								/>
								<span>
									<strong>{{ scope.name }}</strong>
									<small>{{ scope.description }}</small>
								</span>
							</label>
						</div>
					</div>
				</div>
			</el-form>
			<template #footer>
				<el-button @click="dialogOpen = false">Cancel</el-button>
				<el-button type="primary" :loading="submitting" @click="submitForm">
					{{ editingId ? "Save changes" : "Create app" }}
				</el-button>
			</template>
		</el-dialog>

		<el-dialog
			v-model="keyModalOpen"
			title="Copy API key"
			width="min(540px, 94vw)"
			:close-on-click-modal="false"
		>
			<p class="secret-warning">
				Copy this API key now. Only its prefix is stored for display, and the full key cannot be shown again.
			</p>
			<div class="secret-box">
				<code>{{ revealedKey }}</code>
				<el-button type="primary" size="small" @click="copyKey">Copy</el-button>
			</div>
			<p class="secret-help">
				Send it on API requests as <code>X-API-Key: {{ revealedKey.slice(0, 14) }}...</code>. Verify connectivity anytime via <code>GET /apps/me</code>.
			</p>
			<template #footer>
				<el-button type="primary" @click="closeKeyModal">Done</el-button>
			</template>
		</el-dialog>
	</section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { ElMessageBox } from "element-plus";
import { Lock, Plus } from "@element-plus/icons-vue";
import { adminApi, apiErrorMessage } from "@/services/adminService";
import { useAuthStore } from "@/store/authStore";
import { runAction, unwrap } from "@/utils/adminHelpers";
import { holdPageData } from "@/utils/common";
import { Permission, Routes } from "@/utils/constants";
import { groupAppScopes, toggleAppScope } from "@/utils/integrations";
import { notify } from "@/utils/notify";
import { areas } from "@/utils/realtimeRules";
import { useAdminLive } from "@/utils/useLive";

const authStore = useAuthStore();
const releasePageData = holdPageData();

const canManage = computed(() => authStore.can(Permission.APPS_MANAGE));
const canManagePermissions = computed(() => authStore.can(Permission.PERMISSIONS_MANAGE));
const permissionsPath = `${Routes.ADMIN}/permissions`;

const loading = ref(false);
const loadError = ref("");
const apps = ref([]);
const availableScopes = ref([]);

const dialogOpen = ref(false);
const editingId = ref(null);
const submitting = ref(false);
const busyId = ref(null);

const keyModalOpen = ref(false);
const revealedKey = ref("");

const form = reactive({
	name: "",
	description: "",
	expires_at: null,
	permissions: [],
});

const scopeGroups = computed(() => groupAppScopes(availableScopes.value, authStore.permissions));
const editableScopeCatalog = computed(() => scopeGroups.value.flatMap((group) => group.scopes));
const scopeNameMap = computed(() => new Map(availableScopes.value.map((item) => [item.code, item.name])));

const scopeLabel = (code) => scopeNameMap.value.get(code) || code;

const isExpired = (app) => {
	if (!app?.expires_at) return false;
	return new Date(app.expires_at).getTime() <= Date.now();
};

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
		apps.value = [];
		return;
	}
	loading.value = true;
	loadError.value = "";
	try {
		const data = unwrap(await adminApi.apps.list()) || {};
		apps.value = data.apps || [];
		availableScopes.value = data.available_scopes || [];
	} catch (error) {
		loadError.value = apiErrorMessage(error, "Apps could not be loaded.");
	} finally {
		loading.value = false;
	}
};

watch(canManage, (allowed) => {
	if (allowed) load();
	else apps.value = [];
});

useAdminLive(
	async () => {
		if (!canManage.value || loading.value || dialogOpen.value || keyModalOpen.value) return;
		await load();
	},
	{ areas: areas.adminIntegrations },
);

const openCreate = () => {
	if (!canManage.value) return;
	editingId.value = null;
	form.name = "";
	form.description = "";
	form.expires_at = null;
	form.permissions = [];
	dialogOpen.value = true;
};

const openEdit = (app) => {
	if (!canManage.value) return;
	editingId.value = app.id;
	form.name = app.name;
	form.description = app.description || "";
	form.expires_at = app.expires_at ? new Date(app.expires_at) : null;
	form.permissions = [...(app.permissions || [])];
	dialogOpen.value = true;
};

const onToggleScope = (code, on) => {
	form.permissions = toggleAppScope(form.permissions, code, on, editableScopeCatalog.value);
};

const submitForm = async () => {
	if (!canManage.value) return;
	if (!form.name.trim()) {
		notify.warning("Enter a name for the app.");
		return;
	}
	submitting.value = true;
	try {
		const payload = {
			name: form.name.trim(),
			description: form.description.trim() || null,
			permissions: form.permissions,
			expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
		};
		if (editingId.value) {
			await adminApi.apps.update(editingId.value, payload);
			notify.success("App updated.");
			dialogOpen.value = false;
			await load();
		} else {
			const created = unwrap(await adminApi.apps.create(payload));
			dialogOpen.value = false;
			await load();
			if (created?.api_key) {
				revealedKey.value = created.api_key;
				keyModalOpen.value = true;
			}
		}
	} catch (error) {
		notify.error(apiErrorMessage(error, "App could not be saved."));
	} finally {
		submitting.value = false;
	}
};

const toggleActive = async (app, nextValue) => {
	busyId.value = app.id;
	await runAction(
		async () => {
			await adminApi.apps.update(app.id, { is_active: Boolean(nextValue) });
			await load();
		},
		nextValue ? "App enabled." : "App paused.",
	);
	busyId.value = null;
};

const rotateKey = async (app) => {
	const confirmed = await ElMessageBox.confirm(
		`Rotate the API key for "${app.name}"? The existing key will stop working immediately.`,
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
			revealedKey.value = rotated.api_key;
			keyModalOpen.value = true;
		}
	} catch (error) {
		notify.error(apiErrorMessage(error, "API key could not be rotated."));
	} finally {
		busyId.value = null;
	}
};

const revokeApp = async (app) => {
	const confirmed = await ElMessageBox.confirm(
		`Revoke "${app.name}"? Any integration using this API key will lose access immediately.`,
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
	}, "App API key revoked.");
	busyId.value = null;
};

const copyKey = async () => {
	try {
		await navigator.clipboard.writeText(revealedKey.value);
		notify.success("API key copied to clipboard.");
	} catch {
		notify.warning("Select and copy the API key manually.");
	}
};

const closeKeyModal = () => {
	keyModalOpen.value = false;
	revealedKey.value = "";
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

.item-list {
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
}

.item-desc {
	margin: 0;
	font-size: 13px;
	color: var(--cpl-ink-600);
}

.scope-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	margin-top: 2px;
}

.scope-tag {
	padding: 2px 8px;
	border-radius: 999px;
	font-size: 11.5px;
	font-weight: 600;
	background: var(--cpl-surface);
	border: 1px solid var(--cpl-line);
	color: var(--cpl-ink-900);
}

.item-meta {
	display: flex;
	flex-wrap: wrap;
	gap: 6px 14px;
	font-size: 12.5px;
	color: var(--cpl-ink-600);
}

.state-pill,
.scope-pill {
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

.state-pill.is-on {
	background: var(--cpl-gold-400);
	border-color: var(--cpl-gold-400);
	color: var(--cpl-navy-900);
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
