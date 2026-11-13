<template>
	<div>
		<div class="admin-page-head">
			<div>
				<h1>Seasons</h1>
				<p>Create seasons, set their dates and visibility, and choose the teams that take part.</p>
			</div>
			<div class="admin-toolbar">
				<el-input v-model="search" placeholder="Search seasons" clearable style="width: 220px" :prefix-icon="Search" />
				<el-button v-if="can(Permission.SEASONS_CREATE)" type="primary" @click="openCreate">
					<el-icon class="me-1"><Plus /></el-icon>New season
				</el-button>
			</div>
		</div>

		<div class="admin-card">
			<el-table :data="filtered" v-loading="loading" empty-text="No seasons yet" stripe>
				<el-table-column prop="id" label="ID" :width="isPhone ? 48 : 70" />
				<el-table-column prop="name" label="Name" min-width="180" />
				<el-table-column label="Start" width="120">
					<template #default="{ row }">{{ row.start_date || "–" }}</template>
				</el-table-column>
				<el-table-column label="End" width="120">
					<template #default="{ row }">{{ row.end_date || "–" }}</template>
				</el-table-column>
				<el-table-column label="Public" width="100">
					<template #default="{ row }">
						<el-tag :type="row.show ? 'success' : 'info'" size="small">{{ row.show ? "Visible" : "Hidden" }}</el-tag>
					</template>
				</el-table-column>
				<el-table-column
					v-if="canAny([Permission.SEASONS_TEAMS, Permission.SEASONS_UPDATE, Permission.SEASONS_DELETE])"
					label="Actions"
					:width="isPhone ? 160 : 270"
					align="right"
					fixed="right"
					class-name="actions-col"
				>
					<template #default="{ row }">
						<el-button v-if="can(Permission.SEASONS_TEAMS)" size="small" aria-label="Teams" @click="openTeams(row)">
							<el-icon class="me-1"><Flag /></el-icon><span class="btn-label">Teams</span>
						</el-button>
						<el-button v-if="can(Permission.SEASONS_UPDATE)" size="small" type="primary" plain aria-label="Edit" @click="openEdit(row)">
							<el-icon class="me-1"><Edit /></el-icon><span class="btn-label">Edit</span>
						</el-button>
						<el-button v-if="can(Permission.SEASONS_DELETE)" size="small" type="danger" plain aria-label="Delete" @click="remove(row)">
							<el-icon><Delete /></el-icon>
						</el-button>
					</template>
				</el-table-column>
			</el-table>
		</div>

		<el-dialog v-model="dialogOpen" :title="editingId ? 'Edit season' : 'New season'" width="min(560px, 94vw)">
			<el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="admin-form-grid" @submit.prevent>
				<el-form-item label="Name" prop="name" class="span-2">
					<el-input v-model="form.name" placeholder="e.g. 2027 Season 1" />
				</el-form-item>
				<el-form-item label="Start date" prop="start_date">
					<el-date-picker v-model="form.start_date" type="date" value-format="YYYY-MM-DD" placeholder="Pick a date" />
				</el-form-item>
				<el-form-item label="End date" prop="end_date">
					<el-date-picker v-model="form.end_date" type="date" value-format="YYYY-MM-DD" placeholder="Pick a date" />
				</el-form-item>
				<el-form-item label="Show on public site" class="span-2">
					<el-switch v-model="form.show" active-text="Visible" inactive-text="Hidden" />
				</el-form-item>
			</el-form>
			<template #footer>
				<el-button @click="dialogOpen = false">Cancel</el-button>
				<el-button type="primary" :loading="saving" @click="save">Save</el-button>
			</template>
		</el-dialog>

		<el-drawer v-model="teamsOpen" :title="`Teams in ${teamsSeason?.name || ''}`" size="min(460px, 96vw)">
			<div class="admin-toolbar mb-3">
				<el-select v-model="teamToAdd" placeholder="Choose a team to add" filterable style="flex: 1">
					<el-option v-for="team in availableTeams" :key="team.id" :label="team.name" :value="team.id" />
				</el-select>
				<el-button type="primary" :disabled="!teamToAdd" :loading="teamsSaving" @click="addTeam">
					<el-icon class="me-1"><Plus /></el-icon>Add
				</el-button>
			</div>
			<el-table :data="seasonTeams" v-loading="teamsLoading" empty-text="No teams in this season yet">
				<el-table-column label="Team" min-width="180">
					<template #default="{ row }">
						<div class="d-flex align-items-center gap-2">
							<img v-if="row.logo_url" :src="assetUrl(row.logo_url)" class="admin-thumb" alt="" />
							<span>{{ row.team_name }}</span>
						</div>
					</template>
				</el-table-column>
				<el-table-column width="90" align="right">
					<template #default="{ row }">
						<el-button size="small" type="danger" plain @click="removeTeam(row)">Remove</el-button>
					</template>
				</el-table-column>
			</el-table>
		</el-drawer>
	</div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { Delete, Edit, Flag, Plus, Search } from "@element-plus/icons-vue";
