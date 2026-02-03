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
			<div>
				<el-table
					v-if="
						leagueTable &&
						leagueTable.standings &&
						leagueTable.standings.length > 0
					"
					:data="leagueTable.standings"
					style="width: fit-content"
				>
					<el-table-column prop="team_name" label="TEAM" width="180" />
					<el-table-column
						prop="matches_played"
						label="P"
						width="80"
						class="text-center"
					/>
					<el-table-column
						prop="wins"
						label="W"
						width="80"
						class="text-center"
					/>
					<el-table-column
						prop="losses"
						label="L"
						width="80"
						class="text-center"
					/>
					<el-table-column
						prop="net_points"
						label="NET"
						width="100"
						class="text-center"
					/>
					<el-table-column
						prop="points"
						label="PTS"
						width="100"
						class="text-center"
					/>
				</el-table>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useSeasonStore } from "@/store/seasonStore";

const seasonStore = useSeasonStore();
const selectedSeason = ref(null);
const seasons = ref([]);
const leagueTable = ref([]);
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
	seasonStore.setSeason(selectedSeason.value);
	await seasonStore.fetchLeagueTable();
	leagueTable.value = seasonStore.leagueTable;
	if (
		leagueTable.value &&
		leagueTable.value.standings &&
		leagueTable.value.standings.length > 0
	) {
		leagueTable.value.standings[0].team_name += " 🏆";
		leagueTable.value.standings.forEach((team, index) => {
			team.losses = team.matches_played - team.wins;
		});
	}
};

onMounted(async () => {
	seasons.value = seasonStore.seasons;
	selectedSeason.value = seasonStore.selectedSeason;
	leagueTable.value = seasonStore.leagueTable;
	fetchLeagueTable();
});
</script>

<style lang="scss" scoped>
::v-deep(.el-table__header-wrapper th.el-table__cell:not(:first-child) > .cell),
::v-deep(.el-table__row > td.el-table__cell:not(:first-child) > .cell) {
	text-align: center;
}

.el-select__wrapper.is-focused {
	box-shadow: none !important;
}

#points-table-wrapper {
	padding: 20px 15%;
}
</style>
