<template>
	<div>
		<div class="admin-page-head">
			<div>
				<h1>Matches</h1>
				<p>Schedule fixtures, record results and fill in player scorecards.</p>
			</div>
			<div class="admin-toolbar">
				<el-select v-model="seasonId" placeholder="Choose a season" style="width: 240px" @change="loadSeason">
					<el-option v-for="season in seasons" :key="season.id" :label="season.name" :value="season.id" />
				</el-select>
				<el-select v-model="statusFilter" placeholder="All statuses" clearable style="width: 160px">
					<el-option v-for="status in MatchStatus" :key="status.id" :label="status.name" :value="status.id" />
				</el-select>
				<el-button type="primary" :disabled="!seasonId" @click="openCreate">
					<el-icon class="me-1"><Plus /></el-icon>New match
				</el-button>
				<el-button :disabled="!seasonId" @click="openMatchManager">
					<el-icon class="me-1"><VideoPlay /></el-icon>Open match manager
				</el-button>
			</div>
		</div>

		<el-empty v-if="!seasonId" description="Choose a season to manage its matches" />

		<div v-else class="admin-card">
			<el-alert
				class="mb-3"
				type="info"
				:closable="false"
				show-icon
				title="Match timing is enforced"
				description="League matches run for 15 minutes only. Eliminator, Qualifier 1, Qualifier 2 and Final run 15 minutes; a tie runs five minutes of extra time, then Golden Strike."
			/>
			<el-table :data="filteredMatches" v-loading="loading" empty-text="No matches in this season yet" stripe>
				<el-table-column prop="order" label="#" width="60" />
				<el-table-column label="Date" width="115">
					<template #default="{ row }">{{ row.scheduled_date }}</template>
				</el-table-column>
				<el-table-column label="Category" width="130">
					<template #default="{ row }">{{ categoryName(row.category) }}</template>
				</el-table-column>
				<el-table-column label="Format" min-width="175">
					<template #default="{ row }">
						<el-tag size="small" effect="plain">{{ matchFormat(row.category) }}</el-tag>
					</template>
				</el-table-column>
				<el-table-column label="Fixture" min-width="240">
					<template #default="{ row }">
						<span :class="{ 'fw-bold': row.outcome === MatchOutcome.Team1Won }">{{ teamName(row.team1) }}</span>
						<span class="text-muted mx-1">vs</span>
						<span :class="{ 'fw-bold': row.outcome === MatchOutcome.Team2Won }">{{ teamName(row.team2) }}</span>
					</template>
				</el-table-column>
				<el-table-column label="Status" width="120">
					<template #default="{ row }">
						<el-tag :type="statusTag(row.status)" size="small">{{ statusName(row.status) }}</el-tag>
					</template>
				</el-table-column>
				<el-table-column label="Result" min-width="150">
					<template #default="{ row }">{{ resultText(row) }}</template>
				</el-table-column>
				<el-table-column label="Actions" width="250" align="right" fixed="right">
					<template #default="{ row }">
						<el-tooltip :disabled="row.status !== 3" content="Played matches are locked" placement="top">
							<span>
								<el-button size="small" type="primary" plain :disabled="row.status === 3" @click="openEdit(row)">
									<el-icon class="me-1"><Edit /></el-icon>Edit
								</el-button>
							</span>
						</el-tooltip>
						<el-button size="small" class="ms-1" :disabled="!row.team1 || !row.team2" @click="openStats(row)">
							<el-icon class="me-1"><Document /></el-icon>Stats
						</el-button>
						<el-button size="small" type="danger" plain @click="remove(row)">
							<el-icon><Delete /></el-icon>
						</el-button>
					</template>
				</el-table-column>
			</el-table>
		</div>

		<el-dialog v-model="dialogOpen" :title="editingMatch ? `Edit match #${editingMatch.order}` : 'New match'" width="min(640px, 94vw)">
			<el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="admin-form-grid" @submit.prevent>
				<el-form-item label="Team 1" prop="team1">
					<el-select v-model="form.team1" clearable placeholder="Team 1">
						<el-option v-for="team in teamOptions" :key="team.id" :label="team.name" :value="team.id" />
					</el-select>
				</el-form-item>
				<el-form-item label="Team 2" prop="team2">
					<el-select v-model="form.team2" clearable placeholder="Team 2">
						<el-option v-for="team in teamOptions" :key="team.id" :label="team.name" :value="team.id" />
					</el-select>
				</el-form-item>
				<el-form-item label="Scheduled date" prop="scheduled_date">
					<el-date-picker v-model="form.scheduled_date" type="date" value-format="YYYY-MM-DD" />
				</el-form-item>
				<el-form-item v-if="!editingMatch" label="Category" prop="category">
					<el-select v-model="form.category">
						<el-option v-for="category in MatchCategory" :key="category.id" :label="category.name" :value="category.id" />
					</el-select>
				</el-form-item>
				<el-form-item v-if="!editingMatch" label="Match order" prop="order">
					<el-input-number v-model="form.order" :min="1" />
				</el-form-item>
				<el-alert
					class="span-2"
					type="warning"
					:closable="false"
					show-icon
					:title="form.category === 1 ? 'League: 15-minute regulation only.' : 'Knockout: 15-minute regulation, five-minute extra time for a tie, then Golden Strike.'"
				/>
			</el-form>
			<el-alert
				v-if="form.status === 3"
				type="warning"
				:closable="false"
				show-icon
				title="Marking a match as Played locks it. Make sure the result is correct."
			/>
			<template #footer>
				<el-button @click="dialogOpen = false">Cancel</el-button>
				<el-button type="primary" :loading="saving" @click="save">Save</el-button>
			</template>
		</el-dialog>

		<el-dialog v-model="statsOpen" :title="statsTitle" width="min(860px, 96vw)">
			<div v-loading="statsLoading">
				<el-alert
					v-if="!statsRows.length && !statsLoading"
					type="info"
					:closable="false"
					show-icon
					title="No players are on these teams' rosters for this season. Assign players on the Rosters page."
				/>
				<el-table v-else :data="statsRows" size="small">
					<el-table-column label="Player" min-width="180">
						<template #default="{ row }">
							<div>{{ row.name }}</div>
							<small class="text-muted">{{ row.team_name }}</small>
						</template>
					</el-table-column>
					<el-table-column label="Coins pocketed" width="140">
						<template #default="{ row }">
							<el-input-number v-model="row.coins_pocketed" :min="0" :max="9" size="small" />
						</template>
					</el-table-column>
					<el-table-column label="Strikers pocketed" width="140">
						<template #default="{ row }">
							<el-input-number v-model="row.strikers_pocketed" :min="0" :max="255" size="small" />
						</template>
					</el-table-column>
					<el-table-column label="Coins fined" width="140">
						<template #default="{ row }">
							<el-input-number v-model="row.coins_fined" :min="0" :max="255" size="small" />
						</template>
					</el-table-column>
					<el-table-column label="Shots taken" width="140">
						<template #default="{ row }">
							<el-input-number v-model="row.shots_taken" :min="0" :max="255" size="small" />
						</template>
					</el-table-column>
				</el-table>
			</div>
			<template #footer>
				<el-button @click="statsOpen = false">Cancel</el-button>
				<el-button type="primary" :disabled="!statsRows.length" :loading="statsSaving" @click="saveStats">
					Save scorecard
				</el-button>
			</template>
		</el-dialog>
	</div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { Delete, Document, Edit, Plus, VideoPlay } from "@element-plus/icons-vue";
