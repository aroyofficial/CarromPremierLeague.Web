<template>
	<div id="fixtures-wrapper" class="d-flex flex-column mt-5">
		<div id="fixtures-filter" class="d-flex justify-content-end gap-3">
			<el-select
				v-model="fixtureFilter.season"
				placeholder="Select Season"
				style="width: 180px"
				size="large"
				:popper-options="dropdownPopperOptions"
				@change="fetchMatches()"
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
				v-model="fixtureFilter.team"
				placeholder="Select Team"
				style="width: 220px"
				size="large"
				:popper-options="dropdownPopperOptions"
				clearable
			>
				<el-option
					v-for="item in teams"
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
			<el-select
				v-model="fixtureFilter.category"
				placeholder="Select Category"
				style="width: 180px"
				size="large"
				:popper-options="dropdownPopperOptions"
				clearable
			>
				<el-option
					v-for="item in matchCategories"
					:key="item.id"
					:label="item.name"
					:value="item.id"
				/>
			</el-select>
			<el-select
				v-model="fixtureFilter.status"
				placeholder="Select Status"
				style="width: 160px"
				size="large"
				:popper-options="dropdownPopperOptions"
				clearable
			>
				<el-option
					v-for="item in matchStatuses"
					:key="item.id"
					:label="item.name"
					:value="item.id"
				/>
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
			style="width: max-content"
			align-center
			@close="resetScheduleMatchDialog()"
		>
			<div class="dialog-body">
				<div class="d-flex gap-3 align-items-center my-3">
					<div class="d-flex justify-content-start">
						<el-select
							class="teams-dropdown"
							v-model="matchObject.team1"
							placeholder="Select Team 1"
							style="width: 220px"
							size="large"
							:popper-options="dropdownPopperOptions"
							clearable
						>
							<el-option
								v-for="item in teams"
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
					</div>
					<div class="px-3"><span>v/s</span></div>
					<div class="d-flex justify-content-end">
						<el-select
							class="teams-dropdown"
							v-model="matchObject.team2"
							placeholder="Select Team 2"
							style="width: 220px"
							size="large"
							:popper-options="dropdownPopperOptions"
							clearable
						>
							<el-option
								v-for="item in teams"
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
				<div class="d-flex align-items-center gap-3 mb-3">
					<div class="d-flex justify-content-start w-100">
						<el-select
							v-model="matchObject.season_id"
							placeholder="Select Season"
							size="large"
							:popper-options="dropdownPopperOptions"
							clearable
						>
							<el-option
								v-for="item in seasons"
								:key="item.id"
								:label="item.name"
								:value="item.id"
							/>
						</el-select>
					</div>
					<div class="d-flex justify-content-end w-100">
						<el-select
							v-model="matchObject.category"
							placeholder="Select Category"
							size="large"
							:popper-options="dropdownPopperOptions"
							clearable
						>
							<el-option
								v-for="item in matchCategories"
								:key="item.id"
								:label="item.name"
								:value="item.id"
							/>
						</el-select>
					</div>
				</div>
				<div class="d-flex align-items-center gap-3 mb-3">
					<div class="d-flex justify-content-start">
						<el-date-picker
							v-model="matchObject.scheduled_date"
							type="date"
							placeholder="Select Date"
							size="large"
							:disabled-date="disabledDate"
						/>
					</div>
					<div class="d-flex justify-content-start">
						<el-tooltip
							class="box-item"
							effect="dark"
							content="Order of the match in the season schedule"
							placement="right"
						>
							<el-input
								v-model="matchObject.order"
								disabled
								size="large"
								style="width: 35px"
							/>
						</el-tooltip>
					</div>
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
import { useMatchStore } from "@/store/matchStore";
import { Plus } from "@element-plus/icons-vue";
import { MatchCategory, MatchObject, MatchStatus } from "../utils/constants";

const seasonStore = useSeasonStore();
const teamStore = useTeamStore();
const matchStore = useMatchStore();
const seasons = ref([]);
const teams = ref([]);
const showScheduleMatchDialog = ref(false);
const matchCategories = Object.values(MatchCategory);
const matchStatuses = Object.values(MatchStatus);
const fixtureFilter = ref({
	season: null,
	team: null,
	category: null,
	status: null,
});
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
	scheduled_date: null,
	duration: null,
	extra: null,
	golden_strike: null,
	category: null,
	status: MatchStatus.find((status) => status.name === "Scheduled").id,
	order: null,
	season_id: null,
	net_points: null,
	outcome: MatchObject.find((outcome) => outcome.name === "Not Decided").id,
});

const resetScheduleMatchDialog = () => {
	matchObject.value = {
		team1: null,
		team2: null,
		scheduled_date: null,
		duration: null,
		extra: null,
		golden_strike: null,
		category: null,
		status: MatchStatus.find((status) => status.name === "Scheduled").id,
		order: matchStore.nextMatchOrder,
		season_id: null,
		net_points: null,
		outcome: MatchObject.find((outcome) => outcome.name === "Not Decided").id,
	};
	showScheduleMatchDialog.value = false;
};

const fetchMatches = async () => {
	await matchStore.fetchMatches(fixtureFilter.value.season);
};

const disabledDate = (time) => {
	const oneDay = 24 * 60 * 60 * 1000;
	return time.getTime() <= Date.now() - oneDay;
};

onMounted(() => {
	seasons.value = seasonStore.seasons;
	teams.value = teamStore.teams;
	fixtureFilter.value.season = seasonStore.selectedSeason;
	matchObject.value.order = matchStore.nextMatchOrder;
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
