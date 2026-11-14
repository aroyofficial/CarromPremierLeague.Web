<template>
	<div class="permissions-page">
		<div class="admin-page-head">
			<div>
				<h1>Permissions</h1>
				<p>Choose what each admin user can do. Permissions are grouped by area, and some need another one first.</p>
			</div>
		</div>

		<div v-if="loadError" class="admin-card load-error">
			<p>{{ loadError }}</p>
			<el-button type="primary" @click="load">Try again</el-button>
		</div>

		<div v-else v-loading="loading" class="permissions-layout">
			<aside class="admin-card people" aria-label="Admin users">
				<div class="people-head">
					<span>Admin users</span>
					<span class="people-count">{{ admins.length }}</span>
				</div>
				<el-input v-model="search" placeholder="Search admins" clearable :prefix-icon="Search" class="people-search" />
				<div class="people-select">
					<el-select
						:model-value="selectedId"
						placeholder="Choose an admin"
						filterable
						class="w-100"
						aria-label="Choose an admin"
						@change="selectAdmin"
					>
						<el-option
							v-for="admin in admins"
							:key="admin.id"
							:label="`${admin.username} · ${accessText(admin.permissions)}`"
							:value="admin.id"
						/>
					</el-select>
				</div>
				<ul class="people-list">
					<li v-for="admin in filteredAdmins" :key="admin.id">
						<button
							type="button"
							class="person"
							:class="{ 'is-active': admin.id === selectedId, 'is-off': !admin.is_active }"
							:aria-pressed="admin.id === selectedId"
							@click="selectAdmin(admin.id)"
						>
							<span class="person-avatar" aria-hidden="true">{{ initial(admin.username) }}</span>
							<span class="person-body">
								<span class="person-name">
									{{ admin.username }}
									<el-tag v-if="admin.id === authStore.adminId" size="small" effect="plain">You</el-tag>
									<el-tag v-if="!admin.is_active" size="small" type="info">Disabled</el-tag>
								</span>
								<span class="person-access">{{ accessText(admin.permissions) }}</span>
								<span class="person-meter" aria-hidden="true">
									<span :style="{ width: percent(admin.permissions) }"></span>
								</span>
							</span>
						</button>
					</li>
					<li v-if="!filteredAdmins.length" class="people-empty">No admins match "{{ search }}".</li>
				</ul>
			</aside>

			<section v-if="selected" class="admin-card editor" aria-live="polite">
				<header class="editor-head">
					<span class="editor-avatar" aria-hidden="true">{{ initial(selected.username) }}</span>
					<div class="editor-title">
						<h2>{{ selected.username }}</h2>
						<p>
							<strong>{{ accessText(draft) }}</strong>
							· {{ draft.length }} of {{ index.order.length }} permissions
							<template v-if="!selected.is_active"> · This account is disabled and cannot sign in.</template>
						</p>
					</div>
					<router-link v-if="authStore.canAny([Permission.ADMINS_VIEW])" :to="{ name: 'admin-users' }" class="editor-link">
						Manage account
					</router-link>
				</header>

				<div class="section-summary" aria-label="Permissions by section">
					<div v-for="section in sectionSummary" :key="section.code" class="summary-card">
						<span class="summary-name">{{ section.name }}</span>
						<span class="summary-count">{{ section.on }} / {{ section.total }}</span>
						<span class="summary-meter" aria-hidden="true">
							<span :style="{ width: `${section.total ? (section.on / section.total) * 100 : 0}%` }"></span>
						</span>
					</div>
				</div>

				<el-alert
					v-if="unheldOnTarget.length"
					type="info"
					show-icon
					:closable="false"
					class="mb-3"
					:title="`${selected.username} has ${unheldOnTarget.length} permission${unheldOnTarget.length === 1 ? '' : 's'} you do not hold. Those stay as they are.`"
				/>

				<PermissionTree
					v-model="draft"
					:tree="tree"
					:editable="authStore.permissions"
					:locked="locked"
					:baseline="selected.permissions"
					:disabled="saving"
				/>

				<div class="save-bar" :class="{ 'is-dirty': dirty }">
					<div class="save-status">
						<template v-if="dirty">
							<span class="save-summary">
								<span v-if="added.length" class="delta is-added">+{{ added.length }} to grant</span>
								<span v-if="removed.length" class="delta is-removed">−{{ removed.length }} to remove</span>
							</span>
							<el-button text size="small" class="save-details-toggle" @click="showDetails = !showDetails">
								{{ showDetails ? "Hide details" : "Show details" }}
							</el-button>
						</template>
						<span v-else class="save-clean">No unsaved changes.</span>
					</div>
					<div class="save-actions">
						<el-button :disabled="!dirty || saving" @click="resetDraft">Undo changes</el-button>
						<el-button type="primary" :loading="saving" :disabled="!dirty" @click="save">Save permissions</el-button>
					</div>
					<div v-if="dirty && showDetails" class="save-details">
						<span v-for="code in added" :key="`a-${code}`" class="chip is-added">+ {{ index.nameOf(code) }}</span>
						<span v-for="code in removed" :key="`r-${code}`" class="chip is-removed">− {{ index.nameOf(code) }}</span>
					</div>
				</div>
			</section>

			<section v-else-if="!loading" class="admin-card editor editor-empty">
				<p>Choose an admin user to see and change their permissions.</p>
			</section>
		</div>
	</div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router";
