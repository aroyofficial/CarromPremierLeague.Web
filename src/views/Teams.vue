<template>
	<div id="teams-wrapper" class="d-flex flex-column align-items-center mt-5">
		<div class="teams-shell d-flex flex-column">
			<div class="teams-topbar mb-4">
				<div>
					<div class="teams-title poppins-semibold">Teams</div>
					<div class="teams-subtitle">Season-wise lineup and roster overview</div>
				</div>
				<div class="teams-filters">
					<el-select
						v-model="selectedSeason"
						placeholder="Select Season"
						class="season-select"
						size="large"
						:popper-options="dropdownPopperOptions"
						@change="fetchRosterForSeason"
					>
						<el-option
							v-for="item in seasons"
							:key="item.id"
							:label="item.name"
							:value="item.id"
						/>
					</el-select>
					<el-input
						v-model="teamSearch"
						placeholder="Search team"
						class="team-search"
						size="large"
						clearable
					/>
				</div>
			</div>

			<div class="summary-row mb-4">
				<div class="summary-card">
					<div class="summary-label">Teams</div>
					<div class="summary-value">{{ filteredTeams.length }}</div>
				</div>
				<div class="summary-card">
					<div class="summary-label">Active Rosters</div>
					<div class="summary-value">{{ activeRosterCount }}</div>
				</div>
				<div class="summary-card">
					<div class="summary-label">Players Assigned</div>
					<div class="summary-value">{{ assignedPlayersCount }}</div>
				</div>
			</div>

			<div v-loading="loading" element-loading-text="Loading..." id="teams-body">
				<div v-if="!loading && filteredTeams.length > 0" class="teams-grid">
					<div
						v-for="team in filteredTeams"
						:key="team.id"
						class="team-card"
					>
						<div class="team-head">
							<img :src="team.logo_url" class="team-logo" />
							<div>
								<div class="team-name-row">
									<div class="team-name poppins-semibold">{{ team.name }}</div>
									<span
										v-if="getChampionSeasons(team.id).length > 0"
										class="champion-badges"
									>
										<span
											v-for="(seasonName, idx) in getChampionSeasons(team.id)"
											:key="`${team.id}-${seasonName}-${idx}`"
											class="champion-trophy"
											:title="seasonName"
										>
											&#127942;
										</span>
									</span>
								</div>
								<div class="team-slogan">{{ team.slogan || "No slogan available" }}</div>
							</div>
							<div class="team-count-badge">
								{{ getTeamPlayers(team.id).length }} Players
							</div>
						</div>

						<div class="team-divider"></div>

						<div v-if="getTeamPlayers(team.id).length > 0" class="player-list">
							<div
								v-for="player in getTeamPlayers(team.id)"
								:key="player.player_id"
								class="player-item"
							>
								<img :src="player.avatar_url" class="player-avatar" />
								<div class="player-name">
									{{ player.first_name }} {{ player.last_name }}
								</div>
							</div>
						</div>
						<div v-else class="empty-roster">No players assigned for this season</div>
					</div>
				</div>
				<div v-else-if="!loading" class="empty-state">No teams found.</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useSeasonStore } from "@/store/seasonStore";
import { useTeamStore } from "@/store/teamStore";
import { useRosterStore } from "@/store/rosterStore";
import { seasonService } from "@/services/seasonService";

const seasonStore = useSeasonStore();
const teamStore = useTeamStore();
const rosterStore = useRosterStore();
const selectedSeason = ref(null);
const seasons = ref([]);
const teamSearch = ref("");
const loading = ref(false);
const seasonRosters = ref([]);
const championSeasonsByTeamId = ref(new Map());
const dropdownPopperOptions = ref({
	placement: "bottom-start",
	modifiers: [
		{
			name: "flip",
			enabled: false,
		},
	],
});

const rosterByTeamId = computed(() => {
	const map = new Map();
	for (const teamHistory of seasonRosters.value || []) {
		map.set(teamHistory.team_id, teamHistory.players || []);
	}
	return map;
});

const filteredTeams = computed(() => {
	const search = teamSearch.value.trim().toLowerCase();
	const teams = teamStore.teams || [];
	if (!search) {
		return teams;
	}
	return teams.filter(
		(team) =>
			team.name.toLowerCase().includes(search) ||
			(team.slogan || "").toLowerCase().includes(search),
	);
});

const activeRosterCount = computed(
	() => (seasonRosters.value || []).filter((team) => (team.players || []).length > 0).length,
);

const assignedPlayersCount = computed(() =>
	(seasonRosters.value || []).reduce(
		(total, team) => total + ((team.players || []).length || 0),
		0,
	),
);

const getTeamPlayers = (teamId) => rosterByTeamId.value.get(teamId) || [];

const getChampionSeasons = (teamId) => championSeasonsByTeamId.value.get(teamId) || [];

