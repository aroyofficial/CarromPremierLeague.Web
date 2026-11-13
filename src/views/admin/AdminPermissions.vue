<template>
	<div class="permissions-page">
		<div class="admin-page-head">
			<div>
				<h1>Permissions</h1>
				<p>Choose what each admin user can do. You can only grant or remove permissions you hold yourself.</p>
			</div>
		</div>

		<div v-if="loadError" class="admin-card load-error">
			<p>{{ loadError }}</p>
			<el-button type="primary" @click="load">Try again</el-button>
		</div>

		<div v-else v-loading="loading" class="permissions-layout">
			<aside class="admin-card admin-list" aria-label="Admin users">
				<el-input v-model="search" placeholder="Search admins" clearable :prefix-icon="Search" class="mb-2" />
				<div class="admin-select">
					<el-select
						:model-value="selectedId"
						placeholder="Choose an admin"
						filterable
						class="w-100"
						@change="selectAdmin"
					>
						<el-option
							v-for="admin in admins"
							:key="admin.id"
							:label="`${admin.username} · ${admin.permissions.length} of ${catalog.length}`"
							:value="admin.id"
						/>
					</el-select>
				</div>
				<ul class="admin-buttons">
					<li v-for="admin in filteredAdmins" :key="admin.id">
						<button
							type="button"
							class="admin-button"
							:class="{ 'is-active': admin.id === selectedId }"
							:aria-pressed="admin.id === selectedId"
							@click="selectAdmin(admin.id)"
						>
							<span class="admin-button-name">
								{{ admin.username }}
								<el-tag v-if="admin.id === authStore.adminId" size="small" effect="plain">You</el-tag>
								<el-tag v-if="!admin.is_active" size="small" type="info">Disabled</el-tag>
							</span>
							<span class="admin-button-count">{{ summary(admin) }}</span>
						</button>
					</li>
					<li v-if="!filteredAdmins.length" class="admin-empty">No admins match "{{ search }}".</li>
				</ul>
			</aside>

			<section v-if="selected" class="admin-card editor" aria-live="polite">
				<header class="editor-head">
					<div>
						<h2>{{ selected.username }}</h2>
						<p>
							{{ draft.length }} of {{ catalog.length }} permissions
							<template v-if="!selected.is_active"> · This account is disabled and cannot sign in.</template>
						</p>
					</div>
					<router-link v-if="authStore.canAny([Permission.ADMINS_VIEW])" :to="{ name: 'admin-users' }" class="editor-link">
						Manage account
					</router-link>
				</header>

				<el-alert
					v-if="unheldOnTarget.length"
					type="info"
					show-icon
					:closable="false"
					class="mb-3"
					:title="`${selected.username} has ${unheldOnTarget.length} permission${unheldOnTarget.length === 1 ? '' : 's'} you do not hold. Those stay as they are.`"
				/>

				<PermissionPicker v-model="draft" :catalog="catalog" :editable="authStore.permissions" :locked="locked" :disabled="saving" />

				<div class="save-bar">
					<p :class="{ 'is-dirty': dirty }">{{ statusText }}</p>
					<div class="save-actions">
						<el-button :disabled="!dirty || saving" @click="resetDraft">Undo changes</el-button>
						<el-button type="primary" :loading="saving" :disabled="!dirty" @click="save">Save permissions</el-button>
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
import PermissionPicker from "@/components/admin/PermissionPicker.vue";
import { adminApi, apiErrorMessage } from "@/services/adminService";
import { matchesSearch, runAction, unwrap } from "@/utils/adminHelpers";
import { Permission } from "@/utils/constants";
import { useAuthStore } from "@/store/authStore";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const loading = ref(false);
const saving = ref(false);
const loadError = ref("");
const catalog = ref([]);
const admins = ref([]);
const search = ref("");
const selectedId = ref(null);
const draft = ref([]);

const selected = computed(() => admins.value.find((admin) => admin.id === selectedId.value) || null);
const filteredAdmins = computed(() => admins.value.filter((admin) => matchesSearch(search.value, admin.username)));

const sameSet = (left, right) => left.length === right.length && left.every((code) => right.includes(code));
const dirty = computed(() => Boolean(selected.value) && !sameSet(draft.value, selected.value.permissions));

const changedCount = computed(() => {
	if (!selected.value) return 0;
	const before = new Set(selected.value.permissions);
	const after = new Set(draft.value);
	return [...before].filter((code) => !after.has(code)).length + [...after].filter((code) => !before.has(code)).length;
});

