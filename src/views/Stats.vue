<template>
	<div id="stats-wrapper" class="page-container d-flex flex-column align-items-center">
		<div class="stats-shell d-flex flex-column">
			<StatsSwitch />
			<div class="stats-topbar mb-4">
				<div>
					<div class="stats-title-row">
						<div class="stats-header poppins-semibold">Golden Striker</div>
						<AppTooltip
							content="Ranked by net coins (coins pocketed minus fined coins), then coins pocketed, fewer double fines, fewer single fines, fewer opponent coins, fewer striker pockets, then name."
							placement="top"
						>
							<el-icon class="info-icon"><InfoFilled /></el-icon>
						</AppTooltip>
					</div>
					<div class="stats-subtitle">
						The player with the most net coins in this season's league-stage matches
					</div>
				</div>
				<div class="stats-controls">
					<el-select
						v-model="selectedSeason"
						placeholder="Select Season"
						class="season-select"
						size="large"
						:popper-options="dropdownPopperOptions"
						@change="fetchTopCoinPotters"
					>
						<el-option
							v-for="item in seasons"
							:key="item.id"
							:label="item.name"
							:value="item.id"
						/>
					</el-select>
				</div>
			</div>
			<div v-loading="loading" id="stats-body">
				<div v-if="showBoard" class="status-row">
					<div class="completion-pill" :class="{ done: isLeagueStageCompleted }">
						{{ isLeagueStageCompleted ? "League Stage Completed" : "League Stage Ongoing" }}
					</div>
				</div>
				<div
					v-if="!loading && showBoard"
					class="top-players-grid"
				>
					<div
						v-for="(player, index) in topCoinPotters"
						:key="player.player_id"
						class="player-card"
						:class="{ 'golden-glow-card': isLeagueStageCompleted && index === 0 }"
					>
						<div class="rank-badge poppins-semibold">
							<span>#{{ index + 1 }}</span>
						</div>
						<div class="avatar-wrap">
							<EntityImage :src="player.avatar_url || ''" :name="playerName(player)" kind="player" class="player-avatar" />
						</div>
						<div class="player-name poppins-semibold">
							{{ player.first_name }} {{ player.last_name }}
						</div>
						<div class="player-team">
							{{ player.team_name || "Team unavailable" }}
						</div>
						<div class="coins-pill poppins-semibold">Net coins: {{ player.net_coins ?? player.coins_pocketed - (player.coins_fined || 0) }}</div>
						<div class="metric-row">
							<div class="metric-box">
								<div class="metric-label">Coins</div>
								<div class="metric-value">{{ player.coins_pocketed || 0 }}</div>
							</div>
							<div class="metric-box">
								<div class="metric-label">Opp. coins</div>
								<div class="metric-value">{{ player.opponent_coins_pocketed || 0 }}</div>
							</div>
						</div>
						<div class="metric-row">
							<div class="metric-box">
								<div class="metric-label">Single fines</div>
								<div class="metric-value">{{ player.single_fines || 0 }}</div>
							</div>
							<div class="metric-box">
								<div class="metric-label">Double fines</div>
								<div class="metric-value">{{ player.double_fines || 0 }}</div>
							</div>
						</div>
					</div>
				</div>
				<div v-else-if="!loading" class="empty-state">
					{{ emptyMessage }}
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { computed, ref, onMounted, watch } from "vue";
import { useSeasonStore } from "@/store/seasonStore";
import { useStatsStore } from "@/store/statsStore";
import { playerName } from "@/utils/media";
import { areas } from "@/utils/realtimeRules";
import { useLive } from "@/utils/useLive";
import AppTooltip from "@/components/AppTooltip.vue";
import EntityImage from "@/components/EntityImage.vue";
import { InfoFilled } from "@element-plus/icons-vue";
import StatsSwitch from "@/components/StatsSwitch.vue";
import { NO_MATCH_SCHEDULED, showGoldenStriker, strikerEmptyMessage } from "@/utils/goldenStriker";

const seasonStore = useSeasonStore();
const statsStore = useStatsStore();
const selectedSeason = ref(null);
const seasons = ref([]);
const topCoinPotters = ref([]);
const matchesPlayed = ref(0);
const emptyMessage = ref(NO_MATCH_SCHEDULED);
const isLeagueStageCompleted = ref(false);
const showBoard = computed(() =>
	showGoldenStriker({ matchesPlayed: matchesPlayed.value, players: topCoinPotters.value }),
);
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

let statsRequest = 0;

