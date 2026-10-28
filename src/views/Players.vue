<template>
	<div id="players-wrapper" class="page-container">
		<div class="players-shell d-flex flex-column">
			<header class="page-heading">
				<div>
					<span class="page-eyebrow">Profiles</span>
					<h1 class="page-title">Players</h1>
					<p class="page-subtitle">Find players by season and team.</p>
				</div>
				<div class="page-filters">
					<el-select
						v-model="selectedSeason"
						placeholder="Season"
						class="season-select"
						size="large"
						:popper-options="dropdownPopperOptions"
						@change="fetchPlayersDirectory"
					>
						<el-option label="All Seasons" :value="SEASON_FILTER_ALL" />
						<el-option
							v-for="item in seasons"
							:key="item.id"
							:label="item.name"
							:value="item.id"
						/>
					</el-select>
					<el-select
						v-if="!isAllSeasons"
						v-model="selectedTeamFilter"
						placeholder="Team"
						class="team-select"
						size="large"
						:popper-options="dropdownPopperOptions"
					>
						<el-option label="All Teams" :value="TEAM_FILTER_ALL" />
						<el-option
							v-for="team in teams"
							:key="team.id"
							:label="team.name"
							:value="team.id"
						/>
					</el-select>
					<el-input
						v-model="playerSearch"
						placeholder="Search player"
						class="player-search"
						size="large"
						clearable
					/>
				</div>
			</header>

			<div
				v-loading="loading"
				element-loading-text="Loading..."
				id="players-body"
			>
				<div v-if="!loading && filteredPlayers.length > 0" class="players-grid">
					<div
						v-for="player in filteredPlayers"
						:key="player.id"
						class="player-card"
					>
						<div class="player-head">
							<div class="avatar-wrap">
								<img :src="getPlayerAvatar(player)" class="player-avatar" />
							</div>
							<div>
								<div class="player-name poppins-semibold">{{ getPlayerName(player) }}</div>
								<div class="player-country">
									<span class="country-flag-wrap">
										<img
											v-if="getCountryIso2(player.nationality_id)"
											:src="getCountryFlagUrl(player.nationality_id)"
											:alt="`${getCountryName(player.nationality_id)} flag`"
											class="country-flag"
											loading="lazy"
										/>
										<span v-else class="country-flag-fallback">--</span>
									</span>
									<span>{{ getCountryName(player.nationality_id) }}</span>
								</div>
							</div>
						</div>
						<div class="player-team-row">
							<span v-if="!isAllSeasons" class="team-pill">
								{{ getAssignedTeam(player.id)?.name }}
							</span>
							<span class="age-pill">
								{{ getAgeText(player.date_of_birth) }}
							</span>
						</div>
						<div class="meta-row">
							<div class="meta-item">
								<div class="meta-label">DOB</div>
								<div class="meta-value">{{ formatDob(player.date_of_birth) }}</div>
							</div>
							<div class="meta-item">
								<div class="meta-label">Debut</div>
								<div class="meta-value">{{ player.debut_season_name || "N/A" }}</div>
							</div>
						</div>
						<div class="career-metrics">
							<div class="metric-card">
								<div class="metric-title">Coins</div>
								<div class="metric-number">
									{{ player.total_coins_pocketed || 0 }}
								</div>
							</div>
							<div class="metric-card">
								<div class="metric-title">Fines</div>
								<div class="metric-number">
									{{ player.total_coins_fined || 0 }}
								</div>
							</div>
							<div class="metric-card">
								<div class="metric-title">Pockets</div>
								<div class="metric-number">
									{{ player.total_strikers_pocketed || 0 }}
								</div>
							</div>
						</div>
					</div>
				</div>
				<div v-else-if="!loading" class="empty-state">
					{{ isAllSeasons ? "No players found." : "Data is not available for this season." }}
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useSeasonStore } from "@/store/seasonStore";
import { useTeamStore } from "@/store/teamStore";
import { useRosterStore } from "@/store/rosterStore";
import { usePlayerStore } from "@/store/playerStore";
import { useCountryStore } from "@/store/countryStore";
import dayjs from "@/plugins/dayjs";
import { resolveAsset } from "@/utils/common";

const SEASON_FILTER_ALL = "all_seasons";
const TEAM_FILTER_ALL = "all";

const seasonStore = useSeasonStore();
const teamStore = useTeamStore();
const rosterStore = useRosterStore();
const playerStore = usePlayerStore();
const countryStore = useCountryStore();