import { adminApi } from "@/services/adminService";
import { assetUrl, blankToNull, confirmDelete, matchesSearch, runAction, unwrap } from "@/utils/adminHelpers";
import { useIsPhone } from "@/utils/viewport";
import { usePermissions } from "@/utils/permissions";

const isPhone = useIsPhone();
const { Permission, can, canAny } = usePermissions();
import { useSeasonStore } from "@/store/seasonStore";

const seasonStore = useSeasonStore();

const seasons = ref([]);
const teams = ref([]);
const loading = ref(false);
const search = ref("");

const filtered = computed(() => seasons.value.filter((season) => matchesSearch(search.value, season.name, season.id)));

const load = async () => {
	loading.value = true;
	const { ok, result } = await runAction(() => Promise.all([adminApi.seasons.list(), adminApi.teams.list()]));
	if (ok) {
		seasons.value = unwrap(result[0]) || [];
		teams.value = unwrap(result[1]) || [];
	}
	loading.value = false;
};

const refreshPublicSeasons = () => {
	seasonStore.seasons = [];
};

const dialogOpen = ref(false);
const saving = ref(false);
const editingId = ref(null);
const formRef = ref(null);
const emptyForm = () => ({ name: "", start_date: null, end_date: null, show: true });
const form = reactive(emptyForm());

const rules = {
	name: [
		{ required: true, message: "Name is required", trigger: "blur" },
		{ min: 3, max: 255, message: "Use 3 to 255 characters", trigger: "blur" },
	],
	end_date: [
		{
			validator: (_rule, value, callback) =>
				value && form.start_date && value < form.start_date
					? callback(new Error("End date cannot be before the start date"))
					: callback(),
			trigger: "change",
		},
	],
};

const openCreate = () => {
	editingId.value = null;
	Object.assign(form, emptyForm());
	dialogOpen.value = true;
	formRef.value?.clearValidate();
};

const openEdit = (season) => {
	editingId.value = season.id;
	Object.assign(form, {
		name: season.name,
		start_date: season.start_date,
		end_date: season.end_date,
		show: season.show,
	});
	dialogOpen.value = true;
	formRef.value?.clearValidate();
};

const save = async () => {
	const valid = await formRef.value.validate().catch(() => false);
	if (!valid) return;
	saving.value = true;
	const payload = blankToNull({ ...form, name: form.name.trim() });
	const { ok } = await runAction(
		() => (editingId.value ? adminApi.seasons.update(editingId.value, payload) : adminApi.seasons.create(payload)),
		editingId.value ? "Season updated" : "Season created",
	);
	saving.value = false;
	if (ok) {
		dialogOpen.value = false;
		refreshPublicSeasons();
		await load();
	}
};

const remove = async (season) => {
	if (!(await confirmDelete(`season "${season.name}"`))) return;
	const { ok } = await runAction(() => adminApi.seasons.remove(season.id), "Season deleted");
	if (ok) {
		refreshPublicSeasons();
		await load();
	}
};

const teamsOpen = ref(false);
const teamsSeason = ref(null);
const seasonTeams = ref([]);
const teamsLoading = ref(false);
const teamsSaving = ref(false);
const teamToAdd = ref(null);

const availableTeams = computed(() => {
	const taken = new Set(seasonTeams.value.map((team) => team.team_id));
	return teams.value.filter((team) => !taken.has(team.id));
});

const loadSeasonTeams = async () => {
	teamsLoading.value = true;
	const { ok, result } = await runAction(() => adminApi.seasons.teams(teamsSeason.value.id));
	seasonTeams.value = ok ? unwrap(result) || [] : [];
	teamsLoading.value = false;
};

const openTeams = async (season) => {
	teamsSeason.value = season;
	teamToAdd.value = null;
	teamsOpen.value = true;
	await loadSeasonTeams();
};

const addTeam = async () => {
	teamsSaving.value = true;
	const { ok, result } = await runAction(
		() => adminApi.seasons.addTeam(teamsSeason.value.id, teamToAdd.value),
		"Team added to season",
	);
	teamsSaving.value = false;
	if (ok) {
		seasonTeams.value = unwrap(result) || [];
		teamToAdd.value = null;
	}
};

const removeTeam = async (team) => {
	if (!(await confirmDelete(`${team.team_name} from ${teamsSeason.value.name}`))) return;
	const { ok } = await runAction(
		() => adminApi.seasons.removeTeam(teamsSeason.value.id, team.team_id),
		"Team removed from season",
	);
	if (ok) await loadSeasonTeams();
};

onMounted(load);
</script>
