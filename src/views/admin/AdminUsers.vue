<template>
	<div class="users-page">
		<div class="admin-page-head">
			<div>
				<h1>Users</h1>
				<p>Who can sign in to this console. At least one active admin who can manage permissions is always kept.</p>
			</div>
			<div class="admin-toolbar">
				<el-input
					v-if="canView"
					v-model="search"
					placeholder="Search users"
					clearable
					:prefix-icon="Search"
					class="search-input"
				/>
				<el-button v-if="canCreate" type="primary" @click="openCreate">
					<el-icon class="me-1"><Plus /></el-icon>New admin
				</el-button>
			</div>
		</div>

		<div v-if="!canView" class="admin-card notice">
			<h2>You can add admin users</h2>
			<p>Your account can create admin users but cannot see the list of existing ones.</p>
		</div>

		<div v-else v-loading="loading" class="user-list">
			<article
				v-for="admin in filteredAdmins"
				:key="admin.id"
				class="admin-card user-row"
				:class="{ 'is-disabled': !admin.is_active }"
			>
				<div class="user-identity">
					<EntityImage :src="admin.avatar_url || ''" :name="adminName(admin)" kind="admin" class="user-avatar" alt="" />
					<div class="user-name">
						<strong>{{ adminName(admin) }}</strong>
						<span v-if="adminName(admin) !== admin.username" class="user-handle">{{ admin.username }}</span>
						<span v-if="admin.email" class="user-handle">{{ admin.email }}</span>
						<span v-if="contactLine(admin)" class="user-handle">{{ contactLine(admin) }}</span>
						<span class="user-tags">
							<el-tag v-if="admin.id === authStore.adminId" size="small" effect="plain">You</el-tag>
							<el-tag v-if="admin.must_change_password" size="small" type="warning">Awaiting email verification</el-tag>
							<el-tag v-else-if="!admin.is_active" size="small" type="info">Disabled</el-tag>
						</span>
					</div>
				</div>

				<div class="user-access">
					<div class="access-label">
						<span>{{ accessLabel(admin) }}</span>
						<span class="access-count">{{ admin.permissions.length }} / {{ index.order.length || "–" }}</span>
					</div>
					<div class="access-bar" role="presentation">
						<span :style="{ width: accessPercent(admin) }"></span>
					</div>
					<p class="access-areas">{{ areaSummary(admin) }}</p>
				</div>

				<div class="user-status">
					<el-switch
						:model-value="admin.is_active"
						:disabled="!canUpdate || admin.id === authStore.adminId || admin.must_change_password"
						active-text="Active"
						inactive-text="Off"
						inline-prompt
						:aria-label="`${admin.username} can sign in`"
						@change="(value) => toggleActive(admin, value)"
					/>
				</div>

				<div class="user-actions">
					<el-button v-if="admin.id === authStore.adminId" size="small" @click="router.push({ name: 'admin-profile' })">
						<el-icon class="me-1"><Key /></el-icon>My profile
					</el-button>
					<el-button
						v-if="canManage"
						size="small"
						type="primary"
						plain
						@click="router.push({ name: 'admin-permissions', query: { admin: admin.id } })"
					>
						<el-icon class="me-1"><Lock /></el-icon>Permissions
					</el-button>
					<el-button
						v-if="canDelete && admin.id !== authStore.adminId"
						size="small"
						type="danger"
						plain
						:aria-label="`Delete ${admin.username}`"
						@click="remove(admin)"
					>
						<el-icon><Delete /></el-icon>
					</el-button>
				</div>
			</article>

			<div v-if="!loading && !filteredAdmins.length" class="admin-card empty">
				{{ search ? `No users match "${search}".` : "No admin users found." }}
			</div>
		</div>

		<AdminCreateDialog v-if="canCreate" v-model="createOpen" :tree="tree" :countries="countries" @created="load" />
	</div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { Delete, Key, Lock, Plus, Search } from "@element-plus/icons-vue";
