<template>
	<div class="page-container">
		<StatsSwitch />
		<header class="page-heading">
			<div>
				<span class="page-eyebrow">Statistics</span>
				<h1 class="page-title">Player Stats</h1>
				<p class="page-subtitle">
					Each player's coins, fines, and striker pockets from every match played in the season.
				</p>
			</div>
			<div class="page-filters">
				<el-select
					v-model="selectedSeason"
					placeholder="Select Season"
					size="large"
					:popper-options="dropdownPopperOptions"
					@change="fetchPlayerStats"
				>
					<el-option v-for="item in seasons" :key="item.id" :label="item.name" :value="item.id" />
				</el-select>
			</div>
		</header>

		<div v-loading="loading" element-loading-text="Loading..." class="table-card">
			<div v-if="!loading && dataAvailable && players.length" class="table-scroll">
				<table class="standings">
					<thead>
						<tr>
							<th class="col-rank" scope="col"><abbr title="Rank by net coins, then coins, fewer double fines, fewer single fines, fewer opponent coins, fewer striker pockets">#</abbr></th>
							<th class="col-player" scope="col">Player</th>
							<th class="col-team" scope="col">Team</th>
							<th scope="col"><abbr title="Matches with a recorded scorecard">Matches</abbr></th>
							<th scope="col"><abbr title="Coins pocketed">C</abbr></th>
							<th scope="col"><abbr title="Opponent coins pocketed">OC</abbr></th>
							<th scope="col"><abbr title="Strikers pocketed">S</abbr></th>
							<th scope="col"><abbr title="Single fines">SF</abbr></th>
							<th scope="col"><abbr title="Double fines">DF</abbr></th>
							<th scope="col"><abbr title="Net coins: coins pocketed minus fined coins">Net</abbr></th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="(player, index) in players" :key="player.player_id" :style="{ '--i': index }">
							<td class="col-rank">{{ index + 1 }}</td>
							<td class="col-player">
								<div class="player-cell">
									<img :src="getPlayerAvatar(player)" alt="" class="avatar" />
									<span class="player-name">{{ player.first_name }} {{ player.last_name }}</span>
								</div>
							</td>
							<td class="col-team">{{ player.team_name || "Team unavailable" }}</td>
							<td>{{ player.matches_played }}</td>
							<td class="col-coins">{{ player.coins_pocketed }}</td>
							<td>{{ player.opponent_coins_pocketed }}</td>
							<td>{{ player.strikers_pocketed }}</td>
							<td>{{ player.single_fines }}</td>
							<td>{{ player.double_fines }}</td>
							<td class="col-coins">{{ player.net_coins ?? player.coins_pocketed - (player.coins_fined || 0) }}</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div v-else-if="!loading" class="empty-state">
				{{ emptyMessage }}
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useSeasonStore } from "@/store/seasonStore";
import { useStatsStore } from "@/store/statsStore";
import { resolveAsset } from "@/utils/common";
import StatsSwitch from "@/components/StatsSwitch.vue";

const seasonStore = useSeasonStore();
const statsStore = useStatsStore();
const selectedSeason = ref(null);
const seasons = ref([]);
const players = ref([]);
const dataAvailable = ref(false);
const emptyMessage = ref("Data is not available for this season.");
const loading = ref(false);
const dropdownPopperOptions = ref({
	placement: "bottom-start",
	modifiers: [{ name: "flip", enabled: false }],
});

const toSlug = (value) => (value || "").toLowerCase().trim().replace(/\s+/g, "-");

const getPlayerAvatar = (player) =>
	resolveAsset(
		`public/assets/images/players/${toSlug(player.first_name)}-${toSlug(player.last_name)}.png`,
	);

let statsRequest = 0;
let refreshTimer = null;

