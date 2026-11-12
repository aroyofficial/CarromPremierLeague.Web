<template>
	<div>
		<div class="admin-page-head">
			<div>
				<h1>Admin Users</h1>
				<p>Control who can sign in to this console. At least one active admin is always kept.</p>
			</div>
			<el-button type="primary" @click="openCreate">
				<el-icon class="me-1"><Plus /></el-icon>New admin
			</el-button>
		</div>

		<div class="admin-card">
			<el-table :data="admins" v-loading="loading" empty-text="No admins found" stripe>
				<el-table-column prop="id" label="ID" :width="isPhone ? 48 : 70" />
				<el-table-column label="Username" min-width="200">
					<template #default="{ row }">
						<strong>{{ row.username }}</strong>
						<el-tag v-if="row.id === currentId" size="small" class="ms-2">You</el-tag>
					</template>
				</el-table-column>
				<el-table-column label="Status" width="200">
					<template #default="{ row }">
						<el-switch
							:model-value="row.is_active"
							:disabled="row.id === currentId"
							active-text="Active"
							inactive-text="Disabled"
							@change="(value) => toggleActive(row, value)"
						/>
					</template>
				</el-table-column>
				<el-table-column label="Actions" :width="isPhone ? 112 : 250" align="right" fixed="right" class-name="actions-col">
					<template #default="{ row }">
						<el-button size="small" type="primary" plain aria-label="Edit / password" @click="openEdit(row)">
							<el-icon class="me-1"><Key /></el-icon><span class="btn-label">Edit / password</span>
						</el-button>
						<el-button size="small" type="danger" plain aria-label="Delete" :disabled="row.id === currentId" @click="remove(row)">
							<el-icon><Delete /></el-icon>
						</el-button>
					</template>
				</el-table-column>
			</el-table>
		</div>

		<el-dialog v-model="dialogOpen" :title="editingAdmin ? `Edit ${editingAdmin.username}` : 'New admin'" width="min(480px, 94vw)">
			<el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
				<el-form-item label="Username" prop="username">
					<el-input v-model="form.username" autocomplete="off" />
				</el-form-item>
				<el-form-item :label="editingAdmin ? 'New password (leave blank to keep current)' : 'Password'" prop="password">
					<el-input v-model="form.password" type="password" show-password autocomplete="new-password" />
				</el-form-item>
				<el-form-item label="Confirm password" prop="confirm">
					<el-input v-model="form.confirm" type="password" show-password autocomplete="new-password" />
				</el-form-item>
				<el-alert
					v-if="editingAdmin && form.password"
					type="info"
					:closable="false"
					show-icon
					title="Changing the password signs this admin out of every existing session."
				/>
			</el-form>
			<template #footer>
				<el-button @click="dialogOpen = false">Cancel</el-button>
				<el-button type="primary" :loading="saving" @click="save">Save</el-button>
			</template>
		</el-dialog>
	</div>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { Delete, Key, Plus } from "@element-plus/icons-vue";
import { adminApi } from "@/services/adminService";
import { confirmDelete, runAction, unwrap } from "@/utils/adminHelpers";
import { useIsPhone } from "@/utils/viewport";

const isPhone = useIsPhone();
import { useAuthStore } from "@/store/authStore";
import { Routes } from "@/utils/constants";

const router = useRouter();
const authStore = useAuthStore();

const admins = ref([]);
const currentId = ref(null);
const loading = ref(false);

const load = async () => {
	loading.value = true;
	const { ok, result } = await runAction(() => Promise.all([adminApi.admins.list(), adminApi.admins.me()]));
	if (ok) {
		admins.value = unwrap(result[0]) || [];
		currentId.value = unwrap(result[1])?.id ?? null;
	}
	loading.value = false;
};

const dialogOpen = ref(false);
const saving = ref(false);
const editingAdmin = ref(null);
const formRef = ref(null);
const form = reactive({ username: "", password: "", confirm: "" });

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
	Object.assign(form, { username: "", password: "", confirm: "" });
	dialogOpen.value = true;
	formRef.value?.clearValidate();
};

const openEdit = (admin) => {
	editingAdmin.value = admin;
	Object.assign(form, { username: admin.username, password: "", confirm: "" });
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
		action = () => adminApi.admins.create({ username: form.username.trim(), password: form.password });
	}
	const { ok } = await runAction(action, editing ? "Admin updated" : "Admin created");
	saving.value = false;
	if (!ok) return;
	dialogOpen.value = false;
	const changedSelf =
		editing && editing.id === currentId.value && (form.password || form.username.trim() !== editing.username);
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