const fetchTopCoinPotters = async (options) => {
	const quiet = Boolean(options && options.quiet);
	if (quiet && statsRequest) return;
	if (!selectedSeason.value) {
		topCoinPotters.value = [];
		matchesPlayed.value = 0;
		isLeagueStageCompleted.value = false;
		emptyMessage.value = "Please select a season to view stats.";
		return;
	}

	const requestId = ++statsRequest;
	if (!quiet) loading.value = true;
	try {
		seasonStore.setSeason(selectedSeason.value);
		const result = await statsStore.fetchSeasonTopCoinPotters(
			selectedSeason.value,
			3,
			true,
		);
		if (requestId !== statsRequest) return;
		topCoinPotters.value = result.players || [];
		matchesPlayed.value = result.matchesPlayed ?? null;
		isLeagueStageCompleted.value = result.isLeagueStageCompleted || false;
		emptyMessage.value =
			strikerEmptyMessage(result.message, {
				matchesPlayed: matchesPlayed.value,
				players: topCoinPotters.value,
			}) || NO_MATCH_SCHEDULED;
	} catch (error) {
		console.error("Failed to fetch golden striker stats", error);
		if (!quiet && requestId === statsRequest) {
			topCoinPotters.value = [];
			matchesPlayed.value = 0;
			isLeagueStageCompleted.value = false;
			emptyMessage.value = "Unable to load stats right now. Please try again.";
		}
	} finally {
		if (requestId === statsRequest) statsRequest = 0;
		if (!quiet) loading.value = false;
	}
};

useLive(() => fetchTopCoinPotters({ quiet: true }), { areas: areas.stats });

watch(
	() => seasonStore.visibleSeasons,
	(next) => {
		seasons.value = next;
	},
);

onMounted(() => {
	seasons.value = seasonStore.visibleSeasons;
	selectedSeason.value = seasonStore.selectedSeason;
	fetchTopCoinPotters();
});
</script>

<style scoped lang="scss">
::v-deep(.el-select__wrapper.is-focused) {
	box-shadow: 0 0 0 1px var(--el-border-color) inset;
}

#stats-wrapper {
	--st-title: #14532d;
	--st-muted: #64748b;
	--st-faint: #6b7280;
	--st-ink: #0f172a;
	--st-body-line: #d8f1e3;
	--st-body-bg: linear-gradient(180deg, #ffffff 0%, #f9fefb 100%);
	--st-body-shadow: 0 12px 28px rgba(22, 163, 74, 0.1), 0 2px 8px rgba(0, 0, 0, 0.04);
	--st-pill-line: #d1d5db;
	--st-pill-text: #4b5563;
	--st-pill-bg: #f9fafb;
	--st-done-line: #86efac;
	--st-done-text: #166534;
	--st-done-bg: #dcfce7;
	--st-card-line: #e5efe9;
	--st-card-bg: #ffffff;
	--st-gold-line: #fbbf24;
	--st-gold-bg: radial-gradient(circle at 15% 10%, #fff3c4 0%, #fff8dd 42%, #ffffff 100%);
	--st-rank-bg: #ecfdf3;
	--st-rank-line: #c7ead7;
	--st-ring: linear-gradient(135deg, #d1f7e3 0%, #f2fcf7 100%);
	--st-coins-bg: #d1fae5;
	--st-coins-text: #065f46;
	--st-coins-line: #bdeccf;
	--st-metric-bg: #f8fafc;
	--st-metric-line: #e2e8f0;
}

html.dark #stats-wrapper {
	--st-title: #86efac;
	--st-muted: var(--cpl-ink-600);
	--st-faint: var(--cpl-ink-600);
	--st-ink: var(--cpl-ink-900);
	--st-body-line: #1f3b30;
	--st-body-bg: linear-gradient(180deg, #131c2e 0%, #112421 100%);
	--st-body-shadow: 0 12px 28px rgba(0, 0, 0, 0.4);
	--st-pill-line: var(--cpl-line);
	--st-pill-text: var(--cpl-ink-600);
	--st-pill-bg: var(--cpl-surface-sunken);
	--st-done-line: rgba(134, 239, 172, 0.45);
	--st-done-text: #86efac;
	--st-done-bg: rgba(34, 197, 94, 0.14);
	--st-card-line: #233a35;
	--st-card-bg: #152031;
	--st-gold-line: rgba(251, 191, 36, 0.7);
	--st-gold-bg: radial-gradient(circle at 15% 10%, rgba(251, 191, 36, 0.24) 0%, rgba(251, 191, 36, 0.08) 42%, #152031 100%);
	--st-rank-bg: rgba(34, 197, 94, 0.14);
	--st-rank-line: rgba(134, 239, 172, 0.35);
	--st-ring: linear-gradient(135deg, rgba(34, 197, 94, 0.35) 0%, rgba(34, 197, 94, 0.1) 100%);
	--st-coins-bg: rgba(16, 185, 129, 0.16);
	--st-coins-text: #6ee7b7;
	--st-coins-line: rgba(110, 231, 183, 0.35);
	--st-metric-bg: var(--cpl-surface-sunken);
	--st-metric-line: var(--cpl-line);
}

.stats-shell {
	width: min(980px, 100%);
}

.stats-topbar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 16px;
}

.stats-controls {
	display: flex;
	align-items: center;
	gap: 10px;
}

.season-select {
	--el-select-width: 190px;
	width: 190px;
}

.stats-header {
	font-size: 24px;
	color: var(--st-title);
	line-height: 1.2;
}

.stats-title-row {
	display: flex;
	align-items: center;
	gap: 8px;
}

.info-icon {
	font-size: 15px;
	color: var(--st-muted);
	cursor: pointer;
}

.stats-subtitle {
	font-size: 13px;
	color: var(--st-faint);
}

#stats-body {
	min-height: 220px;
	border: 1px solid var(--st-body-line);
	padding: 20px;
	border-radius: 14px;
	background: var(--st-body-bg);
	box-shadow: var(--st-body-shadow);
}

.status-row {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	gap: 12px;
	margin-bottom: 16px;
}

.completion-pill {
	font-size: 12px;
	padding: 6px 10px;
	border-radius: 999px;
	border: 1px solid var(--st-pill-line);
	color: var(--st-pill-text);
	background: var(--st-pill-bg);
}

.completion-pill.done {
	border-color: var(--st-done-line);
	color: var(--st-done-text);
	background: var(--st-done-bg);
}

.top-players-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 16px;
}