import { ElMessageBox } from "element-plus";
import { Search } from "@element-plus/icons-vue";
import PermissionTree from "@/components/admin/PermissionTree.vue";
import { adminApi, apiErrorMessage } from "@/services/adminService";
import { matchesSearch, runAction, unwrap } from "@/utils/adminHelpers";
import { accessLabel, buildIndex, emptyTree, inOrder, sameSet } from "@/utils/permissionTree";
import { Permission } from "@/utils/constants";
import { useAuthStore } from "@/store/authStore";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const loading = ref(false);
const saving = ref(false);
const loadError = ref("");
const tree = ref(emptyTree());
const admins = ref([]);
const search = ref("");
const selectedId = ref(null);
const draft = ref([]);
const showDetails = ref(false);

const index = computed(() => buildIndex(tree.value));
const selected = computed(() => admins.value.find((admin) => admin.id === selectedId.value) || null);
const filteredAdmins = computed(() => admins.value.filter((admin) => matchesSearch(search.value, admin.username)));
const dirty = computed(() => Boolean(selected.value) && !sameSet(draft.value, selected.value.permissions));

const added = computed(() => {
	if (!selected.value) return [];
	const before = new Set(selected.value.permissions);
	return inOrder(index.value, draft.value.filter((code) => !before.has(code)));
});
const removed = computed(() => {
	if (!selected.value) return [];
	const after = new Set(draft.value);
	return inOrder(index.value, selected.value.permissions.filter((code) => !after.has(code)));
});

const sectionSummary = computed(() => {
	const held = new Set(draft.value);
	return tree.value.sections.map((section) => {
		const codes = section.areas.flatMap((area) => area.permissions.map((permission) => permission.code));
		return { code: section.code, name: section.name, total: codes.length, on: codes.filter((code) => held.has(code)).length };
	});
});

const unheldOnTarget = computed(() =>
	selected.value ? selected.value.permissions.filter((code) => !authStore.permissions.includes(code)) : [],
);

const locked = computed(() => {
	if (!selected.value || selected.value.id !== authStore.adminId) return {};
	if (!selected.value.permissions.includes(Permission.PERMISSIONS_MANAGE)) return {};
	return { [Permission.PERMISSIONS_MANAGE]: "You cannot remove your own permission to manage permissions." };
});

const initial = (name) => (name || "?").trim().charAt(0).toUpperCase();
const accessText = (codes) => accessLabel(index.value, tree.value.roles, codes);
const percent = (codes) => (index.value.order.length ? `${Math.round((codes.length / index.value.order.length) * 100)}%` : "0%");

const resetDraft = () => {
	draft.value = selected.value ? [...selected.value.permissions] : [];
	showDetails.value = false;
};

const confirmDiscard = async () => {
	if (!dirty.value) return true;
	try {
		await ElMessageBox.confirm("You have unsaved permission changes. Discard them?", "Discard changes?", {
			confirmButtonText: "Discard",
			cancelButtonText: "Keep editing",
			type: "warning",
		});
		return true;
	} catch {
		return false;
	}
};

