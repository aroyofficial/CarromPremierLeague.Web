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
					<span class="user-avatar" aria-hidden="true">{{ initial(admin.username) }}</span>
					<div class="user-name">
						<strong>{{ admin.username }}</strong>
						<span class="user-tags">
							<el-tag v-if="admin.id === authStore.adminId" size="small" effect="plain">You</el-tag>
							<el-tag v-if="!admin.is_active" size="small" type="info">Disabled</el-tag>
						</span>
					</div>
				</div>

				<div class="user-access">
					<div class="access-label">
						<span>{{ accessLabel(admin) }}</span>
						<span class="access-count">{{ admin.permissions.length }} / {{ catalog.length || "–" }}</span>
					</div>
					<div class="access-bar" role="presentation">
						<span :style="{ width: accessPercent(admin) }"></span>
					</div>
					<p class="access-areas">{{ areaSummary(admin) }}</p>
				</div>

				<div class="user-status">
					<el-switch
						:model-value="admin.is_active"
						:disabled="!canUpdate || admin.id === authStore.adminId"
						active-text="Active"
						inactive-text="Off"
						inline-prompt
						:aria-label="`${admin.username} can sign in`"
						@change="(value) => toggleActive(admin, value)"
					/>
				</div>

				<div class="user-actions">
					<el-button v-if="canEdit(admin)" size="small" @click="openEdit(admin)">
						<el-icon class="me-1"><Key /></el-icon>{{ admin.id === authStore.adminId ? "My sign-in" : "Edit" }}
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

		<el-dialog
			v-model="dialogOpen"
			:title="dialogTitle"
			:width="editingAdmin ? 'min(480px, 94vw)' : 'min(820px, 96vw)'"
			:fullscreen="isPhone"
			class="user-dialog"
		>
			<el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
				<div class="account-fields">
					<el-form-item label="Username" prop="username">
						<el-input v-model="form.username" autocomplete="off" />
					</el-form-item>
					<el-form-item :label="editingAdmin ? 'New password (leave blank to keep it)' : 'Password'" prop="password">
						<el-input v-model="form.password" type="password" show-password autocomplete="new-password" />
					</el-form-item>
					<el-form-item label="Confirm password" prop="confirm">
						<el-input v-model="form.confirm" type="password" show-password autocomplete="new-password" />
					</el-form-item>
				</div>
				<el-alert
					v-if="editingAdmin && form.password"
					type="info"
					:closable="false"
					show-icon
					title="Changing the password signs this admin out of every existing session."
				/>

				<template v-if="!editingAdmin">
					<div class="picker-head">
						<h3>Permissions</h3>
						<p v-if="canManage">Pick what this admin can do. You can change this later on the Permissions page.</p>
						<p v-else>The new admin starts with no permissions. Someone who can manage permissions can grant them.</p>
					</div>
					<PermissionPicker
						v-if="canManage && catalog.length"
						v-model="form.permissions"
						:catalog="catalog"
						:editable="authStore.permissions"
						compact
					/>
				</template>
			</el-form>
			<template #footer>
				<div class="dialog-footer">
					<span v-if="!editingAdmin && canManage" class="footer-note">
						{{ form.permissions.length }} permission{{ form.permissions.length === 1 ? "" : "s" }} selected
					</span>
					<el-button @click="dialogOpen = false">Cancel</el-button>
					<el-button type="primary" :loading="saving" @click="save">{{ editingAdmin ? "Save" : "Create admin" }}</el-button>
				</div>
			</template>
		</el-dialog>
	</div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { Delete, Key, Lock, Plus, Search } from "@element-plus/icons-vue";
import PermissionPicker from "@/components/admin/PermissionPicker.vue";
import { adminApi } from "@/services/adminService";
import { confirmDelete, matchesSearch, runAction, unwrap } from "@/utils/adminHelpers";
import { useIsPhone } from "@/utils/viewport";
import { useAuthStore } from "@/store/authStore";
import { Permission, Routes } from "@/utils/constants";

const router = useRouter();
const authStore = useAuthStore();
const isPhone = useIsPhone();

const canView = computed(() => authStore.canAny([Permission.ADMINS_VIEW, Permission.PERMISSIONS_MANAGE]));
const canCreate = computed(() => authStore.can(Permission.ADMINS_CREATE));
const canUpdate = computed(() => authStore.can(Permission.ADMINS_UPDATE));
const canDelete = computed(() => authStore.can(Permission.ADMINS_DELETE));
const canManage = computed(() => authStore.can(Permission.PERMISSIONS_MANAGE));
const canEdit = (admin) => canUpdate.value || admin.id === authStore.adminId;

const admins = ref([]);
const catalog = ref([]);
const loading = ref(false);
const search = ref("");

