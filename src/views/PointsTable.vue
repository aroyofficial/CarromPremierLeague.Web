<template>
	<div class="page-container">
		<header class="page-heading">
			<div>
				<span class="page-eyebrow">Standings</span>
				<h1 class="page-title">Points Table</h1>
			</div>
			<div class="page-filters">
				<el-select
					v-model="selectedSeason"
					placeholder="Select Season"
					size="large"
					:popper-options="dropdownPopperOptions"
					@change="fetchLeagueTable"
				>
					<el-option v-for="item in seasons" :key="item.id" :label="item.name" :value="item.id" />
				</el-select>
			</div>
		</header>

		<div v-loading="loading" element-loading-text="Loading..." class="table-card">
			<div v-if="dataAvailable && standings.length" class="table-scroll">
				<table class="standings">
					<thead>
						<tr>
							<th class="col-rank" scope="col">#</th>
							<th class="col-team" scope="col">Team</th>
							<th scope="col"><abbr title="Played">P</abbr></th>
							<th scope="col"><abbr title="Won">W</abbr></th>
							<th scope="col"><abbr title="Drawn">D</abbr></th>
							<th scope="col"><abbr title="Lost">L</abbr></th>
							<th scope="col"><abbr title="Net coins">NET</abbr></th>
							<th scope="col"><abbr title="Points">PTS</abbr></th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="(row, index) in standings"
							:key="row.team_id"
							:class="getRowClassName(row, index)"
							:style="{ '--i': index }"
						>
							<td class="col-rank">{{ index + 1 }}</td>
							<td class="col-team">
								<div class="team-cell">
									<img :src="getTeamLogo(row.team_id)" :alt="''" class="logo" />
									<span class="team-name">{{ row.team_name }}</span>
									<span v-if="isWinnerRow(row)" class="badge" title="Champion">&#127942;</span>
								</div>
							</td>
							<td>{{ row.matches_played }}</td>
							<td>{{ row.wins }}</td>
							<td>{{ row.draws || 0 }}</td>
							<td>{{ row.losses }}</td>
							<td :class="{ positive: row.net_points > 0, negative: row.net_points < 0 }">{{ row.net_points }}</td>
							<td class="col-pts">{{ row.points }}</td>
						</tr>
					</tbody>
				</table>
			</div>
			<div v-else-if="!loading" class="empty-state">
				{{ errorMessage || (dataAvailable ? "No standings have been recorded yet." : "Data is not available for this season.") }}
			</div>

			<div v-if="standings.length && (isSeasonEnded() || isLeagueStageCompleted())" class="legend">
				<span v-if="isSeasonEnded()"><i class="dot winner"></i>Champion</span>
				<template v-else-if="standings.length > 4">
					<span><i class="dot finalist"></i>Qualified for Final</span>
					<span><i class="dot eliminator"></i>Eliminator</span>
				</template>
				<span v-else><i class="dot finalist"></i>Qualified for Final</span>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useSeasonStore } from "@/store/seasonStore";
import { useTeamStore } from "@/store/teamStore";
import { useMatchStore } from "@/store/matchStore";
import { BackgroundMusic, MatchCategory, MatchStatus, SeasonStatus } from "@/utils/constants";
import { pauseBgm, playBgm } from "@/utils/common";

const seasonStore = useSeasonStore();
const teamStore = useTeamStore();
const matchStore = useMatchStore();
const selectedSeason = ref(null);
const seasons = ref([]);
const leagueTable = ref(null);
const loading = ref(false);
const errorMessage = ref("");
const dropdownPopperOptions = ref({
	placement: "bottom-start",
	modifiers: [{ name: "flip", enabled: false }],
});

const standings = computed(() => leagueTable.value?.standings || []);
const dataAvailable = computed(() => leagueTable.value?.data_available !== false);

const getTeamLogo = (teamId) => teamStore.teams.find((t) => t.id === teamId)?.logo_url;

const fetchLeagueTable = async () => {
	if (!selectedSeason.value) return;
	loading.value = true;
	errorMessage.value = "";
	try {
		seasonStore.setSeason(selectedSeason.value);
		await Promise.all([
			seasonStore.fetchLeagueTable(),
			matchStore.fetchMatches(selectedSeason.value),
		]);
		const table = seasonStore.leagueTable;
		(table?.standings || []).forEach((team) => {
			team.losses = team.matches_played - team.wins - (team.draws || 0);
		});
		leagueTable.value = table;
	} catch (error) {
		console.error("Failed to load league table", error);
		leagueTable.value = null;
		errorMessage.value = "Unable to load the points table right now. Please try again.";
	} finally {
		loading.value = false;
	}
};

const isSeasonEnded = () => leagueTable.value?.season_status === SeasonStatus.FINISHED;

const isWinnerRow = (row) => isSeasonEnded() && row.team_id === leagueTable.value?.winner_id;

const isLeagueStageCompleted = () => {
	if (isSeasonEnded()) return false;
	const leagueCategoryId = MatchCategory.find((c) => c.name === "League")?.id;
	const playedStatusId = MatchStatus.find((s) => s.name === "Played")?.id;
	const leagueMatches = matchStore.matches.filter(
		(m) => m.season_id === selectedSeason.value && m.category === leagueCategoryId,
	);
	return leagueMatches.length > 0 && leagueMatches.every((m) => m.status === playedStatusId);
};