const selectAdmin = async (id) => {
	if (id === selectedId.value) return;
	if (!(await confirmDiscard())) return;
	selectedId.value = id;
	resetDraft();
	router.replace({ query: { ...route.query, admin: String(id) } });
};

const load = async () => {
	loading.value = true;
	loadError.value = "";
	try {
		const [treeResponse, adminsResponse] = await Promise.all([
			adminApi.permissions.tree(),
			adminApi.admins.list(),
			authStore.loadProfile(),
		]);
		tree.value = unwrap(treeResponse) || emptyTree();
		admins.value = unwrap(adminsResponse) || [];
		const wanted = Number(route.query.admin);
		const initialAdmin =
			admins.value.find((admin) => admin.id === wanted) ||
			admins.value.find((admin) => admin.id === selectedId.value) ||
			admins.value.find((admin) => admin.id !== authStore.adminId) ||
			admins.value[0];
		selectedId.value = initialAdmin?.id ?? null;
		resetDraft();
	} catch (error) {
		loadError.value = apiErrorMessage(error, "The permissions could not be loaded.");
	} finally {
		loading.value = false;
	}
};

const save = async () => {
	if (!selected.value || !dirty.value) return;
	const target = selected.value;
	saving.value = true;
	const { ok, result } = await runAction(
		() => adminApi.admins.setPermissions(target.id, draft.value),
		`Permissions saved for ${target.username}`,
	);
	saving.value = false;
	if (!ok) return;
	const updated = unwrap(result);
	admins.value = admins.value.map((admin) => (admin.id === updated.id ? updated : admin));
	resetDraft();
	if (updated.id === authStore.adminId) await authStore.loadProfile({ force: true });
};

watch(
	() => route.query.admin,
	(value) => {
		const id = Number(value);
		if (id && id !== selectedId.value && admins.value.some((admin) => admin.id === id)) {
			selectAdmin(id);
		}
	},
);

onBeforeRouteLeave(confirmDiscard);

onMounted(load);
</script>

<style scoped lang="scss">
.permissions-layout {
	display: grid;
	grid-template-columns: 280px minmax(0, 1fr);
	gap: 16px;
	align-items: start;
}

.people {
	position: sticky;
	top: calc(var(--app-header-height) + 16px);
	padding: 12px;
}

.people-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin: 2px 4px 10px;
	font-weight: 700;
	color: var(--cpl-ink-900);
}

.people-count {
	min-width: 24px;
	padding: 0 8px;
	border-radius: 999px;
	background: var(--cpl-surface-muted);
	color: var(--cpl-ink-600);
	font-size: 12px;
	line-height: 22px;
	text-align: center;
}

.people-search {
	margin-bottom: 10px;
}

.people-select {
	display: none;
}

.people-list {
	margin: 0;
	padding: 0;
	list-style: none;
	display: flex;
	flex-direction: column;
	gap: 4px;
	max-height: calc(100vh - var(--app-header-height) - 170px);
	overflow-y: auto;
}

.person {
	display: flex;
	align-items: center;
	gap: 10px;
	width: 100%;
	padding: 9px 10px;
	border: 1px solid transparent;
	border-radius: 12px;
	background: transparent;
	text-align: left;
	cursor: pointer;
	color: var(--cpl-ink-900);
	transition: background 0.15s ease;

	&:hover {
		background: var(--cpl-surface-muted);
	}

	&:focus-visible {
		outline: 2px solid var(--cpl-gold-500);
		outline-offset: 1px;
	}

	&.is-active {
		border-color: var(--cpl-gold-500);
		background: var(--cpl-gold-100);
	}

	&.is-off .person-avatar {
		background: var(--cpl-ink-400);
		color: #fff;
	}
}

.person-avatar,
.editor-avatar {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	background: var(--cpl-navy-700);
	color: var(--cpl-gold-400);
	font-family: var(--cpl-font-display);
	font-weight: 800;
}

.person-avatar {
	width: 36px;
	height: 36px;
	font-size: 16px;
}

.person-body {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.person-name {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 6px;
	font-weight: 700;
	word-break: break-word;
}

.person-access {
	color: var(--cpl-ink-600);
	font-size: 12.5px;
}

.person-meter,
.summary-meter {
	display: block;
	height: 4px;
	border-radius: 999px;
	background: var(--cpl-line);
	overflow: hidden;

	span {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, var(--cpl-gold-500), var(--cpl-wood-500));
		transition: width 0.25s ease;
	}
}