import EntityImage from "@/components/EntityImage.vue";
import AdminCreateDialog from "@/components/admin/AdminCreateDialog.vue";
import { adminApi } from "@/services/adminService";
import { confirmDelete, matchesSearch, runAction, unwrap } from "@/utils/adminHelpers";
import { adminName } from "@/utils/media";
import { accessLabel as describeAccess, buildIndex, emptyTree } from "@/utils/permissionTree";
import { useAuthStore } from "@/store/authStore";
import { Permission } from "@/utils/constants";
import { areas } from "@/utils/realtimeRules";
import { settlePageLoader } from "@/utils/common";
import { useAdminLive } from "@/utils/useLive";

const router = useRouter();
const authStore = useAuthStore();

const canView = computed(() => authStore.canAny([Permission.ADMINS_VIEW, Permission.PERMISSIONS_MANAGE]));
const canCreate = computed(() => authStore.can(Permission.ADMINS_CREATE));
const canUpdate = computed(() => authStore.can(Permission.ADMINS_UPDATE));
const canDelete = computed(() => authStore.can(Permission.ADMINS_DELETE));
const canManage = computed(() => authStore.can(Permission.PERMISSIONS_MANAGE));
const admins = ref([]);
const tree = ref(emptyTree());
const index = computed(() => buildIndex(tree.value));
const loading = ref(false);
const search = ref("");

const countries = ref([]);
const filteredAdmins = computed(() =>
	admins.value.filter((admin) =>
		matchesSearch(search.value, admin.username, admin.first_name, admin.last_name, adminName(admin), admin.email, admin.phone_number),
	),
);

const contactLine = (admin) => [admin.phone_code, admin.phone_number].filter(Boolean).join(" ");

const accessLabel = (admin) => describeAccess(index.value, tree.value.roles, admin.permissions);

const accessPercent = (admin) =>
	index.value.order.length ? `${Math.round((admin.permissions.length / index.value.order.length) * 100)}%` : "0%";

const areaSummary = (admin) => {
	if (!index.value.order.length || !admin.permissions.length) return "Cannot change anything yet.";
	const held = new Set(admin.permissions);
	const heldAreas = [];
	index.value.items.forEach((item) => {
		if (held.has(item.code) && !heldAreas.includes(item.area)) heldAreas.push(item.area);
	});
	return heldAreas.join(" · ");
};

const load = async () => {
	loading.value = true;
	await authStore.loadProfile().catch(() => undefined);
	const requests = [adminApi.permissions.tree()];
	if (canView.value) requests.push(adminApi.admins.list());
	const { ok, result } = await runAction(() => Promise.all(requests));
	if (ok) {
		tree.value = unwrap(result[0]) || emptyTree();
		admins.value = canView.value ? unwrap(result[1]) || [] : [];
	}
	try {
		const countryResult = await adminApi.countries.list();
		countries.value = unwrap(countryResult) || [];
	} catch {
		countries.value = [];
	}
	loading.value = false;
};

useAdminLive(
	async () => {
		if (loading.value) return;
		try {
			const requests = [adminApi.permissions.tree(), adminApi.countries.list()];
			if (canView.value) requests.push(adminApi.admins.list());
			const [treeResult, countryResult, adminResult] = await Promise.all(requests);
			tree.value = unwrap(treeResult) || emptyTree();
			countries.value = unwrap(countryResult) || [];
			admins.value = canView.value ? unwrap(adminResult) || [] : [];
		} catch (error) {
			console.error("Failed to refresh admin users", error);
		}
	},
	{ areas: areas.adminUsers },
);

const createOpen = ref(false);
const openCreate = () => {
	createOpen.value = true;
};

const toggleActive = async (admin, value) => {
	const { ok } = await runAction(
		() => adminApi.admins.update(admin.id, { is_active: value }),
		value ? "Admin activated" : "Admin disabled",
	);
	if (ok) await load();
};

const remove = async (admin) => {
	if (!(await confirmDelete(`admin "${admin.username}"`))) return;
	const { ok } = await runAction(() => adminApi.admins.remove(admin.id), "Admin deleted");
	if (ok) await load();
};