const filteredAdmins = computed(() => admins.value.filter((admin) => matchesSearch(search.value, admin.username)));

const initial = (name) => (name || "?").trim().charAt(0).toUpperCase();

const accessLabel = (admin) => {
	if (!catalog.value.length) return `${admin.permissions.length} permissions`;
	if (admin.permissions.length === catalog.value.length) return "Full access";
	if (!admin.permissions.length) return "No permissions";
	return "Partial access";
};

const accessPercent = (admin) =>
	catalog.value.length ? `${Math.round((admin.permissions.length / catalog.value.length) * 100)}%` : "0%";

const areaSummary = (admin) => {
	if (!catalog.value.length || !admin.permissions.length) return "Cannot change anything yet.";
	const held = new Set(admin.permissions);
	const areas = [];
	catalog.value.forEach((item) => {
		if (held.has(item.code) && !areas.includes(item.area)) areas.push(item.area);
	});
	return areas.join(" · ");
};

const load = async () => {
	loading.value = true;
	await authStore.loadProfile().catch(() => undefined);
	const requests = [adminApi.permissions.catalog()];
	if (canView.value) requests.push(adminApi.admins.list());
	const { ok, result } = await runAction(() => Promise.all(requests));
	if (ok) {
		catalog.value = unwrap(result[0]) || [];
		admins.value = canView.value ? unwrap(result[1]) || [] : [];
	}
	loading.value = false;
};

const dialogOpen = ref(false);
const saving = ref(false);
const editingAdmin = ref(null);
const formRef = ref(null);
const form = reactive({ username: "", password: "", confirm: "", permissions: [] });

const dialogTitle = computed(() => {
	if (!editingAdmin.value) return "New admin";
	return editingAdmin.value.id === authStore.adminId ? "My sign-in details" : `Edit ${editingAdmin.value.username}`;
});

const rules = {
	username: [
		{ required: true, message: "Username is required", trigger: "blur" },
		{ pattern: /^[A-Za-z0-9_.-]{3,100}$/, message: "3–100 letters, numbers, dot, dash or underscore", trigger: "blur" },
	],
	password: [
		{
			validator: (_rule, value, callback) => {
				if (!value && editingAdmin.value) return callback();
				if (!value) return callback(new Error("Password is required"));
				if (value.length < 12) return callback(new Error("Use at least 12 characters"));
				return callback();
			},
			trigger: "blur",
		},
	],
	confirm: [
		{
			validator: (_rule, value, callback) =>
				(form.password || value) && value !== form.password ? callback(new Error("Passwords do not match")) : callback(),
			trigger: "blur",
		},
	],
};

const openCreate = () => {
	editingAdmin.value = null;
	Object.assign(form, { username: "", password: "", confirm: "", permissions: [] });
	dialogOpen.value = true;
	formRef.value?.clearValidate();
};

const openEdit = (admin) => {
	editingAdmin.value = admin;
	Object.assign(form, { username: admin.username, password: "", confirm: "", permissions: [] });
	dialogOpen.value = true;
	formRef.value?.clearValidate();
};

const save = async () => {
	const valid = await formRef.value.validate().catch(() => false);
	if (!valid) return;
	saving.value = true;
	const editing = editingAdmin.value;
	let action;
	if (editing) {
		const payload = {};
		if (form.username.trim() !== editing.username) payload.username = form.username.trim();
		if (form.password) payload.password = form.password;
		if (!Object.keys(payload).length) {
			saving.value = false;
			dialogOpen.value = false;
			return;
		}
		action = () => adminApi.admins.update(editing.id, payload);
	} else {
		action = () =>
			adminApi.admins.create({
				username: form.username.trim(),
				password: form.password,
				permissions: canManage.value ? form.permissions : [],
			});
	}
	const { ok } = await runAction(action, editing ? "Admin updated" : "Admin created");
	saving.value = false;
	if (!ok) return;
	dialogOpen.value = false;
	const changedSelf =
		editing && editing.id === authStore.adminId && (form.password || form.username.trim() !== editing.username);
	if (changedSelf) {
		ElMessage.info("Your sign-in details changed. Please sign in again.");
		authStore.logout();
		router.push(Routes.LOGIN);
		return;
	}
	await load();
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

onMounted(load);
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
	min-height: 80px;
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
		background: var(--cpl-ink-400);
	}
}

.user-identity {
	display: flex;
	align-items: center;
	gap: 12px;
	min-width: 0;
}

.user-avatar {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	border-radius: 50%;
	background: var(--cpl-navy-700);
	color: var(--cpl-gold-400);
	font-family: var(--cpl-font-display);
	font-size: 18px;
	font-weight: 800;
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
