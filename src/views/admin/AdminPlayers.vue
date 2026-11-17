<template>
	<div>
		<div class="admin-page-head">
			<div>
				<h1>Players</h1>
				<p>Register players and keep their profiles up to date.</p>
			</div>
			<div class="admin-toolbar">
				<el-input v-model="search" placeholder="Search players" clearable style="width: 220px" :prefix-icon="Search" />
				<el-button v-if="can(Permission.PLAYERS_CREATE)" type="primary" @click="openCreate">
					<el-icon class="me-1"><Plus /></el-icon>New player
				</el-button>
			</div>
		</div>

		<div class="admin-card">
			<el-table :data="filtered" v-loading="loading" empty-text="No players yet" stripe>
				<el-table-column prop="id" label="ID" :width="isPhone ? 48 : 70" />
				<el-table-column label="Player" min-width="220">
					<template #default="{ row }">
						<div class="d-flex align-items-center gap-2">
							<EntityImage :src="row.avatar_url || ''" :name="playerName(row)" kind="player" class="admin-thumb" />
							<strong>{{ row.first_name }} {{ row.last_name }}</strong>
						</div>
					</template>
				</el-table-column>
				<el-table-column label="Date of birth" width="140">
					<template #default="{ row }">{{ row.date_of_birth || "–" }}</template>
				</el-table-column>
				<el-table-column label="Nationality" min-width="150">
					<template #default="{ row }">{{ countryName(row.nationality_id) }}</template>
				</el-table-column>
				<el-table-column
					v-if="canAny([Permission.PLAYERS_UPDATE, Permission.PLAYERS_DELETE])"
					label="Actions"
					:width="isPhone ? 112 : 170"
					align="right"
					fixed="right"
					class-name="actions-col"
				>
					<template #default="{ row }">
						<el-button v-if="can(Permission.PLAYERS_UPDATE)" size="small" type="primary" plain aria-label="Edit" @click="openEdit(row)">
							<el-icon class="me-1"><Edit /></el-icon><span class="btn-label">Edit</span>
						</el-button>
						<el-button v-if="can(Permission.PLAYERS_DELETE)" size="small" type="danger" plain aria-label="Delete" @click="remove(row)">
							<el-icon><Delete /></el-icon>
						</el-button>
					</template>
				</el-table-column>
			</el-table>
		</div>

		<el-dialog
			v-model="dialogOpen"
			:title="editingId ? 'Edit player' : 'New player'"
			width="min(600px, 94vw)"
			:close-on-click-modal="!uploadBlocked"
			:close-on-press-escape="!uploadBlocked"
			:show-close="!uploadBlocked"
			:before-close="closeDialog"
		>
			<el-alert v-if="formError" class="mb-3" type="error" show-icon :closable="false" role="alert" :title="formError" />
			<el-form novalidate ref="formRef" :model="form" :rules="rules" label-position="top" class="admin-form-grid" @submit.prevent>
				<el-form-item label="First name" prop="first_name" data-prop="first_name">
					<el-input v-model="form.first_name" />
				</el-form-item>
				<el-form-item label="Last name" prop="last_name" data-prop="last_name">
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
				<el-form-item label="Nationality" prop="nationality_id" data-prop="nationality_id">
					<el-select v-model="form.nationality_id" filterable clearable placeholder="Choose a country">
						<el-option v-for="country in countries" :key="country.id" :label="country.name" :value="country.id" />
					</el-select>
				</el-form-item>
				<el-form-item label="Country code (optional)" prop="phone_code" data-prop="phone_code">
					<el-select
						v-model="form.phone_code"
						filterable
						clearable
						placeholder="Code"
						:disabled="removePhone"
						@change="formRef?.validateField('phone_number')"
					>
						<el-option v-for="country in phoneCountries" :key="country.code" :label="country.label" :value="country.code" />
					</el-select>
				</el-form-item>
				<el-form-item
					label="Contact number (optional)"
					prop="phone_number"
					data-prop="phone_number"
					:error="phoneServerError || undefined"
				>
					<el-input
						v-model="form.phone_number"
						inputmode="numeric"
						autocomplete="off"
						placeholder="Digits only"
						:disabled="removePhone"
						@input="phoneServerError = ''"
					/>
				</el-form-item>
				<el-form-item v-if="editingId" class="span-2" data-prop="remove_phone">
					<el-checkbox v-model="removePhone">Remove the phone number on file</el-checkbox>
					<small class="field-hint">
						Leave both phone fields blank to keep the number already on file. A phone number must belong to one profile only.
					</small>
				</el-form-item>
				<el-form-item label="Profile picture" class="span-2">
					<ImageUploadField
						v-model:pending-file="pendingPhoto"
						v-model:pending-link="pendingLink"
						v-model:busy="pictureBusy"
						:src="editingAvatar"
						:name="playerName(form) || 'New player'"
						kind="player"
						label="Profile picture"
						:deferred="!editingId"
						:external-busy="uploading"
						:external-progress="uploadProgress"
						:external-error="pictureError"
						@dismiss-error="pictureError = ''"
						:upload="(file, onProgress) => adminApi.players.uploadAvatar(editingId, file, onProgress)"
						:upload-link="(url) => adminApi.players.setAvatarUrl(editingId, url)"
						:remove="() => adminApi.players.removeAvatar(editingId)"
						@changed="pictureChanged"
					/>
				</el-form-item>
			</el-form>
			<template #footer>
				<el-button :disabled="uploadBlocked" @click="dialogOpen = false">Cancel</el-button>
				<el-button type="primary" :loading="saving" :disabled="saving || pictureBusy" @click="save">Save</el-button>
			</template>
		</el-dialog>
	</div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { Delete, Edit, Plus, Search } from "@element-plus/icons-vue";