onMounted(() => settlePageLoader(load));
</script>

<style scoped lang="scss">
.search-input {
	width: 220px;
}

.notice {
	h2 {
		margin: 0 0 4px;
		font-size: 17px;
		font-weight: 700;
	}

	p {
		margin: 0;
		color: var(--cpl-ink-600);
	}
}

.user-list {
	display: flex;
	flex-direction: column;
	gap: 10px;
	flex: 1 1 auto;
	min-height: 0;
	overflow: auto;
	padding-bottom: 4px;
}

.user-row {
	display: grid;
	grid-template-columns: minmax(180px, 1.1fr) minmax(200px, 1.6fr) auto auto;
	align-items: center;
	gap: 12px 20px;
	margin: 0 !important;
}

.user-row.is-disabled {
	background: var(--cpl-surface-muted);

	.user-avatar {
		opacity: 0.55;
	}
}

.user-identity {
	display: flex;
	align-items: center;
	gap: 12px;
	min-width: 0;
}

.user-avatar {
	display: inline-block;
	flex-shrink: 0;
	width: 40px;
	height: 40px;
	border-radius: 50%;
	overflow: hidden;
}

.user-handle {
	color: var(--cpl-ink-600);
	font-size: 12px;
	word-break: break-word;
}

.user-name {
	display: flex;
	flex-direction: column;
	gap: 4px;
	min-width: 0;

	strong {
		font-size: 15px;
		word-break: break-word;
	}
}

.user-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;

	&:empty {
		display: none;
	}
}

.user-access {
	min-width: 0;
}

.access-label {
	display: flex;
	justify-content: space-between;
	gap: 8px;
	font-size: 13px;
	font-weight: 700;
	color: var(--cpl-ink-900);
}

.access-count {
	color: var(--cpl-ink-600);
	font-weight: 600;
}

.access-bar {
	height: 6px;
	margin: 6px 0;
	border-radius: 999px;
	background: var(--cpl-line);
	overflow: hidden;

	span {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, var(--cpl-gold-500), var(--cpl-wood-500));
		transition: width 0.3s ease;
	}
}

.access-areas {
	margin: 0;
	color: var(--cpl-ink-600);
	font-size: 12.5px;
	line-height: 1.4;
}

.user-actions {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-end;
	gap: 8px;

	.el-button + .el-button {
		margin-left: 0;
	}
}

.empty {
	color: var(--cpl-ink-600);
	text-align: center;
}

.account-fields {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	column-gap: 14px;
}

.user-dialog :deep(.el-dialog__body) {
	max-height: min(70vh, 720px);
	overflow-y: auto;
}

.picker-head {
	margin: 8px 0 12px;

	h3 {
		margin: 0;
		font-size: 16px;
		font-weight: 700;
	}

	p {
		margin: 2px 0 0;
		color: var(--cpl-ink-600);
		font-size: 13px;
	}
}

.email-code {
	display: flex;
	gap: 8px;
	align-items: center;
}

.dialog-footer {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: flex-end;
	gap: 8px;

	.el-button + .el-button {
		margin-left: 0;
	}
}

.footer-note {
	margin-right: auto;
	color: var(--cpl-ink-600);
	font-size: 13px;
}

@media (max-width: 991.98px) {
	.user-row {
		grid-template-columns: minmax(0, 1fr) auto;
	}

	.user-access {
		grid-column: 1 / -1;
		grid-row: 2;
	}

	.user-actions {
		grid-column: 1 / -1;
		justify-content: flex-start;
	}
}

@media (max-width: 575.98px) {
	.search-input {
		width: 100%;
	}

	.account-fields {
		grid-template-columns: minmax(0, 1fr);
	}

	.user-actions .el-button {
		flex: 1 1 auto;
		min-height: 40px;
	}

	.user-dialog :deep(.el-dialog__body) {
		max-height: none;
	}

	.dialog-footer {
		.footer-note {
			flex-basis: 100%;
		}

		.el-button {
			flex: 1 1 0;
		}
	}
}
</style>