const fetchRosterForSeason = async () => {
	if (!selectedSeason.value) {
		seasonRosters.value = [];
		return;
	}

	loading.value = true;
	try {
		seasonStore.setSeason(selectedSeason.value);
		if (!rosterStore.teams.has(selectedSeason.value)) {
			await rosterStore.fetchTeamDetails(selectedSeason.value);
		}
		seasonRosters.value = rosterStore.teams.get(selectedSeason.value) || [];
	} catch (error) {
		console.error("Failed to fetch team rosters", error);
		seasonRosters.value = [];
	} finally {
		loading.value = false;
	}
};

const fetchChampionCounts = async () => {
	const completedSeasons = (seasonStore.seasons || []).filter(
		(season) => Number(season.status) === 3,
	);
	if (completedSeasons.length === 0) {
		championSeasonsByTeamId.value = new Map();
		return;
	}

	const results = await Promise.allSettled(
		completedSeasons.map((season) => seasonService.getLeagueTable(season.id)),
	);
	const championSeasons = new Map();

	for (let index = 0; index < results.length; index++) {
		const result = results[index];
		if (result.status !== "fulfilled") {
			continue;
		}
		const seasonName = completedSeasons[index]?.name;
		const winnerId = result.value?.data?.winner_id;
		if (!winnerId || !seasonName) {
			continue;
		}
		const wonSeasons = championSeasons.get(winnerId) || [];
		championSeasons.set(winnerId, [...wonSeasons, seasonName]);
	}

	championSeasonsByTeamId.value = championSeasons;
};

onMounted(async () => {
	seasons.value = seasonStore.seasons;
	selectedSeason.value = seasonStore.selectedSeason;
	await Promise.all([fetchRosterForSeason(), fetchChampionCounts()]);
});
</script>

<style scoped lang="scss">
::v-deep(.el-select__wrapper.is-focused),
::v-deep(.el-input__wrapper.is-focus) {
	box-shadow: 0 0 0 1px var(--el-border-color) inset;
}

#teams-wrapper {
	padding: 20px 12%;
}

.teams-shell {
	width: min(1060px, 100%);
}

.teams-topbar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 16px;
}

.teams-title {
	font-size: 24px;
	color: #113f67;
}

.teams-subtitle {
	font-size: 13px;
	color: #64748b;
}

.teams-filters {
	display: flex;
	align-items: center;
	gap: 10px;
}

.season-select {
	width: 180px;
}

.team-search {
	width: 220px;
}

.summary-row {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 12px;
}

.summary-card {
	border: 1px solid #dbeafe;
	background: linear-gradient(135deg, #f8fbff 0%, #eef6ff 100%);
	border-radius: 12px;
	padding: 12px 14px;
}

.summary-label {
	font-size: 12px;
	color: #6b7280;
}

.summary-value {
	font-size: 22px;
	font-weight: 600;
	color: #0f172a;
}

#teams-body {
	min-height: 220px;
	border: 1px solid #dbe7f6;
	padding: 16px;
	border-radius: 14px;
	background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
	box-shadow:
		0 10px 24px rgba(29, 78, 216, 0.08),
		0 2px 8px rgba(0, 0, 0, 0.04);
}

.teams-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 14px;
}

.team-card {
	border: 1px solid #e2e8f0;
	border-radius: 12px;
	padding: 12px;
	background: #ffffff;
}

.team-head {
	display: grid;
	grid-template-columns: auto 1fr auto;
	align-items: center;
	gap: 10px;
}

.team-logo {
	width: 44px;
	height: 44px;
	border-radius: 50%;
	object-fit: cover;
	border: 2px solid #f8fafc;
}

.team-name {
	font-size: 16px;
	color: #0f172a;
}

.team-name-row {
	display: flex;
	align-items: center;
	gap: 6px;
}

.champion-badges {
	display: inline-flex;
	align-items: center;
	gap: 2px;
}

.champion-trophy {
	font-size: 12px;
	line-height: 1;
}

.team-slogan {
	font-size: 12px;
	color: #64748b;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 260px;
}

.team-count-badge {
	font-size: 11px;
	padding: 5px 8px;
	border-radius: 999px;
	background: #e0f2fe;
	color: #0c4a6e;
	border: 1px solid #bae6fd;
}

.team-divider {
	margin: 10px 0;
	border-top: 1px dashed #e2e8f0;
}

.player-list {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 8px;
}

.player-item {
	display: flex;
	align-items: center;
	gap: 8px;
	border: 1px solid #edf2f7;
	background: #f8fafc;
	border-radius: 10px;
	padding: 6px;
}

.player-avatar {
	width: 28px;
	height: 28px;
	border-radius: 50%;
	object-fit: cover;
}

.player-name {
	font-size: 12px;
	color: #1e293b;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.empty-roster,
.empty-state {
	color: #64748b;
	font-size: 13px;
	text-align: center;
	padding: 12px 0;
}

@media (max-width: 980px) {
	.teams-topbar {
		flex-direction: column;
		align-items: flex-start;
	}

	.teams-filters {
		width: 100%;
		flex-direction: column;
		align-items: stretch;
	}

	.season-select,
	.team-search {
		width: 100%;
	}

	.summary-row {
		grid-template-columns: 1fr;
	}

	.teams-grid {
		grid-template-columns: 1fr;
	}

	.player-list {
		grid-template-columns: 1fr;
	}
}
</style>