import { useRouter } from "vue-router";
import { adminApi } from "@/services/adminService";
import { confirmDelete, defaultSeasonId, runAction, unwrap } from "@/utils/adminHelpers";
import { MatchCategory, MatchOutcome, MatchStatus, Routes } from "@/utils/constants";

const router = useRouter();
const seasons = ref([]);
const teams = ref([]);
const seasonId = ref(null);
const seasonTeams = ref([]);
const matches = ref([]);
const loading = ref(false);
const statusFilter = ref(null);

const teamById = computed(() => new Map(teams.value.map((team) => [team.id, team.name])));
const teamName = (id) => (id ? teamById.value.get(id) || `Team #${id}` : "TBD");
const categoryName = (id) => MatchCategory.find((item) => item.id === id)?.name || `#${id}`;
const statusName = (id) => MatchStatus.find((item) => item.id === id)?.name || `#${id}`;
const statusTag = (id) => ({ 1: "info", 2: "warning", 3: "success" })[id] || "info";
const matchFormat = (category) => {
	if (category === 1) return "15 min regulation";
	if (category === 7) return "Winner selection";
	return "15 min + 5 min if tied";
};
const openMatchManager = () => router.push({ path: Routes.FIXTURES, query: { season: seasonId.value } });

const teamOptions = computed(() => {
	const ids = new Set(seasonTeams.value.map((team) => team.team_id));
	const preferred = teams.value.filter((team) => ids.has(team.id));
	return preferred.length ? preferred : teams.value;
});

