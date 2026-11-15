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
							<el-tag v-if="admin.must_change_password" size="small" type="warning">Awaiting password change</el-tag>
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
					<el-button v-if="canEdit(admin)" size="small" @click="openEdit(admin)">
						<el-icon class="me-1"><Key /></el-icon>{{ admin.id === authStore.adminId ? "My profile" : "Edit" }}
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
			width="min(760px, 96vw)"
			:fullscreen="isPhone"
			class="user-dialog"
			:close-on-click-modal="!uploadBlocked"
			:close-on-press-escape="!uploadBlocked"
			:show-close="!uploadBlocked"
			:before-close="closeDialog"
		>
			<el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="admin-form-grid" @submit.prevent>
				<el-form-item label="Profile picture" class="span-2">
					<ImageUploadField
						v-model:pending-file="pendingPhoto"
						v-model:pending-link="pendingLink"
						v-model:busy="pictureBusy"
						:src="editingAvatar"
						:name="adminName(form) || 'Admin'"
						kind="admin"
						label="Profile picture"
						:deferred="!editingAdmin"
						:external-busy="uploading"
						:external-progress="uploadProgress"
						:external-error="pictureError"
						:upload="(file, onProgress) => adminApi.admins.uploadAvatar(editingAdmin.id, file, onProgress)"
						:upload-link="(url) => adminApi.admins.setAvatarUrl(editingAdmin.id, url)"
						:remove="() => adminApi.admins.removeAvatar(editingAdmin.id)"
						@dismiss-error="pictureError = ''"
						@changed="pictureChanged"
					/>
				</el-form-item>
				<el-form-item label="First name" prop="first_name">
					<el-input v-model="form.first_name" />
				</el-form-item>
				<el-form-item label="Last name" prop="last_name">
					<el-input v-model="form.last_name" />
				</el-form-item>
				<el-form-item label="Date of birth" prop="date_of_birth">
					<el-date-picker
						v-model="form.date_of_birth"
						type="date"
						value-format="YYYY-MM-DD"
						:disabled-date="(date) => date > new Date()"
						placeholder="Optional"
					/>
				</el-form-item>
				<el-form-item label="Gender" prop="gender">
					<el-select v-model="form.gender" clearable placeholder="Optional">
						<el-option v-for="option in genderOptions" :key="option.value" :label="option.label" :value="option.value" />
					</el-select>
				</el-form-item>
				<el-form-item label="Country code" prop="phone_country_id">
					<el-select v-model="form.phone_country_id" filterable clearable placeholder="Code" @change="formRef?.validateField('phone_number')">
						<el-option v-for="country in phoneChoices" :key="country.id" :label="country.label" :value="country.id" />
					</el-select>
				</el-form-item>
				<el-form-item label="Contact number" prop="phone_number">
					<el-input v-model="form.phone_number" inputmode="numeric" placeholder="Digits only" />
				</el-form-item>
				<el-form-item label="Email" prop="email" class="span-2">
					<el-input v-model="form.email" type="email" autocomplete="off" />
				</el-form-item>
				<div v-if="emailChanged" class="span-2 email-code">
					<el-input v-model.trim="form.email_code" maxlength="6" placeholder="6-digit code" />
					<el-button :loading="sendingCode" @click="sendEmailCode">Email code</el-button>
				</div>
				<el-form-item label="Username" prop="username">
					<el-input v-model="form.username" autocomplete="off" />
				</el-form-item>
				<template v-if="editingAdmin">
					<el-form-item label="New password (leave blank to keep it)" prop="password">
						<el-input v-model="form.password" type="password" show-password autocomplete="new-password" />
					</el-form-item>
					<el-form-item label="Confirm password" prop="confirm" class="span-2">
						<el-input v-model="form.confirm" type="password" show-password autocomplete="new-password" />
					</el-form-item>
					<el-alert
						v-if="form.password"
						class="span-2"
						type="info"
						:closable="false"
						show-icon
						title="Changing the password signs this admin out and emails them that it changed."
					/>
				</template>
				<el-alert
					v-else
					class="span-2"
					type="info"
					:closable="false"
					show-icon
					title="A default password is generated and emailed with this address. The account stays off until they sign in and change it."
				/>

				<div v-if="!editingAdmin" class="span-2">
					<div class="picker-head">
						<h3>Permissions</h3>
						<p v-if="canManage">Pick what this admin can do. You can change this later on the Permissions page.</p>
						<p v-else>The new admin starts with no permissions. Someone who can manage permissions can grant them.</p>
					</div>
					<PermissionTree
						v-if="canManage && index.order.length"
						v-model="form.permissions"
						:tree="tree"
						:editable="authStore.permissions"
						compact
					/>
				</div>
			</el-form>
			<template #footer>
				<div class="dialog-footer">
					<span v-if="!editingAdmin && canManage" class="footer-note">
						{{ form.permissions.length }} permission{{ form.permissions.length === 1 ? "" : "s" }} selected
					</span>
					<el-button @click="dialogOpen = false">Cancel</el-button>
					<el-button type="primary" :loading="saving" :disabled="saving || pictureBusy" @click="save">{{ editingAdmin ? "Save" : "Create admin" }}</el-button>
				</div>
			</template>
		</el-dialog>
	</div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { Delete, Key, Lock, Plus, Search } from "@element-plus/icons-vue";