const selectedSeason = ref(SEASON_FILTER_ALL);
const selectedTeamFilter = ref(TEAM_FILTER_ALL);
const playerSearch = ref("");
const loading = ref(false);
const seasons = ref([]);
const teams = ref([]);
const seasonRosters = ref([]);
const dropdownPopperOptions = ref({
	placement: "bottom-start",
	modifiers: [
		{
			name: "flip",
			enabled: false,
		},
	],
});

const isAllSeasons = computed(() => selectedSeason.value === SEASON_FILTER_ALL);

const countryById = computed(() => {
	const map = new Map();
	for (const country of countryStore.countries || []) {
		map.set(country.id, country);
	}
	return map;
});

const playerTeamMap = computed(() => {
	const map = new Map();
	for (const teamHistory of seasonRosters.value || []) {
		const teamId = teamHistory.team_id;
		for (const player of teamHistory.players || []) {
			map.set(player.player_id, teamId);
		}
	}
	return map;
});

const teamById = computed(() => {
	const map = new Map();
	for (const team of teams.value || []) {
		map.set(team.id, team);
	}
	return map;
});

const filteredPlayers = computed(() => {
	const search = playerSearch.value.trim().toLowerCase();
	let players = playerStore.playerProfiles || [];

	if (!isAllSeasons.value) {
		players = players.filter((player) => playerTeamMap.value.has(player.id));
	}

	return players
		.filter((player) => {
			const assignedTeamId = playerTeamMap.value.get(player.id) || null;

			if (
				!isAllSeasons.value &&
				selectedTeamFilter.value !== TEAM_FILTER_ALL &&
				assignedTeamId !== selectedTeamFilter.value
			) {
				return false;
			}

			if (!search) {
				return true;
			}

			const fullName = `${player.first_name} ${player.last_name}`.toLowerCase();
			const countryName = getCountryName(player.nationality_id).toLowerCase();
			const teamName = (getAssignedTeam(player.id)?.name || "").toLowerCase();

			return (
				fullName.includes(search) ||
				countryName.includes(search) ||
				teamName.includes(search)
			);
		})
		.sort((a, b) =>
			`${a.first_name} ${a.last_name}`.localeCompare(
				`${b.first_name} ${b.last_name}`,
			),
		);
});

const getAssignedTeam = (playerId) => {
	const teamId = playerTeamMap.value.get(playerId);
	if (!teamId) {
		return null;
	}
	return teamById.value.get(teamId) || null;
};

const getCountryName = (countryId) => {
	if (!countryId) {
		return "Country unavailable";
	}
	return countryById.value.get(countryId)?.name || "Country unavailable";
};

const getCountryIso2 = (countryId) => {
	if (!countryId) {
		return "";
	}
	const iso2 = countryById.value.get(countryId)?.iso_code2 || "";
	return iso2.trim().toLowerCase();
};

const getCountryFlagUrl = (countryId) => {
	const iso2 = getCountryIso2(countryId);
	if (!iso2) {
		return "";
	}
	return `https://flagcdn.com/w40/${iso2}.png`;
};

const getPlayerName = (player) => `${player.first_name} ${player.last_name}`;

const toSlug = (value) => (value || "").toLowerCase().trim().replace(/\s+/g, "-");

const getPlayerAvatar = (player) =>
	resolveAsset(
		`public/assets/images/players/${toSlug(player.first_name)}-${toSlug(player.last_name)}.png`,
	);

const formatDob = (dob) => {
	if (!dob) {
		return "N/A";
	}
	return dayjs(dob).format("DD MMM YYYY");
};

const getAgeText = (dob) => {
	if (!dob) {
		return "Age N/A";
	}
	const years = dayjs().diff(dayjs(dob), "year");
	return `${years} yrs`;
};