const filteredMatches = computed(() =>
	statusFilter.value ? matches.value.filter((match) => match.status === statusFilter.value) : matches.value,
);

const resultText = (match) => {
	if (match.outcome === MatchOutcome.Team1Won || match.outcome === MatchOutcome.Team2Won) {
		const winner = match.outcome === MatchOutcome.Team1Won ? match.team1 : match.team2;
		const points = match.net_points != null ? ` by ${match.net_points}` : "";
		return `${teamName(winner)} won${points}`;
	}
	return match.status === 3 ? "No result" : "–";
};

const loadSeason = async () => {
	if (!seasonId.value) return;
	loading.value = true;
	const { ok, result } = await runAction(() =>
		Promise.all([adminApi.matches.list(seasonId.value), adminApi.seasons.teams(seasonId.value)]),
	);
	if (ok) {
		matches.value = unwrap(result[0]) || [];
		seasonTeams.value = unwrap(result[1]) || [];
	}
	loading.value = false;
};

const dialogOpen = ref(false);
const saving = ref(false);
const editingMatch = ref(null);
const formRef = ref(null);
const form = reactive({});

const nextOrder = () => matches.value.reduce((max, match) => Math.max(max, match.order || 0), 0) + 1;

const rules = {
	scheduled_date: [{ required: true, message: "Pick a date", trigger: "change" }],
	category: [{ required: true, message: "Pick a category", trigger: "change" }],
	order: [{ required: true, message: "Order is required", trigger: "change" }],
	team1: [
		{
			validator: (_rule, value, callback) =>
				!value && !editingMatch.value && form.category !== 2
					? callback(new Error("Pick team 1 (only a Final can be scheduled without teams)"))
					: callback(),
			trigger: "change",
		},
	],
	team2: [
		{
			validator: (_rule, value, callback) => {
				if (value && form.team1 && value === form.team1) return callback(new Error("Pick two different teams"));
				if (!value && !editingMatch.value && form.category !== 2) {
					return callback(new Error("Pick team 2 (only a Final can be scheduled without teams)"));
				}
				return callback();
			},
			trigger: "change",
		},
	],
};

const openCreate = () => {
	editingMatch.value = null;
	const season = seasons.value.find((item) => item.id === seasonId.value);
	Object.keys(form).forEach((key) => delete form[key]);
	Object.assign(form, {
		team1: null,
		team2: null,
		scheduled_date: season?.start_date || null,
		category: 1,
		order: nextOrder(),
		status: 1,
		outcome: MatchOutcome.NotDecided,
		net_points: null,
	});
	dialogOpen.value = true;
	formRef.value?.clearValidate();
};

