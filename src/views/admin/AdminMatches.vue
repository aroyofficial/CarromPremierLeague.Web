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
						<el-button size="small" type="primary" plain @click="openEdit(row)">
							<el-icon class="me-1"><Edit /></el-icon>Edit
						</el-button>
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

		<el-dialog v-model="dialogOpen" :title="editingMatch ? `Edit match #${editingMatch.order}` : 'New match'" width="min(1080px, 96vw)">
			<el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="admin-form-grid" @submit.prevent>
				<el-form-item label="Team 1" prop="team1">
					<el-select v-model="form.team1" clearable placeholder="Team 1" :disabled="playedLocked">
						<el-option v-for="team in teamOptions" :key="team.id" :label="team.name" :value="team.id" />
					</el-select>
				</el-form-item>
				<el-form-item label="Team 2" prop="team2">
					<el-select v-model="form.team2" clearable placeholder="Team 2" :disabled="playedLocked">
						<el-option v-for="team in teamOptions" :key="team.id" :label="team.name" :value="team.id" />
					</el-select>
				</el-form-item>
				<el-form-item label="Scheduled date" prop="scheduled_date">
					<el-date-picker v-model="form.scheduled_date" type="date" value-format="YYYY-MM-DD" :disabled="playedLocked" />
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
			<div v-if="editingMatch" class="span-2 scorecard-editor">
				<h2>Player metrics</h2>
				<div v-loading="editScoreLoading">
					<el-alert
						v-if="!editScoreRows.length && !editScoreLoading"
						type="info"
						:closable="false"
						show-icon
						title="No players are on these teams' rosters for this season."
					/>
					<el-table v-else :data="editScoreRows" size="small">
						<el-table-column label="Player" min-width="180">
							<template #default="{ row }">
								<div>{{ row.name }}</div>
								<small class="text-muted">{{ row.team_name }}</small>
							</template>
						</el-table-column>
						<el-table-column label="Own coins" width="140">
							<template #default="{ row }"><el-input-number v-model="row.coins_pocketed" :min="bounds(editScoreRows, row).ownMin" :max="bounds(editScoreRows, row).ownMax" size="small" /></template>
						</el-table-column>
						<el-table-column label="Opponent coins" width="150">
							<template #default="{ row }"><el-input-number v-model="row.opponent_coins_pocketed" :min="bounds(editScoreRows, row).opponentMin" :max="bounds(editScoreRows, row).opponentMax" size="small" /></template>
						</el-table-column>
						<el-table-column label="Single fines" width="140">
							<template #default="{ row }"><el-input-number v-model="row.single_fines" :min="0" :max="255" size="small" /></template>
						</el-table-column>
						<el-table-column label="Double fines" width="140">
							<template #default="{ row }"><el-input-number v-model="row.double_fines" :min="0" :max="255" size="small" /></template>
						</el-table-column>
						<el-table-column label="Strikers" width="130">
							<template #default="{ row }"><el-input-number v-model="row.strikers_pocketed" :min="0" :max="255" size="small" /></template>
						</el-table-column>
					</el-table>
				</div>
			</div>
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

		<el-dialog v-model="statsOpen" :title="statsTitle" width="min(1080px, 96vw)">
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
					<el-table-column label="Own coins" width="140">
						<template #default="{ row }"><el-input-number v-model="row.coins_pocketed" :min="bounds(statsRows, row).ownMin" :max="bounds(statsRows, row).ownMax" size="small" /></template>
					</el-table-column>
					<el-table-column label="Opponent coins" width="150">
						<template #default="{ row }"><el-input-number v-model="row.opponent_coins_pocketed" :min="bounds(statsRows, row).opponentMin" :max="bounds(statsRows, row).opponentMax" size="small" /></template>
					</el-table-column>
					<el-table-column label="Single fines" width="140">
						<template #default="{ row }"><el-input-number v-model="row.single_fines" :min="0" :max="255" size="small" /></template>
					</el-table-column>
					<el-table-column label="Double fines" width="140">
						<template #default="{ row }"><el-input-number v-model="row.double_fines" :min="0" :max="255" size="small" /></template>
					</el-table-column>
					<el-table-column label="Strikers" width="130">
						<template #default="{ row }"><el-input-number v-model="row.strikers_pocketed" :min="0" :max="255" size="small" /></template>
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
import { computed, onMounted, reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { Delete, Document, Edit, Plus, VideoPlay } from "@element-plus/icons-vue";
import { useRouter } from "vue-router";
import { adminApi } from "@/services/adminService";
import { confirmDelete, defaultSeasonId, runAction, unwrap } from "@/utils/adminHelpers";
import { MatchCategory, MatchOutcome, MatchStatus, Routes } from "@/utils/constants";
import { coinBounds } from "@/utils/coinLimits";

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
const editScoreRows = ref([]);
const editScoreLoading = ref(false);
const seasonRoster = ref([]);
const playedLocked = computed(() => editingMatch.value?.status === 3);

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
	editScoreRows.value = [];
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

const metricRows = (match, roster, existingStats) => {
	const existing = new Map((existingStats || []).map((stat) => [stat.player_id, stat]));
	return roster
		.filter((item) => [match.team1, match.team2].includes(item.team_id))
		.sort((left, right) => (left.team_id === right.team_id ? 0 : left.team_id === match.team1 ? -1 : 1))
		.map((item) => {
			const stat = existing.get(item.player_id) || {};
			return {
				player_id: item.player_id,
				team_id: item.team_id,
				name: `${item.first_name} ${item.last_name}`,
				team_name: item.team_name,
				coins_pocketed: stat.coins_pocketed ?? 0,
				opponent_coins_pocketed: stat.opponent_coins_pocketed ?? 0,
				single_fines: stat.single_fines || (!stat.double_fines ? stat.coins_fined || 0 : 0),
				double_fines: stat.double_fines ?? 0,
				strikers_pocketed: stat.strikers_pocketed ?? 0,
				shots_taken: stat.shots_taken ?? 0,
			};
		});
};

const statsPayload = (rows) =>
	rows.map((row) => ({
		player_id: row.player_id,
		coins_pocketed: row.coins_pocketed ?? 0,
		opponent_coins_pocketed: row.opponent_coins_pocketed ?? 0,
		single_fines: row.single_fines ?? 0,
		double_fines: row.double_fines ?? 0,
		strikers_pocketed: row.strikers_pocketed ?? 0,
		coins_fined: (row.single_fines || 0) + 2 * (row.double_fines || 0),
		shots_taken: row.shots_taken ?? 0,
	}));

const limitRow = (row) => ({
	id: row.player_id,
	teamId: row.team_id,
	own: row.coins_pocketed,
	opponent: row.opponent_coins_pocketed,
	single: row.single_fines,
	double: row.double_fines,
});

const bounds = (rows, row) => coinBounds(rows.map(limitRow), limitRow(row));

const colorOverflow = (rows) => {
	const teams = [...new Set(rows.map((row) => row.team_id))];
	for (const teamId of teams) {
		const own = rows.filter((row) => row.team_id === teamId).reduce((sum, row) => sum + (row.coins_pocketed || 0), 0);
		const otherOpponent = rows
			.filter((row) => row.team_id !== teamId)
			.reduce((sum, row) => sum + (row.opponent_coins_pocketed || 0), 0);
		if (own + otherOpponent > 9) return teamName(teamId);
	}
	return "";
};

const loadMetricRows = async (match) => {
	const { ok, result } = await runAction(() =>
		Promise.all([adminApi.rosters.season(match.season_id), adminApi.matches.stats(match.id)]),
	);
	if (!ok) return null;
	seasonRoster.value = unwrap(result[0])?.rosters || [];
	return metricRows(match, seasonRoster.value, unwrap(result[1]) || []);
};

const openEdit = async (match) => {
	editingMatch.value = match;
	editScoreRows.value = [];
	seasonRoster.value = [];
	Object.keys(form).forEach((key) => delete form[key]);
	Object.assign(form, {
		team1: match.team1,
		team2: match.team2,
		scheduled_date: match.scheduled_date,
		category: match.category,
	});
	dialogOpen.value = true;
	formRef.value?.clearValidate();
	editScoreLoading.value = true;
	const rows = await loadMetricRows(match);
	if (rows) editScoreRows.value = rows;
	editScoreLoading.value = false;
};

watch(
	() => [form.team1, form.team2],
	() => {
		if (!dialogOpen.value || !editingMatch.value || !seasonRoster.value.length) return;
		const previous = new Map(editScoreRows.value.map((row) => [row.player_id, row]));
		const match = { ...editingMatch.value, team1: form.team1, team2: form.team2 };
		editScoreRows.value = metricRows(match, seasonRoster.value, []).map((row) => previous.get(row.player_id) || row);
	},
);

const save = async () => {
	const valid = await formRef.value.validate().catch(() => false);
	if (!valid) return;
	const rows = editingMatch.value ? editScoreRows.value : [];
	const overflow = colorOverflow(rows);
	if (overflow) {
		ElMessage.error(`${overflow} would have more than 9 coins of one colour.`);
		return;
	}
	saving.value = true;
	let ok = true;
	if (!playedLocked.value) {
		const payload = { ...form };
		({ ok } = await runAction(
			() =>
				editingMatch.value
					? adminApi.matches.update(editingMatch.value.id, payload)
					: adminApi.matches.create({ ...payload, season_id: seasonId.value }),
			editingMatch.value ? "Match updated" : "Match scheduled",
		));
	}
	if (ok && editingMatch.value && rows.length) {
		({ ok } = await runAction(
			() => adminApi.matches.saveStats(editingMatch.value.id, statsPayload(rows)),
			playedLocked.value ? "Scorecard saved" : undefined,
		));
	}
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
	const rows = await loadMetricRows(match);
	if (rows) statsRows.value = rows;
	statsLoading.value = false;
};

const saveStats = async () => {
	const overflow = colorOverflow(statsRows.value);
	if (overflow) {
		ElMessage.error(`${overflow} would have more than 9 coins of one colour.`);
		return;
	}
	statsSaving.value = true;
	const { ok } = await runAction(() => adminApi.matches.saveStats(statsMatch.value.id, statsPayload(statsRows.value)), "Scorecard saved");
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

<style scoped>
.scorecard-editor {
	margin-top: 8px;
}

.scorecard-editor h2 {
	margin: 0 0 12px;
	font-size: 16px;
}
</style>
