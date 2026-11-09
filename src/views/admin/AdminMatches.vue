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
			<el-table class="matches-table" :data="filteredMatches" v-loading="loading" empty-text="No matches in this season yet" stripe>
				<el-table-column prop="order" label="#" width="52" />
				<el-table-column label="Date" width="112">
					<template #default="{ row }">{{ row.scheduled_date }}</template>
				</el-table-column>
				<el-table-column label="Category" width="110">
					<template #default="{ row }">{{ categoryName(row.category) }}</template>
				</el-table-column>
				<el-table-column label="Format" width="168">
					<template #default="{ row }">
						<el-tag size="small" effect="plain">{{ matchFormat(row.category) }}</el-tag>
					</template>
				</el-table-column>
				<el-table-column label="Fixture" min-width="220">
					<template #default="{ row }">
						<span class="fixture-line">
							<span :class="{ 'fw-bold': row.outcome === MatchOutcome.Team1Won }">{{ teamName(row.team1) }}</span>
							<span class="text-muted mx-1">vs</span>
							<span :class="{ 'fw-bold': row.outcome === MatchOutcome.Team2Won }">{{ teamName(row.team2) }}</span>
						</span>
					</template>
				</el-table-column>
				<el-table-column label="Status" width="108">
					<template #default="{ row }">
						<el-tag :type="statusTag(row.status)" size="small">{{ statusName(row.status) }}</el-tag>
					</template>
				</el-table-column>
				<el-table-column label="Result" min-width="160">
					<template #default="{ row }">{{ resultText(row) }}</template>
				</el-table-column>
				<el-table-column label="" width="118" align="right">
					<template #default="{ row }">
						<div class="row-actions">
							<el-button size="small" type="primary" plain @click="openEdit(row)">Edit</el-button>
							<el-dropdown trigger="click" @command="(command) => runRowCommand(command, row)">
								<el-button size="small" :aria-label="`More actions for match ${row.order}`">
									<el-icon><MoreFilled /></el-icon>
								</el-button>
								<template #dropdown>
									<el-dropdown-menu>
										<el-dropdown-item v-if="row.status !== 1" command="reset">Reset match</el-dropdown-item>
										<el-dropdown-item v-if="canResetToss(row)" command="reset-toss">Reset toss</el-dropdown-item>
										<el-dropdown-item command="delete" divided>Delete match</el-dropdown-item>
									</el-dropdown-menu>
								</template>
							</el-dropdown>
						</div>
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
							<template #default="{ row }"><el-input-number v-model="row.single_fines" :min="bounds(editScoreRows, row).singleMin" :max="bounds(editScoreRows, row).singleMax" size="small" /></template>
						</el-table-column>
						<el-table-column label="Double fines" width="140">
							<template #default="{ row }"><el-input-number v-model="row.double_fines" :min="bounds(editScoreRows, row).doubleMin" :max="bounds(editScoreRows, row).doubleMax" size="small" /></template>
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

	</div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { MoreFilled, Plus, VideoPlay } from "@element-plus/icons-vue";
import { useRouter } from "vue-router";
import { adminApi } from "@/services/adminService";
import { confirmDelete, defaultSeasonId, runAction, unwrap } from "@/utils/adminHelpers";
import { MatchCategory, MatchOutcome, MatchStatus, Routes, TossOutcome } from "@/utils/constants";
import { coinBounds, colourOverflow } from "@/utils/coinLimits";

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

const tossWinnerName = (match) => {
	if (match.toss_outcome === TossOutcome.Team1Won) return teamName(match.team1);
	if (match.toss_outcome === TossOutcome.Team2Won) return teamName(match.team2);
	return "";
};

const canResetToss = (match) => match.status === 1 && tossWinnerName(match) !== "";

const resultText = (match) => {
	if (match.outcome === MatchOutcome.Team1Won || match.outcome === MatchOutcome.Team2Won) {
		const winner = match.outcome === MatchOutcome.Team1Won ? match.team1 : match.team2;
		const points = match.net_points != null ? ` by ${match.net_points}` : "";
		return `${teamName(winner)} won${points}`;
	}
	const tossWinner = tossWinnerName(match);
	if (match.status === 1 && tossWinner) return `${tossWinner} won the toss`;
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
	const limits = rows.map(limitRow);
	const teams = [...new Set(rows.map((row) => row.team_id))];
	for (const teamId of teams) {
		if (colourOverflow(limits, teamId)) return teamName(teamId);
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
		ElMessage.error(`${overflow}'s colour would have more than 9 coins off the board after fines.`);
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

const resetToss = async (match) => {
	const winner = tossWinnerName(match);
	const confirmed = await ElMessageBox.confirm(
		`Reset the toss for match #${match.order}? ${winner} won the toss, and the match has not started. The fixture stays Scheduled.`,
		"Reset toss",
		{ confirmButtonText: "Reset toss", cancelButtonText: "Cancel", type: "warning" },
	)
		.then(() => true)
		.catch(() => false);
	if (!confirmed) return;
	const { ok } = await runAction(
		() => adminApi.matches.update(match.id, { toss_outcome: TossOutcome.NotDecided }),
		"Toss reset",
	);
	if (ok) await loadSeason();
};

const reset = async (match) => {
	const confirmed = await ElMessageBox.confirm(
		`Reset match #${match.order} (${teamName(match.team1)} vs ${teamName(match.team2)})? This clears the toss, the clock, the result and every player's scorecard, and puts the match back to Scheduled.`,
		"Reset match",
		{ confirmButtonText: "Reset match", cancelButtonText: "Cancel", type: "warning", confirmButtonClass: "el-button--danger" },
	)
		.then(() => true)
		.catch(() => false);
	if (!confirmed) return;
	const { ok } = await runAction(() => adminApi.matches.reset(match.id), "Match reset to Scheduled");
	if (ok) await loadSeason();
};

const remove = async (match) => {
	if (!(await confirmDelete(`match #${match.order} (${teamName(match.team1)} vs ${teamName(match.team2)})`))) return;
	const { ok } = await runAction(() => adminApi.matches.remove(match.id), "Match deleted");
	if (ok) await loadSeason();
};

const runRowCommand = (command, match) => {
	if (command === "reset") reset(match);
	else if (command === "reset-toss") resetToss(match);
	else if (command === "delete") remove(match);
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

.matches-table {
	width: 100%;
}

.fixture-line {
	line-height: 1.35;
}

.row-actions {
	display: inline-flex;
	align-items: center;
	gap: 6px;
}
</style>