const openEdit = (match) => {
	editingMatch.value = match;
	Object.keys(form).forEach((key) => delete form[key]);
	Object.assign(form, {
		team1: match.team1,
		team2: match.team2,
		scheduled_date: match.scheduled_date,
		category: match.category,
	});
	dialogOpen.value = true;
	formRef.value?.clearValidate();
};

const save = async () => {
	const valid = await formRef.value.validate().catch(() => false);
	if (!valid) return;
	saving.value = true;
	const payload = { ...form };
	const { ok } = await runAction(
		() =>
			editingMatch.value
				? adminApi.matches.update(editingMatch.value.id, payload)
				: adminApi.matches.create({ ...payload, season_id: seasonId.value }),
		editingMatch.value ? "Match updated" : "Match scheduled",
	);
	saving.value = false;
	if (ok) {
		dialogOpen.value = false;
		await loadSeason();
	}
};

const remove = async (match) => {
	if (!(await confirmDelete(`match #${match.order} (${teamName(match.team1)} vs ${teamName(match.team2)})`))) return;
	const { ok } = await runAction(() => adminApi.matches.remove(match.id), "Match deleted");
	if (ok) await loadSeason();
};

const statsOpen = ref(false);
const statsLoading = ref(false);
const statsSaving = ref(false);
const statsMatch = ref(null);
const statsRows = ref([]);

const statsTitle = computed(() =>
	statsMatch.value
		? `Scorecard · ${teamName(statsMatch.value.team1)} vs ${teamName(statsMatch.value.team2)}`
		: "Scorecard",
);

const openStats = async (match) => {
	statsMatch.value = match;
	statsRows.value = [];
	statsOpen.value = true;
	statsLoading.value = true;
	const { ok, result } = await runAction(() =>
		Promise.all([adminApi.rosters.season(match.season_id), adminApi.matches.stats(match.id)]),
	);
	if (ok) {
		const roster = (unwrap(result[0])?.rosters || []).filter((item) => [match.team1, match.team2].includes(item.team_id));
		const existing = new Map((unwrap(result[1]) || []).map((stat) => [stat.player_id, stat]));
		statsRows.value = roster
			.sort((a, b) => (a.team_id === b.team_id ? 0 : a.team_id === match.team1 ? -1 : 1))
			.map((item) => {
				const stat = existing.get(item.player_id) || {};
				return {
					player_id: item.player_id,
					name: `${item.first_name} ${item.last_name}`,
					team_name: item.team_name,
					coins_pocketed: stat.coins_pocketed ?? 0,
					strikers_pocketed: stat.strikers_pocketed ?? 0,
					coins_fined: stat.coins_fined ?? 0,
					shots_taken: stat.shots_taken ?? 0,
				};
			});
	}
	statsLoading.value = false;
};

const saveStats = async () => {
	statsSaving.value = true;
	const stats = statsRows.value.map(({ player_id, coins_pocketed, strikers_pocketed, coins_fined, shots_taken }) => ({
		player_id,
		coins_pocketed: coins_pocketed ?? 0,
		strikers_pocketed: strikers_pocketed ?? 0,
		coins_fined: coins_fined ?? 0,
		shots_taken: shots_taken ?? 0,
	}));
	const { ok } = await runAction(() => adminApi.matches.saveStats(statsMatch.value.id, stats), "Scorecard saved");
	statsSaving.value = false;
	if (ok) statsOpen.value = false;
};

onMounted(async () => {
	const { ok, result } = await runAction(() => Promise.all([adminApi.seasons.list(), adminApi.teams.list()]));
	if (!ok) return;
	seasons.value = unwrap(result[0]) || [];
	teams.value = unwrap(result[1]) || [];
	if (seasons.value.length) {
		seasonId.value = defaultSeasonId(seasons.value);
		await loadSeason();
	}
});
</script>
