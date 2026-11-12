<template>
	<div>
		<div class="admin-page-head">
			<div>
				<h1>Teams</h1>
				<p>Add franchises, update their slogans and logos, or retire them.</p>
			</div>
			<div class="admin-toolbar">
				<el-input v-model="search" placeholder="Search teams" clearable style="width: 220px" :prefix-icon="Search" />
				<el-button type="primary" @click="openCreate">
					<el-icon class="me-1"><Plus /></el-icon>New team
				</el-button>
			</div>
		</div>

		<div class="admin-card">
			<el-table :data="filtered" v-loading="loading" empty-text="No teams yet" stripe>
				<el-table-column prop="id" label="ID" :width="isPhone ? 48 : 70" />
				<el-table-column label="Team" min-width="220">
					<template #default="{ row }">
						<div class="d-flex align-items-center gap-2">
							<img v-if="row.logo_url" :src="assetUrl(row.logo_url)" class="admin-thumb" alt="" />
							<el-avatar v-else :size="36">{{ row.name.charAt(0) }}</el-avatar>
							<strong>{{ row.name }}</strong>
						</div>
					</template>
				</el-table-column>
				<el-table-column label="Slogan" min-width="200">
					<template #default="{ row }">{{ row.slogan || "–" }}</template>
				</el-table-column>
				<el-table-column label="Actions" :width="isPhone ? 112 : 170" align="right" fixed="right" class-name="actions-col">
					<template #default="{ row }">
						<el-button size="small" type="primary" plain aria-label="Edit" @click="openEdit(row)">
							<el-icon class="me-1"><Edit /></el-icon><span class="btn-label">Edit</span>
						</el-button>
						<el-button size="small" type="danger" plain aria-label="Delete" @click="remove(row)">
							<el-icon><Delete /></el-icon>
						</el-button>
					</template>
				</el-table-column>
			</el-table>
		</div>

		<el-dialog v-model="dialogOpen" :title="editingId ? 'Edit team' : 'New team'" width="min(560px, 94vw)">
			<el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
				<el-form-item label="Name" prop="name">
					<el-input v-model="form.name" placeholder="e.g. Dum Dum Diamonds" />
				</el-form-item>
				<el-form-item label="Slogan" prop="slogan">
					<el-input v-model="form.slogan" placeholder="Optional" maxlength="500" show-word-limit />
				</el-form-item>
				<el-form-item label="Logo URL" prop="logo_url">
					<el-input v-model="form.logo_url" placeholder="https://… or public/assets/images/teams/…" />
				</el-form-item>
				<div v-if="form.logo_url" class="d-flex align-items-center gap-2">
					<img :src="assetUrl(form.logo_url)" class="logo-preview" alt="Logo preview" />
					<small class="text-muted">Preview</small>
				</div>
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
import { useIsPhone } from "@/utils/viewport";

const isPhone = useIsPhone();
import { useTeamStore } from "@/store/teamStore";

const teamStore = useTeamStore();
const teams = ref([]);
const loading = ref(false);
const search = ref("");

const filtered = computed(() => teams.value.filter((team) => matchesSearch(search.value, team.name, team.slogan, team.id)));

const load = async () => {
	loading.value = true;
	const { ok, result } = await runAction(() => adminApi.teams.list());
	teams.value = ok ? unwrap(result) || [] : [];
	loading.value = false;
};

const dialogOpen = ref(false);
const saving = ref(false);
const editingId = ref(null);
const formRef = ref(null);
const emptyForm = () => ({ name: "", slogan: "", logo_url: "" });
const form = reactive(emptyForm());

const rules = {
	name: [
		{ required: true, message: "Name is required", trigger: "blur" },
		{ max: 255, message: "Use at most 255 characters", trigger: "blur" },
	],
};

const openCreate = () => {
	editingId.value = null;
	Object.assign(form, emptyForm());
	dialogOpen.value = true;
	formRef.value?.clearValidate();
};

const openEdit = (team) => {
	editingId.value = team.id;
	Object.assign(form, { name: team.name, slogan: team.slogan || "", logo_url: team.logo_url || "" });
	dialogOpen.value = true;
	formRef.value?.clearValidate();
};

const save = async () => {
	const valid = await formRef.value.validate().catch(() => false);
	if (!valid) return;
	saving.value = true;
	const payload = blankToNull({ ...form, name: form.name.trim() });
	const { ok } = await runAction(
		() => (editingId.value ? adminApi.teams.update(editingId.value, payload) : adminApi.teams.create(payload)),
		editingId.value ? "Team updated" : "Team created",
	);
	saving.value = false;
	if (ok) {
		dialogOpen.value = false;
		teamStore.teams = [];
		await load();
	}
};

const remove = async (team) => {
	if (!(await confirmDelete(`team "${team.name}"`))) return;
	const { ok } = await runAction(() => adminApi.teams.remove(team.id), "Team deleted");
	if (ok) {
		teamStore.teams = [];
		await load();
	}
};

onMounted(load);
</script>

<style scoped>
.logo-preview {
	width: 56px;
	height: 56px;
	border-radius: 50%;
	object-fit: cover;
	border: 1px solid var(--cpl-line);
}
</style>
