<template>
	<div id="fixtures-wrapper" class="d-flex flex-column mt-5">
		<div id="fixtures-filter" class="d-flex justify-content-end gap-3">
			<el-select
				v-model="selectedSeason"
				placeholder="Select Season"
				style="width: 180px"
				size="large"
				:popper-options="dropdownPopperOptions"
			>
				<el-option
					v-for="item in seasons"
					:key="item.id"
					:label="item.name"
					:value="item.id"
				/>
			</el-select>
			<el-select
				class="teams-dropdown"
				v-model="selectedTeam"
				placeholder="Select Team"
				style="width: 220px"
				size="large"
				:popper-options="dropdownPopperOptions"
			>
				<el-option
					v-for="item in getTeams(false)"
					:key="item.id"
					:label="item.name"
					:value="item.id"
					class="mb-1"
				>
					<div class="d-flex gap-2 align-items-center">
						<img v-if="item.id !== -1" class="team-logo" :src="item.logo_url" />
						<div>{{ item.name }}</div>
					</div>
				</el-option>
			</el-select>
			<el-button
				type="primary"
				size="large"
				@click="showScheduleMatchDialog = true"
			>
				Create<el-icon class="el-icon--right"><Plus /></el-icon>
			</el-button>
		</div>
		<div id="fixtures-paginated-table"></div>
		<el-dialog
			v-model="showScheduleMatchDialog"
			title="Schedule New Match"
			width="800"
			align-center
		>
			<div class="dialog-body">
				<div class="d-flex gap-3">
					<el-select
						class="teams-dropdown"
						v-model="matchObject.team1"
						placeholder="Select Team 1"
						style="width: 220px"
						size="large"
						:popper-options="dropdownPopperOptions"
					>
						<el-option
							v-for="item in getTeams()"
							:key="item.id"
							:label="item.name"
							:value="item.id"
							:disabled="item.id === matchObject.team2"
							class="mb-1"
						>
							<div class="d-flex gap-2 align-items-center">
								<img
									v-if="item.id !== -1"
									class="team-logo"
									:src="item.logo_url"
								/>
								<div>{{ item.name }}</div>
							</div>
						</el-option>
					</el-select>
					<div class="px-5"><span>v/s</span></div>
					<el-select
						class="teams-dropdown"
						v-model="matchObject.team2"
						placeholder="Select Team 2"
						style="width: 220px"
						size="large"
						:popper-options="dropdownPopperOptions"
					>
						<el-option
							v-for="item in getTeams()"
							:key="item.id"
							:label="item.name"
							:value="item.id"
							:disabled="item.id === matchObject.team1"
							class="mb-1"
						>
							<div class="d-flex gap-2 align-items-center">
								<img
									v-if="item.id !== -1"
									class="team-logo"
									:src="item.logo_url"
								/>
								<div>{{ item.name }}</div>
							</div>
						</el-option>
					</el-select>
				</div>
			</div>
			<template #footer>
				<div class="dialog-footer">
					<el-button @click="resetScheduleMatchDialog()">Cancel</el-button>
					<el-button type="primary" @click="scheduleMatch()">
						Schedule
					</el-button>
				</div>
			</template>
		</el-dialog>
	</div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useSeasonStore } from "@/store/seasonStore";
import { useTeamStore } from "@/store/teamStore";
import { Plus } from "@element-plus/icons-vue";
import { MatchCategory, MatchStatus } from "../utils/constants";

const seasonStore = useSeasonStore();
const teamStore = useTeamStore();
const seasons = ref([]);
const teams = ref([]);
const selectedSeason = ref(null);
const selectedTeam = ref(null);
const showScheduleMatchDialog = ref(false);
const dropdownPopperOptions = ref({
	placement: "bottom-start",
	modifiers: [
		{
			name: "flip",
			enabled: false,
		},
	],
});
const matchObject = ref({
	team1: null,
	team2: null,
	season: null,
	date: null,
});

const getTeams = (excludeAll = true) => {
	return [
		...new Map(
			teams.value
				.filter((item) => !(item.id === -1 && excludeAll))
				.map((item) => [item.id, item]),
		).values(),
	];
};

const resetScheduleMatchDialog = () => {
	matchObject.value = {
		team1: null,
		team2: null,
		season: null,
		date: null,
	};
	showScheduleMatchDialog.value = false;
};

onMounted(() => {
	seasons.value = seasonStore.seasons;
	teams.value = teamStore.teams;
	const hasAll = teams.value.includes((t) => t.id === -1);
	!hasAll && teams.value.unshift({ id: -1, name: "All Teams" });
	selectedTeam.value = teams.value[0].id;
	selectedSeason.value = seasonStore.selectedSeason;
});
</script>

<style scoped lang="scss">
::v-deep(.el-select__wrapper.is-focused) {
	box-shadow: 0 0 0 1px var(--el-border-color) inset;
}

#fixtures-wrapper {
	padding: 0px 15%;
}

#fixtures-filter {
	margin-bottom: 20px;
}

::v-deep(.teams-dropdown .el-select-dropdown__item) {
	margin-bottom: 10px !important;
}
</style>
