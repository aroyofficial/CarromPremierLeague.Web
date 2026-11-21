<template>
	<div class="admin-page">
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

		<div class="admin-card admin-table-card">
			<div class="admin-table-fill">
			<el-table height="100%" :data="filtered" v-loading="loading" empty-text="No seasons yet" stripe>
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
					v-if="canAny([Permission.SEASONS_TEAMS, Permission.SEASONS_UPDATE, Permission.SEASONS_DELETE, Permission.MATCHES_CREATE])"
					label="Actions"
					:width="isPhone ? 210 : 400"
					align="right"
					fixed="right"
					class-name="actions-col"
				>
					<template #default="{ row }">
						<el-button
							v-if="can(Permission.MATCHES_CREATE) && actionFor(row)"
							size="small"
							type="success"
							plain
							:aria-label="actionFor(row) === 'reschedule' ? 'Reschedule matches' : 'Schedule matches'"
							:loading="schedulingId === row.id"
							@click="schedule(row)"
						>
							<el-icon class="me-1"><Calendar /></el-icon>
							<span class="btn-label">{{ actionFor(row) === "reschedule" ? "Reschedule" : "Schedule" }}</span>
						</el-button>
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
		</div>

		<el-dialog v-model="dialogOpen" :title="editingId ? 'Edit season' : 'New season'" width="min(560px, 94vw)">
			<el-form novalidate ref="formRef" :model="form" :rules="rules" label-position="top" class="admin-form-grid" @submit.prevent>
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
							<EntityImage :src="row.logo_url || ''" :name="row.team_name" kind="team" class="admin-thumb" />
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
import { ElMessageBox } from "element-plus";
import { Calendar, Delete, Edit, Flag, Plus, Search } from "@element-plus/icons-vue";
import { adminApi } from "@/services/adminService";
import { blankToNull, confirmDelete, matchesSearch, runAction, unwrap } from "@/utils/adminHelpers";
import { useIsPhone } from "@/utils/viewport";
import { usePermissions } from "@/utils/permissions";
import EntityImage from "@/components/EntityImage.vue";
import { areas } from "@/utils/realtimeRules";
import { settlePageLoader } from "@/utils/common";
import { useAdminLive } from "@/utils/useLive";
import { isSeasonUpcoming } from "@/utils/season";
import { scheduleButton } from "@/utils/seasonSchedule";

const isPhone = useIsPhone();
const { Permission, can, canAny } = usePermissions();
import { useSeasonStore } from "@/store/seasonStore";

const seasonStore = useSeasonStore();

const seasons = ref([]);
const teams = ref([]);
const seasonFacts = ref({});
const loading = ref(false);
const search = ref("");
const schedulingId = ref(null);

const actionFor = (season) => {
	const facts = seasonFacts.value[season.id];
	if (!facts) return null;
	return scheduleButton(facts.teams, isSeasonUpcoming(season), facts.matches);
};

const loadFacts = async (seasonList) => {
	const entries = await Promise.all(
		seasonList.map(async (season) => {
			const [teamResponse, matchResponse] = await Promise.all([
				adminApi.seasons.teams(season.id),
				adminApi.matches.list(season.id),
			]);
			return [season.id, { teams: (unwrap(teamResponse) || []).length, matches: (unwrap(matchResponse) || []).length }];
		}),
	);
	seasonFacts.value = Object.fromEntries(entries);
};

const filtered = computed(() => seasons.value.filter((season) => matchesSearch(search.value, season.name, season.id)));

const load = async () => {
	loading.value = true;
	const { ok, result } = await runAction(() => Promise.all([adminApi.seasons.list(), adminApi.teams.list()]));
	if (ok) {
		seasons.value = unwrap(result[0]) || [];
		teams.value = unwrap(result[1]) || [];
		await loadFacts(seasons.value);
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

const schedule = async (season) => {
	const action = actionFor(season);
	if (!action || schedulingId.value) return;
	const reschedule = action === "reschedule";
	const confirmed = await ElMessageBox.confirm(
		reschedule
			? `Reschedule ${season.name}? Scheduled matches that have not started are deleted and the league is built again. Matches in progress or already played stay.`
			: `Schedule every league match for ${season.name}? Each pair of teams plays once.`,
		reschedule ? "Reschedule matches" : "Schedule matches",
		{
			confirmButtonText: reschedule ? "Reschedule" : "Schedule",
			cancelButtonText: "Cancel",
			type: "warning",
		},
	)
		.then(() => true)
		.catch(() => false);
	if (!confirmed) return;
	schedulingId.value = season.id;
	const { ok } = await runAction(
		() => adminApi.seasons.schedule(season.id),
		reschedule ? "League matches rescheduled" : "League matches scheduled",
	);
	schedulingId.value = null;
	if (ok) await load();
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
	if (ok && teamsSeason.value) {
		const current = seasonFacts.value[teamsSeason.value.id] || { teams: 0, matches: 0 };
		seasonFacts.value = {
			...seasonFacts.value,
			[teamsSeason.value.id]: { ...current, teams: seasonTeams.value.length },
		};
	}
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

useAdminLive(
	async () => {
		if (loading.value) return;
		try {
			const [seasonList, teamList] = await Promise.all([adminApi.seasons.list(), adminApi.teams.list()]);
			seasons.value = unwrap(seasonList) || [];
			teams.value = unwrap(teamList) || [];
			await loadFacts(seasons.value);
			if (teamsOpen.value && teamsSeason.value && !teamsLoading.value && !teamsSaving.value) {
				const shown = teamsSeason.value.id;
				const linked = unwrap(await adminApi.seasons.teams(shown)) || [];
				if (teamsOpen.value && teamsSeason.value?.id === shown) seasonTeams.value = linked;
			}
		} catch (error) {
			console.error("Failed to refresh seasons", error);
		}
	},
	{ areas: areas.adminSeasons },
);

onMounted(() => settlePageLoader(load));
</script>
