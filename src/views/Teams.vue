<template>
	<div id="teams-wrapper" class="page-container">
		<div class="teams-shell d-flex flex-column">
			<header class="page-heading">
				<div>
					<span class="page-eyebrow">Squads</span>
					<h1 class="page-title">Teams</h1>
					<p class="page-subtitle">Season-wise lineup and roster overview</p>
				</div>
				<div class="page-filters">
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
				</div>
			</header>

			<div v-loading="loading" element-loading-text="Loading..." id="teams-body">
				<div v-if="!loading && !hasSeasonRoster" class="empty-state">
					Data is not available for this season.
				</div>
				<div v-else-if="!loading && teams.length > 0" class="teams-grid">
					<div
						v-for="team in teams"
						:key="team.id"
						class="team-card"
					>
						<div class="team-head">
							<EntityImage :src="team.logo_url || ''" :name="team.name" kind="team" class="team-logo" />
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
								<EntityImage :src="player.avatar_url || ''" :name="playerName(player)" kind="player" class="player-avatar" />
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
import { playerName } from "@/utils/media";
import EntityImage from "@/components/EntityImage.vue";
import { ref, computed, onMounted, watch } from "vue";
import { useSeasonStore } from "@/store/seasonStore";
import { useTeamStore } from "@/store/teamStore";
import { useRosterStore } from "@/store/rosterStore";
import { seasonService } from "@/services/seasonService";
import { isSeasonFinished } from "@/utils/season";
import { areas } from "@/utils/realtimeRules";
import { useLive } from "@/utils/useLive";

const seasonStore = useSeasonStore();
const teamStore = useTeamStore();
const rosterStore = useRosterStore();
const selectedSeason = ref(null);
const seasons = ref([]);
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

const teams = computed(() => teamStore.teams || []);

const hasSeasonRoster = computed(() =>
	(seasonRosters.value || []).some((team) => (team.players || []).length > 0),
);

const getTeamPlayers = (teamId) => rosterByTeamId.value.get(teamId) || [];

const getChampionSeasons = (teamId) => championSeasonsByTeamId.value.get(teamId) || [];

const fetchRosterForSeason = async (options) => {
	const quiet = Boolean(options && options.quiet);
	if (!selectedSeason.value) {
		seasonRosters.value = [];
		return;
	}

	if (!quiet) loading.value = true;
	try {
		seasonStore.setSeason(selectedSeason.value);
		if (quiet || !rosterStore.teams.has(selectedSeason.value)) {
			await rosterStore.fetchTeamDetails(selectedSeason.value);
		}
		seasonRosters.value = rosterStore.teams.get(selectedSeason.value) || [];
	} catch (error) {
		console.error("Failed to fetch team rosters", error);
		if (!quiet) seasonRosters.value = [];
	} finally {
		if (!quiet) loading.value = false;
	}
};

const fetchChampionCounts = async () => {
	const completedSeasons = (seasonStore.seasons || []).filter(isSeasonFinished);
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

useLive(() => Promise.all([fetchRosterForSeason({ quiet: true }), fetchChampionCounts()]), {
	areas: areas.teams,
});

watch(
	() => seasonStore.visibleSeasons,
	(next) => {
		seasons.value = next;
	},
);

onMounted(async () => {
	seasons.value = seasonStore.visibleSeasons;
	selectedSeason.value = seasonStore.selectedSeason;
	await Promise.all([fetchRosterForSeason(), fetchChampionCounts()]);
});
</script>

<style scoped lang="scss">
::v-deep(.el-select__wrapper.is-focused),
::v-deep(.el-input__wrapper.is-focus) {
	box-shadow: 0 0 0 1px var(--el-border-color) inset;
}

.teams-shell {
	width: 100%;
}

#teams-body {
	min-height: 220px;
	border: 1px solid var(--pl-body-line);
	padding: clamp(10px, 2vw, 16px);
	border-radius: var(--cpl-radius-lg);
	background: var(--pl-body-bg);
	box-shadow: var(--pl-body-shadow);
}

.teams-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 14px;
}

.team-card {
	border: 1px solid var(--pl-line);
	border-radius: 12px;
	padding: 12px;
	background: var(--pl-card);
	min-width: 0;
	transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.team-card:hover {
	transform: translateY(-2px);
	box-shadow: 0 12px 20px rgba(17, 63, 103, 0.08);
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
	border: 2px solid var(--pl-sunken);
}

.team-name {
	font-size: 16px;
	color: var(--pl-ink);
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

.team-head > div:nth-child(2) {
	min-width: 0;
}

.team-slogan {
	font-size: 12px;
	color: var(--pl-muted);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.team-count-badge {
	font-size: 11px;
	padding: 5px 8px;
	border-radius: 999px;
	background: var(--pl-count-bg);
	color: var(--pl-count-text);
	border: 1px solid var(--pl-count-line);
}

.team-divider {
	margin: 10px 0;
	border-top: 1px dashed var(--pl-line);
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
	border: 1px solid var(--pl-line-soft);
	background: var(--pl-sunken);
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
	color: var(--pl-ink-2);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.empty-roster,
.empty-state {
	color: var(--pl-muted);
	font-size: 13px;
	text-align: center;
	padding: 12px 0;
}

@media (min-width: 1200px) {
	.teams-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
}

@media (max-width: 767.98px) {
	.teams-grid {
		grid-template-columns: 1fr;
	}
}

@media (max-width: 575.98px) {
	.team-head {
		grid-template-columns: auto 1fr;
	}

	.team-count-badge {
		grid-column: 1 / -1;
		justify-self: start;
	}
}

@media (max-width: 399.98px) {
	.player-list {
		grid-template-columns: 1fr;
	}
}
</style>