import EntityImage from "@/components/EntityImage.vue";
import ImageUploadField from "@/components/admin/ImageUploadField.vue";
import PermissionTree from "@/components/admin/PermissionTree.vue";
import { adminApi, apiErrorMessage } from "@/services/adminService";
import { blankToNull, confirmDelete, matchesSearch, runAction, unwrap } from "@/utils/adminHelpers";
import { adminName } from "@/utils/media";
import { accessLabel as describeAccess, buildIndex, emptyTree } from "@/utils/permissionTree";
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
const tree = ref(emptyTree());
const index = computed(() => buildIndex(tree.value));
const loading = ref(false);
const search = ref("");

const countries = ref([]);
const genderOptions = [
	{ value: "female", label: "Female" },
	{ value: "male", label: "Male" },
	{ value: "other", label: "Other" },
];

const phoneOptions = computed(() =>
	countries.value
		.filter((country) => country.phone_code)
		.map((country) => ({
			id: country.id,
			code: country.phone_code,
			label: `${country.name} (${country.phone_code})`,
		})),
);

const phoneChoices = computed(() => {
	if (form.phone_country_id !== 0 || !form.phone_code) return phoneOptions.value;
	if (phoneOptions.value.some((country) => country.code === form.phone_code)) return phoneOptions.value;
	return [{ id: 0, code: form.phone_code, label: form.phone_code }, ...phoneOptions.value];
});

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
	const areas = [];
	index.value.items.forEach((item) => {
		if (held.has(item.code) && !areas.includes(item.area)) areas.push(item.area);
	});
	return areas.join(" · ");
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
	adminApi.countries
		.list()
		.then((result) => {
			countries.value = unwrap(result) || [];
		})
		.catch(() => {});
	loading.value = false;
};

const dialogOpen = ref(false);
const saving = ref(false);
const sendingCode = ref(false);
const editingAdmin = ref(null);
const formRef = ref(null);
const emptyAccount = () => ({
	username: "",
	password: "",
	confirm: "",
	email_code: "",
	permissions: [],
	first_name: "",
	last_name: "",
	date_of_birth: null,
	gender: null,
	phone_code: "",
	phone_country_id: null,
	phone_number: "",
	email: "",
});
const form = reactive(emptyAccount());
const editingAvatar = ref("");
const pendingPhoto = ref(null);
const pendingLink = ref("");
const pictureBusy = ref(false);
const uploading = ref(false);
const uploadProgress = ref(null);
const pictureError = ref("");
const uploadBlocked = computed(() => pictureBusy.value || uploading.value || Boolean(pictureError.value));

const dialogTitle = computed(() => {
	if (!editingAdmin.value) return "New admin";
	return editingAdmin.value.id === authStore.adminId ? "My profile" : `Edit ${adminName(editingAdmin.value)}`;
});

watch(phoneOptions, () => {
	if (!dialogOpen.value || !form.phone_code || (form.phone_country_id && form.phone_country_id !== 0)) return;
	const match = phoneOptions.value.find((country) => country.code === form.phone_code);
	if (match) form.phone_country_id = match.id;
});

