<template>
	<div id="points-table-wrapper">
		<div id="points-table-filters" class="mb-3">
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
				style="width: 100%"
			>
				<el-table-column prop="team_name" label="TEAM" width="180" />
				<el-table-column prop="matches_played" label="P" width="180" />
				<el-table-column prop="wins" label="W" />
				<el-table-column prop="net_points" label="NET" />
				<el-table-column prop="points" label="PTS" />
			</el-table>
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
};

onMounted(async () => {
	seasons.value = seasonStore.seasons;
	selectedSeason.value = seasonStore.selectedSeason;
	leagueTable.value = seasonStore.leagueTable;
	fetchLeagueTable();
});
</script>

<style scoped>
.el-select__wrapper.is-focused {
	box-shadow: none !important;
}

#points-table-wrapper {
	padding: 20px 15%;
}
</style>