const statusText = computed(() => {
	if (!dirty.value) return "No unsaved changes.";
	return `${changedCount.value} unsaved change${changedCount.value === 1 ? "" : "s"}.`;
});

const unheldOnTarget = computed(() =>
	selected.value ? selected.value.permissions.filter((code) => !authStore.permissions.includes(code)) : [],
);

const locked = computed(() => {
	if (!selected.value || selected.value.id !== authStore.adminId) return {};
	if (!selected.value.permissions.includes(Permission.PERMISSIONS_MANAGE)) return {};
	return { [Permission.PERMISSIONS_MANAGE]: "You cannot remove your own permission to manage permissions." };
});

const summary = (admin) => {
	if (!catalog.value.length) return "";
	if (admin.permissions.length === catalog.value.length) return "Full access";
	if (!admin.permissions.length) return "No permissions";
	return `${admin.permissions.length} of ${catalog.value.length}`;
};

const resetDraft = () => {
	draft.value = selected.value ? [...selected.value.permissions] : [];
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
		const [catalogResponse, adminsResponse] = await Promise.all([
			adminApi.permissions.catalog(),
			adminApi.admins.list(),
			authStore.loadProfile(),
		]);
		catalog.value = unwrap(catalogResponse) || [];
		admins.value = unwrap(adminsResponse) || [];
		const wanted = Number(route.query.admin);
		const initial =
			admins.value.find((admin) => admin.id === wanted) ||
			admins.value.find((admin) => admin.id === selectedId.value) ||
			admins.value.find((admin) => admin.id !== authStore.adminId) ||
			admins.value[0];
		selectedId.value = initial?.id ?? null;
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
	grid-template-columns: 260px minmax(0, 1fr);
	gap: 16px;
	align-items: start;
}

.admin-list {
	position: sticky;
	top: calc(var(--app-header-height) + 16px);
	padding: 12px;
}

.admin-select {
	display: none;
}

.admin-buttons {
	margin: 0;
	padding: 0;
	list-style: none;
	display: flex;
	flex-direction: column;
	gap: 4px;
	max-height: calc(100vh - var(--app-header-height) - 140px);
	overflow-y: auto;
}

.admin-button {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 2px;
	width: 100%;
	padding: 10px 12px;
	border: 1px solid transparent;
	border-radius: 10px;
	background: transparent;
	text-align: left;
	cursor: pointer;
	color: var(--cpl-ink-900);

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
}

.admin-button-name {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 6px;
	font-weight: 700;
	word-break: break-word;
}

.admin-button-count {
	color: var(--cpl-ink-600);
	font-size: 12.5px;
}

.admin-empty {
	padding: 8px 4px;
	color: var(--cpl-ink-600);
	font-size: 13px;
}

.editor {
	min-width: 0;
	padding: 16px;
}

.editor-empty p {
	margin: 0;
	color: var(--cpl-ink-600);
}

.editor-head {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-start;
	justify-content: space-between;
	gap: 8px 16px;
	margin-bottom: 14px;

	h2 {
		margin: 0;
		font-family: var(--cpl-font-display);
		font-size: 20px;
		font-weight: 800;
		word-break: break-word;
	}

	p {
		margin: 2px 0 0;
		color: var(--cpl-ink-600);
		font-size: 14px;
	}
}

.editor-link {
	color: var(--cpl-navy-700);
	font-weight: 600;
	font-size: 14px;
}

.save-bar {
	position: sticky;
	bottom: 12px;
	z-index: 5;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin-top: 16px;
	padding: 12px 16px;
	border: 1px solid var(--cpl-line);
	border-radius: var(--cpl-radius-md);
	background: rgba(255, 255, 255, 0.96);
	box-shadow: var(--cpl-shadow-card);

	p {
		margin: 0;
		color: var(--cpl-ink-600);
		font-size: 14px;
	}

	.is-dirty {
		color: var(--cpl-navy-900);
		font-weight: 700;
	}
}

.save-actions {
	display: flex;
	gap: 8px;

	.el-button + .el-button {
		margin-left: 0;
	}
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

	.admin-list {
		position: static;
	}

	.admin-list > .el-input,
	.admin-buttons {
		display: none;
	}

	.admin-select {
		display: block;
	}
}

@media (max-width: 575.98px) {
	.editor {
		padding: 12px;
	}

	.save-bar {
		bottom: 8px;
		flex-direction: column;
		align-items: stretch;
	}

	.save-actions {
		flex-direction: column-reverse;

		.el-button {
			width: 100%;
		}
	}
}
</style>
