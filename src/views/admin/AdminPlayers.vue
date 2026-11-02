<template>
	<div>
		<div class="admin-page-head">
			<div>
				<h1>Players</h1>
				<p>Register players and keep their profiles up to date.</p>
			</div>
			<div class="admin-toolbar">
				<el-input v-model="search" placeholder="Search players" clearable style="width: 220px" :prefix-icon="Search" />
				<el-button type="primary" @click="openCreate">
					<el-icon class="me-1"><Plus /></el-icon>New player
				</el-button>
			</div>
		</div>

		<div class="admin-card">
			<el-table :data="filtered" v-loading="loading" empty-text="No players yet" stripe>
				<el-table-column prop="id" label="ID" width="70" />
				<el-table-column label="Player" min-width="220">
					<template #default="{ row }">
						<div class="d-flex align-items-center gap-2">
							<img v-if="row.avatar_url" :src="assetUrl(row.avatar_url)" class="admin-thumb" alt="" />
							<el-avatar v-else :size="36">{{ row.first_name.charAt(0) }}{{ row.last_name.charAt(0) }}</el-avatar>
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
				<el-table-column label="Actions" width="170" align="right" fixed="right">
					<template #default="{ row }">
						<el-button size="small" type="primary" plain @click="openEdit(row)">
							<el-icon class="me-1"><Edit /></el-icon>Edit
						</el-button>
						<el-button size="small" type="danger" plain @click="remove(row)">
							<el-icon><Delete /></el-icon>
						</el-button>
					</template>
				</el-table-column>
			</el-table>
		</div>

		<el-dialog v-model="dialogOpen" :title="editingId ? 'Edit player' : 'New player'" width="min(600px, 94vw)">
			<el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="admin-form-grid" @submit.prevent>
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
				<el-form-item label="Nationality" prop="nationality_id">
					<el-select v-model="form.nationality_id" filterable clearable placeholder="Choose a country">
						<el-option v-for="country in countries" :key="country.id" :label="country.name" :value="country.id" />
					</el-select>
				</el-form-item>
				<el-form-item label="Avatar URL" prop="avatar_url" class="span-2">
					<el-input v-model="form.avatar_url" placeholder="https://… (optional)" />
				</el-form-item>
			</el-form>
			<template #footer>
				<el-button @click="dialogOpen = false">Cancel</el-button>
				<el-button type="primary" :loading="saving" @click="save">Save</el-button>
			</template>
		</el-dialog>
	</div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { Delete, Edit, Plus, Search } from "@element-plus/icons-vue";
import { adminApi } from "@/services/adminService";
import { assetUrl, blankToNull, confirmDelete, matchesSearch, runAction, unwrap } from "@/utils/adminHelpers";

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
const emptyForm = () => ({ first_name: "", last_name: "", date_of_birth: null, nationality_id: null, avatar_url: "" });
const form = reactive(emptyForm());

const rules = {
	first_name: [{ required: true, whitespace: true, message: "First name is required", trigger: "blur" }],
	last_name: [{ required: true, whitespace: true, message: "Last name is required", trigger: "blur" }],
	avatar_url: [{ type: "url", message: "Enter a full URL starting with http:// or https://", trigger: "blur" }],
};

const openCreate = () => {
	editingId.value = null;
	Object.assign(form, emptyForm());
	dialogOpen.value = true;
	formRef.value?.clearValidate();
};

const openEdit = (player) => {
	editingId.value = player.id;
	Object.assign(form, {
		first_name: player.first_name,
		last_name: player.last_name,
		date_of_birth: player.date_of_birth,
		nationality_id: player.nationality_id,
		avatar_url: /^https?:\/\//i.test(player.avatar_url || "") ? player.avatar_url : "",
	});
	dialogOpen.value = true;
	formRef.value?.clearValidate();
};

const save = async () => {
	const valid = await formRef.value.validate().catch(() => false);
	if (!valid) return;
	saving.value = true;
	const payload = blankToNull({ ...form, first_name: form.first_name.trim(), last_name: form.last_name.trim() });
	if (editingId.value && payload.avatar_url === null) delete payload.avatar_url;
	const { ok } = await runAction(
		() => (editingId.value ? adminApi.players.update(editingId.value, payload) : adminApi.players.create(payload)),
		editingId.value ? "Player updated" : "Player created",
	);
	saving.value = false;
	if (ok) {
		dialogOpen.value = false;
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
