<template>
	<div
		id="points-table-wrapper"
		class="d-flex flex-column align-items-center mt-5"
	>
		<div class="d-flex flex-column" style="width: max-content">
			<div id="points-table-filters" class="mb-4 d-flex justify-content-end">
				<el-select
					v-model="selectedSeason"
					placeholder="Select Season"
					style="width: 180px"
					size="large"
					:popper-options="dropdownPopperOptions"
					@change="fetchLeagueTable"
				>
					<el-option
						v-for="item in seasons"
						:key="item.id"
						:label="item.name"
						:value="item.id"
					/>
				</el-select>
			</div>
			<div
				v-loading="loading"
				element-loading-text="Loading..."
				id="points-table-body"
			>
				<el-table
					v-if="
						!loading &&
						leagueTable &&
						leagueTable.standings &&
						leagueTable.standings.length > 0
					"
					:data="leagueTable.standings"
					:row-class-name="getRowClassName"
					style="width: fit-content"
				>
					<el-table-column prop="team_name" label="TEAM" width="240">
						<template #default="{ row }">
							<img
								class="team-logo"
								:src="teams.find((t) => t.id === row.team_id)?.logo_url"
								height="10"
								width="10"
							/>
							{{ row.team_name }}
							<span v-if="isWinnerRow(row)" class="winner-badge">&#127942;</span>
						</template>
					</el-table-column>
					<el-table-column prop="matches_played" label="P" width="80" />
					<el-table-column prop="wins" label="W" width="80" />
					<el-table-column prop="losses" label="L" width="80" />
					<el-table-column prop="net_points" label="NET" width="100" />
					<el-table-column prop="points" label="PTS" width="100">
						<template #default="{ row }">
							<b>{{ row.points }}</b>
						</template>
					</el-table-column>
				</el-table>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useSeasonStore } from "@/store/seasonStore";
import { useTeamStore } from "@/store/teamStore";
import { useMatchStore } from "@/store/matchStore";
import { MatchCategory, MatchStatus } from "@/utils/constants";

const seasonStore = useSeasonStore();
const teamStore = useTeamStore();
const matchStore = useMatchStore();
const selectedSeason = ref(null);
const seasons = ref([]);
const teams = ref([]);
const leagueTable = ref([]);
const loading = ref(false);
const dropdownPopperOptions = ref({
	placement: "bottom-start",
	modifiers: [
		{
			name: "flip",
			enabled: false,
		},
	],
});

const fetchLeagueTable = async () => {
	try {
		loading.value = true;
		seasonStore.setSeason(selectedSeason.value);
		await Promise.all([
			seasonStore.fetchLeagueTable(),
			matchStore.fetchMatches(selectedSeason.value),
		]);
		leagueTable.value = seasonStore.leagueTable;
		if (
			leagueTable.value &&
			leagueTable.value.standings &&
			leagueTable.value.standings.length > 0
		) {
			leagueTable.value.standings.forEach((team) => {
				team.losses = team.matches_played - team.wins;
			});
		}
	} finally {
		loading.value = false;
	}
};

const isSeasonEnded = () => leagueTable.value?.season_status === 3;

const isWinnerRow = (row) =>
	isSeasonEnded() && row.team_id === leagueTable.value?.winner_id;

const isLeagueStageCompleted = () => {
	if (isSeasonEnded()) {
		return false;
	}
	const leagueCategoryId = MatchCategory.find(
		(category) => category.name === "League",
	)?.id;
	const playedStatusId = MatchStatus.find(
		(status) => status.name === "Played",
	)?.id;
	const leagueMatches = matchStore.matches.filter(
		(match) =>
			match.season_id === selectedSeason.value &&
			match.category === leagueCategoryId,
	);
	if (leagueMatches.length === 0) {
		return false;
	}
	return leagueMatches.every((match) => match.status === playedStatusId);
};

const isFinalistRow = (rowIndex) => isLeagueStageCompleted() && rowIndex < 2;

const getRowClassName = ({ row, rowIndex }) => {
	if (isWinnerRow(row)) {
		return "winner-row";
	}
	if (isFinalistRow(rowIndex)) {
		return "finalist-row";
	}
	return "";
};

onMounted(async () => {
	seasons.value = seasonStore.seasons;
	selectedSeason.value = seasonStore.selectedSeason;
	leagueTable.value = seasonStore.leagueTable;
	teams.value = teamStore.teams;
	fetchLeagueTable();
});
</script>

<style lang="scss" scoped>
::v-deep(.el-table__header-wrapper th.el-table__cell:not(:first-child) > .cell),
::v-deep(.el-table__row > td.el-table__cell:not(:first-child) > .cell) {
	text-align: center;
}

::v-deep(.el-table__body-wrapper .el-table__row:last-child td) {
	border-bottom: none !important;
}

::v-deep(.el-select__wrapper.is-focused) {
	box-shadow: 0 0 0 1px var(--el-border-color) inset;
}

#points-table-wrapper {
	padding: 20px 15%;
}

#points-table-body {
	min-height: 220px;
	min-width: 640px;
	border: 1px solid var(--el-border-color-lighter);
	padding: 10px;
	border-radius: 10px;
	box-shadow:
		0 10px 25px rgba(59, 130, 246, 0.15),
		0 20px 40px rgba(59, 130, 246, 0.1),
		0 2px 6px rgba(0, 0, 0, 0.05);
}

.el-table--fit:hover {
	cursor: pointer;
}

::v-deep(.el-table__body .el-table__row.winner-row > td.el-table__cell) {
	background: linear-gradient(90deg, #fff8d6 0%, #fff2ad 100%);
}

::v-deep(.el-table__body .el-table__row.winner-row > td.el-table__cell:first-child) {
	border-left: 3px solid #d4a017;
}

::v-deep(.el-table__body .el-table__row.finalist-row > td.el-table__cell) {
	background: linear-gradient(90deg, #e6f3ff 0%, #f2f8ff 100%);
}

::v-deep(.el-table__body .el-table__row.finalist-row > td.el-table__cell:first-child) {
	border-left: 3px solid #2f7fbf;
}

.winner-badge {
	margin-left: 8px;
}
</style>