.player-card {
	border: 1px solid var(--st-card-line);
	background: var(--st-card-bg);
	border-radius: 14px;
	padding: 16px 14px;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 9px;
	transition: all 0.25s ease;
}

.player-card:hover {
	transform: translateY(-2px);
	box-shadow: 0 12px 20px rgba(15, 23, 42, 0.08);
}

.golden-glow-card {
	border-color: var(--st-gold-line);
	background: var(--st-gold-bg);
	box-shadow:
		0 0 0 1px rgba(245, 158, 11, 0.25),
		0 14px 28px rgba(245, 158, 11, 0.24),
		0 0 26px rgba(250, 204, 21, 0.28);
}

.rank-badge {
	font-size: 13px;
	padding: 3px 10px;
	border-radius: 999px;
	background: var(--st-rank-bg);
	color: var(--st-done-text);
	border: 1px solid var(--st-rank-line);
}

.avatar-wrap {
	padding: 4px;
	border-radius: 50%;
	background: var(--st-ring);
}

.player-avatar {
	width: 80px;
	height: 80px;
	border-radius: 50%;
	border: 2px solid var(--st-card-bg);
	object-fit: cover;
}

.player-name {
	font-size: 17px;
	text-align: center;
	overflow-wrap: break-word;
	color: var(--st-ink);
}

.player-team {
	font-size: 13px;
	color: var(--st-muted);
	text-align: center;
}

.coins-pill {
	font-size: 13px;
	border-radius: 999px;
	padding: 5px 12px;
	background: var(--st-coins-bg);
	color: var(--st-coins-text);
	border: 1px solid var(--st-coins-line);
}

.metric-row {
	width: 100%;
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 8px;
}

.metric-box {
	background: var(--st-metric-bg);
	border: 1px solid var(--st-metric-line);
	border-radius: 10px;
	padding: 8px;
	text-align: center;
}

.metric-label {
	font-size: 11px;
	color: var(--st-muted);
}

.metric-value {
	font-size: 15px;
	font-weight: 600;
	color: var(--st-ink);
}

.empty-state {
	min-height: 160px;
	display: flex;
	justify-content: center;
	align-items: center;
	color: var(--st-faint);
}

@media (max-width: 900px) {
	.stats-topbar {
		flex-direction: column;
		align-items: flex-start;
	}

	.stats-controls {
		width: 100%;
	}

	.season-select {
		--el-select-width: 100%;
		width: 100%;
	}

	.status-row {
		flex-direction: column;
		align-items: flex-start;
	}

	.top-players-grid {
		gap: 10px;
	}

	.player-card {
		padding: 14px 10px;
	}
}

@media (max-width: 575.98px) {
	#stats-body {
		padding: 14px;
	}

	.top-players-grid {
		grid-template-columns: 1fr;
	}
}
</style>