import { adminApi, apiErrorMessage } from "@/services/adminService";
import { blankToNull, confirmDelete, matchesSearch, runAction, unwrap } from "@/utils/adminHelpers";
import { useIsPhone } from "@/utils/viewport";
import { usePermissions } from "@/utils/permissions";
import { playerName } from "@/utils/media";
import { usePlayerStore } from "@/store/playerStore";
import { notify } from "@/utils/notify";
import { optionalContactError } from "@/utils/contactNumber";
import { validateForm } from "@/utils/formValidation";
import EntityImage from "@/components/EntityImage.vue";
import ImageUploadField from "@/components/admin/ImageUploadField.vue";

const isPhone = useIsPhone();
const { Permission, can, canAny } = usePermissions();
const playerStore = usePlayerStore();

const players = ref([]);
const countries = ref([]);
const loading = ref(false);
const search = ref("");

const countryById = computed(() => new Map(countries.value.map((country) => [country.id, country.name])));
const countryName = (id) => (id ? countryById.value.get(id) || `#${id}` : "–");

const filtered = computed(() =>
	players.value.filter((player) =>
		matchesSearch(search.value, player.first_name, player.last_name, `${player.first_name} ${player.last_name}`, player.id),
	),
);

const load = async () => {
	loading.value = true;
	const { ok, result } = await runAction(() => Promise.all([adminApi.players.list(), adminApi.countries.list()]));
	if (ok) {
		players.value = unwrap(result[0]) || [];
		countries.value = unwrap(result[1]) || [];
	}
	loading.value = false;
};

const dialogOpen = ref(false);
const saving = ref(false);
const editingId = ref(null);
const formRef = ref(null);
const formError = ref("");
const removePhone = ref(false);
const phoneServerError = ref("");
const emptyForm = () => ({
	first_name: "",
	last_name: "",
	date_of_birth: null,
	nationality_id: null,
	phone_code: "",
	phone_number: "",
});
const form = reactive(emptyForm());
const phoneCountries = computed(() =>
	countries.value
		.filter((country) => country.phone_code)
		.map((country) => ({ code: country.phone_code, label: `${country.name} (${country.phone_code})` })),
);
const editingAvatar = ref("");
const pendingPhoto = ref(null);
const pendingLink = ref("");
const pictureBusy = ref(false);
const uploading = ref(false);
const uploadProgress = ref(null);
const pictureError = ref("");
const uploadBlocked = computed(() => pictureBusy.value || uploading.value || Boolean(pictureError.value));
const closeDialog = (done) => {
	if (!uploadBlocked.value) done();
};