const fetchPlayerStats = async (options) => {
	const quiet = Boolean(options && options.quiet);
	if (quiet && statsRequest) return;
	if (!selectedSeason.value) {
		players.value = [];
		dataAvailable.value = false;
		emptyMessage.value = "Please select a season to view stats.";
		return;
	}

	const requestId = ++statsRequest;
	if (!quiet) loading.value = true;
	try {
		seasonStore.setSeason(selectedSeason.value);
		const result = await statsStore.fetchSeasonPlayerStats(selectedSeason.value, true);
		if (requestId !== statsRequest) return;
		dataAvailable.value = result.dataAvailable;
		players.value = result.dataAvailable ? result.players : [];
		emptyMessage.value = result.dataAvailable
			? result.players.length
				? ""
				: "No players are listed for this season."
			: "Data is not available for this season.";
	} catch (error) {
		console.error("Failed to fetch player stats", error);
		if (!quiet && requestId === statsRequest) {
			players.value = [];
			dataAvailable.value = false;
			emptyMessage.value = "Unable to load stats right now. Please try again.";
		}
	} finally {
		if (requestId === statsRequest) statsRequest = 0;
		if (!quiet) loading.value = false;
	}
};

const refreshPlayerStatsIfVisible = () => {
	if (document.visibilityState === "visible") fetchPlayerStats({ quiet: true });
};

onMounted(() => {
	seasons.value = seasonStore.visibleSeasons;
	selectedSeason.value = seasonStore.selectedSeason;
	fetchPlayerStats();
	refreshTimer = setInterval(() => fetchPlayerStats({ quiet: true }), 5000);
	document.addEventListener("visibilitychange", refreshPlayerStatsIfVisible);
});

onUnmounted(() => {
	clearInterval(refreshTimer);
	document.removeEventListener("visibilitychange", refreshPlayerStatsIfVisible);
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
	-webkit-overflow-scrolling: touch;
	background:
		linear-gradient(to left, #fff 30%, rgba(255, 255, 255, 0)) right / 40px 100% no-repeat local,
		radial-gradient(farthest-side at 100% 50%, rgba(15, 23, 42, 0.16), transparent) right / 14px 100% no-repeat scroll;
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
		color: var(--cpl-ink-900);
	}

	tbody tr {
		animation: row-in 0.4s ease both;
		animation-delay: calc(var(--i) * 40ms);
		transition: background 0.2s ease;

		&:hover {
			background: #f8fafc;
		}

		&:last-child td {
			border-bottom: none;
		}
	}

	.col-player,
	.col-team {
		text-align: left;
	}

	.col-coins {
		font-weight: 800;
		font-size: 17px;
	}
}

.player-cell {
	display: flex;
	align-items: center;
	gap: 12px;
	min-width: 180px;
}

.avatar {
	width: 36px;
	height: 36px;
	flex-shrink: 0;
	border-radius: 50%;
	object-fit: cover;
	box-shadow: 0 0 0 1px var(--cpl-line);
}

.player-name {
	font-weight: 600;
}

.empty-state {
	min-height: 200px;
	display: grid;
	place-items: center;
	text-align: center;
	color: var(--cpl-ink-600);
	padding: 16px;
}

@media (max-width: 575.98px) {
	.standings {
		font-size: 13px;

		th,
		td {
			padding: 10px 6px;
		}

		.col-coins {
			font-size: 15px;
		}
	}

	.player-cell {
		gap: 8px;
		min-width: 132px;
	}

	.avatar {
		width: 28px;
		height: 28px;
	}
}

@media (max-width: 767.98px) {
	.standings {
		--rank-col: 34px;

		.col-rank,
		.col-player {
			position: sticky;
			z-index: 1;
			background: #fff;
		}

		.col-rank {
			left: 0;
			box-sizing: border-box;
			width: var(--rank-col);
			min-width: var(--rank-col);
			padding-right: 2px;
			padding-left: 2px;
		}

		.col-player {
			left: var(--rank-col);
			box-shadow: 6px 0 8px -8px rgba(15, 23, 42, 0.35);
		}

		tbody tr:hover .col-rank,
		tbody tr:hover .col-player {
			background: #f8fafc;
		}
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