.person-meter {
	margin-top: 3px;
}

.people-empty {
	padding: 8px 4px;
	color: var(--cpl-ink-600);
	font-size: 13px;
}

.editor {
	min-width: 0;
	padding: 18px;
}

.editor-empty p {
	margin: 0;
	color: var(--cpl-ink-600);
}

.editor-head {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 10px 14px;
	margin-bottom: 14px;
}

.editor-avatar {
	width: 48px;
	height: 48px;
	font-size: 22px;
}

.editor-title {
	flex: 1;
	min-width: 0;

	h2 {
		margin: 0;
		font-family: var(--cpl-font-display);
		font-size: 22px;
		font-weight: 800;
		word-break: break-word;
	}

	p {
		margin: 2px 0 0;
		color: var(--cpl-ink-600);
		font-size: 14px;

		strong {
			color: var(--cpl-navy-700);
		}
	}
}

.editor-link {
	color: var(--cpl-navy-700);
	font-weight: 600;
	font-size: 14px;
}

.section-summary {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
	gap: 8px;
	margin-bottom: 18px;
}

.summary-card {
	display: grid;
	grid-template-columns: 1fr auto;
	align-items: center;
	gap: 6px 8px;
	padding: 10px 12px;
	border: 1px solid var(--cpl-line);
	border-radius: var(--cpl-radius-md);
	background: var(--cpl-surface-muted);

	.summary-meter {
		grid-column: 1 / -1;
	}
}

.summary-name {
	font-size: 13px;
	font-weight: 700;
	color: var(--cpl-ink-900);
}

.summary-count {
	color: var(--cpl-ink-600);
	font-size: 12.5px;
	font-weight: 700;
}

.save-bar {
	position: sticky;
	bottom: 12px;
	z-index: 5;
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 10px 12px;
	margin-top: 18px;
	padding: 12px 16px;
	border: 1px solid var(--cpl-line);
	border-radius: var(--cpl-radius-md);
	background: rgba(255, 255, 255, 0.97);
	box-shadow: var(--cpl-shadow-card);
	transition: border-color 0.15s ease;

	&.is-dirty {
		border-color: var(--cpl-gold-500);
	}
}

.save-status {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 6px 10px;
}

.save-summary {
	display: inline-flex;
	flex-wrap: wrap;
	gap: 6px;
}

.save-clean {
	color: var(--cpl-ink-600);
	font-size: 14px;
}

.delta,
.chip {
	padding: 2px 10px;
	border-radius: 999px;
	font-size: 12.5px;
	font-weight: 700;

	&.is-added {
		background: #dcfce7;
		color: #166534;
	}

	&.is-removed {
		background: #fee2e2;
		color: #991b1b;
	}
}

.save-actions {
	display: flex;
	gap: 8px;

	.el-button + .el-button {
		margin-left: 0;
	}
}

.save-details {
	display: flex;
	flex-basis: 100%;
	flex-wrap: wrap;
	gap: 6px;
	padding-top: 10px;
	border-top: 1px dashed var(--cpl-line);
}

.chip {
	font-weight: 600;
}

.load-error {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 12px;

	p {
		margin: 0;
	}
}

@media (max-width: 991.98px) {
	.permissions-layout {
		grid-template-columns: minmax(0, 1fr);
	}

	.people {
		position: static;
	}

	.people-search,
	.people-list {
		display: none;
	}

	.people-select {
		display: block;
	}
}

@media (max-width: 575.98px) {
	.editor {
		padding: 12px;
	}

	.section-summary {
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 6px;
	}

	.summary-card {
		grid-template-columns: minmax(0, 1fr);
		gap: 4px;
		padding: 8px;
	}

	.summary-name {
		font-size: 12px;
		line-height: 1.2;
	}

	.editor-link {
		flex-basis: 100%;
	}

	.save-bar {
		bottom: 8px;
	}

	.save-actions {
		flex-basis: 100%;
		flex-direction: column-reverse;

		.el-button {
			width: 100%;
		}
	}
}
</style>