const rules = {
	first_name: [{ required: true, whitespace: true, message: "First name is required", trigger: "blur" }],
	last_name: [{ required: true, whitespace: true, message: "Last name is required", trigger: "blur" }],
	phone_number: [
		{
			// Optional. Only a typed number is checked, and it needs a country code.
			validator: (_rule, value, callback) => {
				if (removePhone.value) return callback();
				const problem = optionalContactError((value || "").trim(), form.phone_code || null);
				return problem ? callback(new Error(problem)) : callback();
			},
			trigger: "blur",
		},
	],
};

const openCreate = () => {
	editingId.value = null;
	editingAvatar.value = "";
	pendingPhoto.value = null;
	pendingLink.value = "";
	pictureError.value = "";
	formError.value = "";
	phoneServerError.value = "";
	removePhone.value = false;
	Object.assign(form, emptyForm());
	dialogOpen.value = true;
	formRef.value?.clearValidate();
};

const openEdit = (player) => {
	editingId.value = player.id;
	editingAvatar.value = player.avatar_url || "";
	pendingPhoto.value = null;
	pendingLink.value = "";
	pictureError.value = "";
	formError.value = "";
	phoneServerError.value = "";
	removePhone.value = false;
	Object.assign(form, {
		...emptyForm(),
		first_name: player.first_name,
		last_name: player.last_name,
		date_of_birth: player.date_of_birth,
		nationality_id: player.nationality_id,
	});
	dialogOpen.value = true;
	formRef.value?.clearValidate();
};

const refreshPublicPlayers = () => {
	playerStore.loaded = false;
	playerStore.profilesLoaded = false;
};

const pictureChanged = (player) => {
	editingAvatar.value = player?.avatar_url || "";
	const row = players.value.find((item) => item.id === editingId.value);
	if (row) row.avatar_url = editingAvatar.value || null;
	refreshPublicPlayers();
};

const save = async () => {
	if (saving.value) return;
	const check = await validateForm(formRef);
	if (!check.valid) return;
	saving.value = true;
	pictureError.value = "";
	formError.value = "";
	phoneServerError.value = "";
	const payload = blankToNull({
		first_name: form.first_name.trim(),
		last_name: form.last_name.trim(),
		date_of_birth: form.date_of_birth,
		nationality_id: form.nationality_id,
	});
	// The phone keys are sent only when they mean something. An absent key keeps the number on file.
	// An explicit null clears it, which is what the remove checkbox sends.
	if (editingId.value && removePhone.value) {
		payload.phone_code = null;
		payload.phone_number = null;
	} else if (form.phone_number.trim()) {
		payload.phone_code = form.phone_code;
		payload.phone_number = form.phone_number.trim();
	}
	const wasNew = !editingId.value;
	let result;
	try {
		result = await (editingId.value ? adminApi.players.update(editingId.value, payload) : adminApi.players.create(payload));
	} catch (error) {
		saving.value = false;
		if (error?.httpStatus === 409 && /phone/i.test(error.message || "")) {
			phoneServerError.value = error.message;
		} else {
			formError.value = apiErrorMessage(error);
		}
		return;
	}
	notify.success(wasNew ? "Player created" : "Player updated");
	let pictureOk = true;
	if (wasNew && (pendingPhoto.value || pendingLink.value)) {
		const created = unwrap(result);
		editingId.value = created.id;
		uploading.value = true;
		try {
			if (pendingPhoto.value) {
				uploadProgress.value = null;
				await adminApi.players.uploadAvatar(created.id, pendingPhoto.value, (value) => {
					uploadProgress.value = value;
				});
			} else {
				uploadProgress.value = null;
				await adminApi.players.setAvatarUrl(created.id, pendingLink.value);
			}
			pendingPhoto.value = null;
			pendingLink.value = "";
		} catch (error) {
			pictureOk = false;
			pictureError.value = `The player was saved, but the picture was not. ${apiErrorMessage(error)}`;
		} finally {
			uploading.value = false;
			uploadProgress.value = null;
		}
	}
	saving.value = false;
	if (pictureOk) {
		dialogOpen.value = false;
		refreshPublicPlayers();
		await load();
	}
};

const remove = async (player) => {
	if (!(await confirmDelete(`player "${player.first_name} ${player.last_name}"`))) return;
	const { ok } = await runAction(() => adminApi.players.remove(player.id), "Player deleted");
	if (ok) await load();
};

onMounted(load);
</script>