const fetchPlayersDirectory = async () => {
	loading.value = true;
	try {
		const tasks = [playerStore.fetchPlayerProfiles(), countryStore.fetchCountries()];
		if (!isAllSeasons.value) {
			tasks.push(
				(async () => {
					seasonStore.setSeason(selectedSeason.value);
					if (!rosterStore.teams.has(selectedSeason.value)) {
						await rosterStore.fetchTeamDetails(selectedSeason.value);
					}
				})(),
			);
		}

		const results = await Promise.allSettled(tasks);
		const playersResult = results[0];
		const countriesResult = results[1];
		const rosterResult = !isAllSeasons.value ? results[2] : null;

		if (playersResult.status === "rejected") {
			console.error("Failed to fetch players", playersResult.reason);
		}
		if (countriesResult.status === "rejected") {
			console.error("Failed to fetch countries", countriesResult.reason);
		}
		if (!isAllSeasons.value && rosterResult?.status === "rejected") {
			console.error("Failed to fetch season roster", rosterResult.reason);
			seasonRosters.value = [];
		} else if (!isAllSeasons.value) {
			seasonRosters.value = rosterStore.teams.get(selectedSeason.value) || [];
		} else {
			seasonRosters.value = [];
			selectedTeamFilter.value = TEAM_FILTER_ALL;
		}
	} catch (error) {
		console.error("Failed to fetch players directory", error);
		seasonRosters.value = [];
	} finally {
		loading.value = false;
	}
};

onMounted(async () => {
	seasons.value = seasonStore.seasons;
	teams.value = teamStore.teams;
	selectedSeason.value = SEASON_FILTER_ALL;
	await fetchPlayersDirectory();
});
</script>

<style scoped lang="scss">
::v-deep(.el-select__wrapper.is-focused),
::v-deep(.el-input__wrapper.is-focus) {
	box-shadow: 0 0 0 1px var(--el-border-color) inset;
}

.players-shell {
	width: 100%;
}

#players-body {
	min-height: 220px;
	border: 1px solid #dbe7f6;
	padding: clamp(10px, 2vw, 16px);
	border-radius: var(--cpl-radius-lg);
	background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
	box-shadow:
		0 10px 24px rgba(37, 99, 235, 0.08),
		0 2px 8px rgba(0, 0, 0, 0.04);
}

.players-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 14px;
}

.player-card {
	border: 1px solid #e2e8f0;
	border-radius: 12px;
	padding: 12px;
	background: #ffffff;
	display: flex;
	flex-direction: column;
	gap: 10px;
	transition: all 0.2s ease;
}

.player-card:hover {
	transform: translateY(-2px);
	box-shadow: 0 12px 20px rgba(30, 58, 138, 0.08);
}

.player-head {
	display: flex;
	align-items: center;
	gap: 10px;
}

.avatar-wrap {
	padding: 3px;
	border-radius: 50%;
	background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%);
}

.player-avatar {
	width: 54px;
	height: 54px;
	border-radius: 50%;
	object-fit: cover;
	border: 2px solid #ffffff;
}

.player-name {
	font-size: 16px;
	color: #0f172a;
}

.player-country {
	font-size: 12px;
	color: #64748b;
	display: flex;
	align-items: center;
	gap: 6px;
}

.country-flag {
	width: 18px;
	height: 14px;
	object-fit: cover;
	border-radius: 2px;
	border: 1px solid #e2e8f0;
}

.country-flag-wrap {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 18px;
}

.country-flag-fallback {
	font-size: 10px;
	color: #94a3b8;
	letter-spacing: -0.5px;
}

.player-team-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 8px;
}

.team-pill {
	font-size: 11px;
	padding: 5px 8px;
	border-radius: 999px;
	background: #dbeafe;
	border: 1px solid #bfdbfe;
	color: #1d4ed8;
}

.age-pill {
	font-size: 11px;
	color: #334155;
	background: #f8fafc;
	border: 1px solid #e2e8f0;
	border-radius: 999px;
	padding: 5px 8px;
}

.meta-row {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 8px;
}

.meta-item {
	border: 1px solid #edf2f7;
	background: #f8fafc;
	border-radius: 10px;
	padding: 7px;
}

.meta-label {
	font-size: 11px;
	color: #64748b;
}

.meta-value {
	font-size: 13px;
	color: #1e293b;
}

.career-metrics {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 8px;
}

.metric-card {
	border: 1px solid #e5e7eb;
	background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
	border-radius: 10px;
	padding: 6px;
	text-align: center;
}

.metric-title {
	font-size: 11px;
	color: #64748b;
}

.metric-number {
	font-size: 14px;
	font-weight: 600;
	color: #0f172a;
}

.empty-state {
	color: #64748b;
	font-size: 13px;
	text-align: center;
	padding: 12px 0;
}

.page-filters > * {
	width: 180px;
}

@media (min-width: 1200px) {
	.players-grid {
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}
}

@media (max-width: 991.98px) {
	.players-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

@media (max-width: 767.98px) {
	.page-filters > * {
		width: 100%;
	}
}

@media (max-width: 575.98px) {
	.players-grid {
		grid-template-columns: 1fr;
	}
}
</style>