const getRowClassName = (row, index) => {
	if (isWinnerRow(row)) return "winner-row";
	if (!isLeagueStageCompleted()) return "";
	if (standings.value.length > 4) {
		if (index === 0) return "finalist-row";
		if (index === 1 || index === 2) return "eliminator-row";
		return "";
	}
	if (index < 2) return "finalist-row";
	return "";
};

let musicStart = null;

const releaseMusicGesture = () => {
	window.removeEventListener("pointerdown", startTableMusic);
	window.removeEventListener("keydown", startTableMusic);
};

const startTableMusic = () => {
	if (musicStart) return musicStart;
	musicStart = playBgm(BackgroundMusic.Match).then(() => {
		const audio = document.getElementById(BackgroundMusic.Match);
		if (audio && !audio.paused) {
			releaseMusicGesture();
			return;
		}
		musicStart = null;
	});
	return musicStart;
};

onMounted(() => {
	seasons.value = seasonStore.visibleSeasons;
	selectedSeason.value = seasonStore.selectedSeason;
	fetchLeagueTable();
	startTableMusic();
	window.addEventListener("pointerdown", startTableMusic);
	window.addEventListener("keydown", startTableMusic);
});

onUnmounted(() => {
	window.removeEventListener("pointerdown", startTableMusic);
	window.removeEventListener("keydown", startTableMusic);
	pauseBgm(BackgroundMusic.Match, 400);
});
</script>

<style lang="scss" scoped>
.table-card {
	min-height: 240px;
	padding: clamp(8px, 2vw, 16px);
	border-radius: var(--cpl-radius-lg);
	background: #fff;
	border: 1px solid var(--cpl-line);
	box-shadow: var(--cpl-shadow-card);
}

.table-scroll {
	overflow-x: auto;
}

.standings {
	width: 100%;
	border-collapse: separate;
	border-spacing: 0;
	font-size: 15px;

	th {
		padding: 12px 10px;
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--cpl-ink-400);
		text-align: center;
		border-bottom: 1px solid var(--cpl-line);
		white-space: nowrap;
	}

	abbr {
		text-decoration: none;
		cursor: help;
	}

	td {
		padding: 14px 10px;
		text-align: center;
		border-bottom: 1px solid #f1f5f9;
		font-variant-numeric: tabular-nums;
	}

	tbody tr {
		animation: row-in 0.4s ease both;
		animation-delay: calc(var(--i) * 60ms);
		transition: background 0.2s ease;

		&:hover {
			background: #f8fafc;
		}

		&:last-child td {
			border-bottom: none;
		}
	}

	.col-rank {
		width: 44px;
		font-weight: 700;
		color: var(--cpl-ink-400);
	}

	.col-team {
		text-align: left;
	}

	.col-pts {
		font-weight: 800;
		font-size: 17px;
		color: var(--cpl-ink-900);
	}

	.positive {
		color: #15803d;
	}

	.negative {
		color: #b91c1c;
	}
}

.team-cell {
	display: flex;
	align-items: center;
	gap: 12px;
	min-width: 0;
}

.logo {
	width: 36px;
	height: 36px;
	flex-shrink: 0;
	border-radius: 50%;
	object-fit: cover;
	box-shadow: 0 0 0 1px var(--cpl-line);
}

.team-name {
	font-weight: 600;
	color: var(--cpl-ink-900);
}

.winner-row td {
	background: linear-gradient(90deg, #fff8d6 0%, #fff2ad 100%);
}

.winner-row td:first-child {
	box-shadow: inset 4px 0 0 #d4a017;
}

.finalist-row td {
	background: linear-gradient(90deg, #e6f3ff 0%, #f2f8ff 100%);
}

.finalist-row td:first-child {
	box-shadow: inset 4px 0 0 #2f7fbf;
}

.eliminator-row td {
	background: linear-gradient(90deg, #fff4e5 0%, #fff9f2 100%);
}

.eliminator-row td:first-child {
	box-shadow: inset 4px 0 0 #d97706;
}

.legend {
	display: flex;
	gap: 16px;
	padding: 12px 10px 4px;
	font-size: 12px;
	color: var(--cpl-ink-600);

	span {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
}

.dot {
	width: 10px;
	height: 10px;
	border-radius: 50%;

	&.winner {
		background: #d4a017;
	}
	&.finalist {
		background: #2f7fbf;
	}
	&.eliminator {
		background: #d97706;
	}
}

.empty-state {
	min-height: 200px;
	display: grid;
	place-items: center;
	text-align: center;
	color: var(--cpl-ink-600);
}

@media (max-width: 575.98px) {
	.standings {
		font-size: 13px;

		th,
		td {
			padding: 10px 4px;
		}

		.col-rank {
			width: 24px;
		}

		.col-pts {
			font-size: 15px;
		}
	}

	.team-cell {
		gap: 8px;
	}

	.logo {
		width: 28px;
		height: 28px;
	}

	.team-name {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		line-height: 1.25;
	}
}

@keyframes row-in {
	from {
		opacity: 0;
		transform: translateX(-8px);
	}
	to {
		opacity: 1;
		transform: none;
	}
}
</style>