const rules = {
	username: [
		{ required: true, message: "Username is required", trigger: "blur" },
		{ pattern: /^[A-Za-z0-9_.-]{3,100}$/, message: "3–100 letters, numbers, dot, dash or underscore", trigger: "blur" },
	],
	password: [
		{
			validator: (_rule, value, callback) => {
				if (!value) return callback();
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
	first_name: [{ max: 100, message: "Use 100 characters or fewer", trigger: "blur" }],
	last_name: [{ max: 100, message: "Use 100 characters or fewer", trigger: "blur" }],
	email: [
		{
			validator: (_rule, value, callback) => {
				const text = (value || "").trim();
				if (!text) return callback(new Error("Email is required"));
				if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return callback(new Error("Enter a valid email address"));
				return callback();
			},
			trigger: "blur",
		},
	],
	phone_number: [
		{
			validator: (_rule, value, callback) => {
				const number = (value || "").trim();
				const hasCode = Boolean(form.phone_country_id);
				if (!number || !hasCode) return callback(new Error("Enter both a country code and a contact number"));
				if (!/^\d{6,15}$/.test(number)) return callback(new Error("Enter 6–15 digits, without spaces"));
				return callback();
			},
			trigger: "blur",
		},
	],
};

const emailChanged = computed(
	() =>
		Boolean(editingAdmin.value) &&
		form.email.trim().toLowerCase() !== (editingAdmin.value.email || "").toLowerCase(),
);

const closeDialog = (done) => {
	if (!uploadBlocked.value) done();
};

const resetPicture = () => {
	editingAvatar.value = "";
	pendingPhoto.value = null;
	pendingLink.value = "";
	pictureError.value = "";
};

const phoneCountryIdFor = (code) => {
	if (!code) return null;
	return phoneOptions.value.find((country) => country.code === code)?.id ?? 0;
};

const openCreate = () => {
	editingAdmin.value = null;
	resetPicture();
	Object.assign(form, emptyAccount());
	dialogOpen.value = true;
	formRef.value?.clearValidate();
};

const openEdit = (admin) => {
	editingAdmin.value = admin;
	resetPicture();
	editingAvatar.value = admin.avatar_url || "";
	Object.assign(form, {
		...emptyAccount(),
		username: admin.username,
		first_name: admin.first_name || "",
		last_name: admin.last_name || "",
		date_of_birth: admin.date_of_birth,
		gender: admin.gender,
		phone_code: admin.phone_code || "",
		phone_country_id: phoneCountryIdFor(admin.phone_code),
		phone_number: admin.phone_number || "",
		email: admin.email || "",
	});
	dialogOpen.value = true;
	formRef.value?.clearValidate();
};

const pictureChanged = (admin) => {
	editingAvatar.value = admin?.avatar_url || "";
	const row = admins.value.find((item) => item.id === editingAdmin.value?.id);
	if (row) row.avatar_url = editingAvatar.value || null;
};

const selectedPhoneCode = () => {
	if (!form.phone_country_id && form.phone_country_id !== 0) return null;
	return phoneChoices.value.find((country) => country.id === form.phone_country_id)?.code || null;
};

const profilePayload = () =>
	blankToNull({
		first_name: form.first_name.trim(),
		last_name: form.last_name.trim(),
		date_of_birth: form.date_of_birth,
		gender: form.gender,
		phone_code: selectedPhoneCode(),
		phone_number: form.phone_number.trim(),
		email: form.email.trim(),
	});

const sendEmailCode = async () => {
	const text = form.email.trim();
	if (!editingAdmin.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
		ElMessage.error("Enter the new email address first.");
		return;
	}
	sendingCode.value = true;
	try {
		await adminApi.admins.emailCode(editingAdmin.value.id, text);
		ElMessage.success("A code was sent to that email address.");
	} catch (error) {
		ElMessage.error(error?.message || "The code could not be sent.");
	} finally {
		sendingCode.value = false;
	}
};

const save = async () => {
	const valid = await formRef.value.validate().catch(() => false);
	if (!valid) return;
	saving.value = true;
	pictureError.value = "";
	const editing = editingAdmin.value;
	const profile = profilePayload();
	let action;
	if (editing) {
		const payload = { ...profile };
		if (form.username.trim() !== editing.username) payload.username = form.username.trim();
		if (form.password) payload.password = form.password;
		if (emailChanged.value) {
			if (!/^\d{6}$/.test(form.email_code)) {
				saving.value = false;
				ElMessage.error("Email the code to the new address, then enter it here.");
				return;
			}
			payload.email_code = form.email_code;
		}
		action = () => adminApi.admins.update(editing.id, payload);
	} else {
		action = () =>
			adminApi.admins.create({
				...profile,
				username: form.username.trim(),
				permissions: canManage.value ? form.permissions : [],
			});
	}
	const { ok, result } = await runAction(
		action,
		editing ? "Admin updated" : "Admin created. The temporary password was emailed and the account stays off until they change it.",
	);
	let pictureOk = true;
	if (ok && !editing && (pendingPhoto.value || pendingLink.value)) {
		const created = unwrap(result);
		uploading.value = true;
		try {
			if (pendingPhoto.value) {
				uploadProgress.value = null;
				await adminApi.admins.uploadAvatar(created.id, pendingPhoto.value, (value) => {
					uploadProgress.value = value;
				});
			} else {
				uploadProgress.value = null;
				await adminApi.admins.setAvatarUrl(created.id, pendingLink.value);
			}
			pendingPhoto.value = null;
			pendingLink.value = "";
		} catch (error) {
			pictureOk = false;
			pictureError.value = `The admin was saved, but the picture was not. ${apiErrorMessage(error)}`;
		} finally {
			uploading.value = false;
			uploadProgress.value = null;
		}
	}
	saving.value = false;
	if (!ok || !pictureOk) return;
	dialogOpen.value = false;
	const changedSelf =
		editing && editing.id === authStore.adminId && (form.password || form.username.trim() !== editing.username);
	if (changedSelf) {
		ElMessage.info("Your sign-in details changed. Please sign in again.");
		authStore.logout();
		router.push(Routes.HOME);
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
