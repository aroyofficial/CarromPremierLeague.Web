<template>
	<div id="stats-wrapper" class="d-flex flex-column align-items-center mt-5">
		<div class="stats-shell d-flex flex-column">
			<div class="stats-topbar mb-4">
				<div>
					<div class="stats-title-row">
						<div class="stats-header poppins-semibold">Golden Striker</div>
						<el-tooltip
							content="Tie-break order: fewer fines, then fewer striker pockets."
							placement="top"
						>
							<el-icon class="info-icon"><InfoFilled /></el-icon>
						</el-tooltip>
					</div>
					<div class="stats-subtitle">Top 3 coin potters from league stage</div>
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
			<div v-loading="loading" element-loading-text="Loading..." id="stats-body">
				<div class="status-row">
					<div class="completion-pill" :class="{ done: isLeagueStageCompleted }">
						{{ isLeagueStageCompleted ? "League Stage Completed" : "League Stage Ongoing" }}
					</div>
				</div>
				<div
					v-if="!loading && topCoinPotters.length > 0"
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
							<img :src="getPlayerAvatar(player)" class="player-avatar" />
						</div>
						<div class="player-name poppins-semibold">
							{{ player.first_name }} {{ player.last_name }}
						</div>
						<div class="player-team">
							{{ player.team_name || "Team unavailable" }}
						</div>
						<div class="coins-pill poppins-semibold">Coins: {{ player.coins_pocketed }}</div>
						<div class="metric-row">
							<div class="metric-box">
								<div class="metric-label">Fines</div>
								<div class="metric-value">{{ player.coins_fined || 0 }}</div>
							</div>
							<div class="metric-box">
								<div class="metric-label">Strikers</div>
								<div class="metric-value">{{ player.strikers_pocketed || 0 }}</div>
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
import { ref, onMounted } from "vue";
import { useSeasonStore } from "@/store/seasonStore";
import { useStatsStore } from "@/store/statsStore";
import { resolveAsset } from "@/utils/common";
import { InfoFilled } from "@element-plus/icons-vue";

const seasonStore = useSeasonStore();
const statsStore = useStatsStore();
const selectedSeason = ref(null);
const seasons = ref([]);
const topCoinPotters = ref([]);
const emptyMessage = ref("No league stage coin stats available for this season.");
const isLeagueStageCompleted = ref(false);
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

const toSlug = (value) => (value || "").toLowerCase().trim().replace(/\s+/g, "-");

const getPlayerAvatar = (player) => {
	if (player.avatar_url) {
		return player.avatar_url;
	}
	return resolveAsset(
		`public/assets/images/players/${toSlug(player.first_name)}-${toSlug(player.last_name)}.png`,
	);
};

const fetchTopCoinPotters = async () => {
	if (!selectedSeason.value) {
		topCoinPotters.value = [];
		isLeagueStageCompleted.value = false;
		emptyMessage.value = "Please select a season to view stats.";
		return;
	}

	loading.value = true;
	try {
		seasonStore.setSeason(selectedSeason.value);
		const result = await statsStore.fetchSeasonTopCoinPotters(
			selectedSeason.value,
			3,
			true,
		);
		topCoinPotters.value = result.players || [];
		isLeagueStageCompleted.value = result.isLeagueStageCompleted || false;
		emptyMessage.value =
			result.message || "No league stage coin stats available for this season.";
	} catch (error) {
		console.error("Failed to fetch golden striker stats", error);
		topCoinPotters.value = [];
		isLeagueStageCompleted.value = false;
		emptyMessage.value = "Unable to load stats right now. Please try again.";
	} finally {
		loading.value = false;
	}
};

onMounted(async () => {
	seasons.value = seasonStore.seasons;
	selectedSeason.value = seasonStore.selectedSeason;
	await fetchTopCoinPotters();
});
</script>

<style scoped lang="scss">
::v-deep(.el-select__wrapper.is-focused) {
	box-shadow: 0 0 0 1px var(--el-border-color) inset;
}

#stats-wrapper {
	padding: 20px 12%;
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
	width: 190px;
}

.stats-header {
	font-size: 24px;
	color: #14532d;
	line-height: 1.2;
}

.stats-title-row {
	display: flex;
	align-items: center;
	gap: 8px;
}

.info-icon {
	font-size: 15px;
	color: #64748b;
	cursor: pointer;
}

.stats-subtitle {
	font-size: 13px;
	color: #6b7280;
}

#stats-body {
	min-height: 220px;
	border: 1px solid #d8f1e3;
	padding: 20px;
	border-radius: 14px;
	background: linear-gradient(180deg, #ffffff 0%, #f9fefb 100%);
	box-shadow:
		0 12px 28px rgba(22, 163, 74, 0.1),
		0 2px 8px rgba(0, 0, 0, 0.04);
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
	border: 1px solid #d1d5db;
	color: #4b5563;
	background: #f9fafb;
}

.completion-pill.done {
	border-color: #86efac;
	color: #166534;
	background: #dcfce7;
}

.top-players-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 16px;
}

.player-card {
	border: 1px solid #e5efe9;
	background: #ffffff;
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
	border-color: #fbbf24;
	background: radial-gradient(
		circle at 15% 10%,
		#fff3c4 0%,
		#fff8dd 42%,
		#ffffff 100%
	);
	box-shadow:
		0 0 0 1px rgba(245, 158, 11, 0.25),
		0 14px 28px rgba(245, 158, 11, 0.24),
		0 0 26px rgba(250, 204, 21, 0.28);
}

.rank-badge {
	font-size: 13px;
	padding: 3px 10px;
	border-radius: 999px;
	background: #ecfdf3;
	color: #166534;
	border: 1px solid #c7ead7;
}

.avatar-wrap {
	padding: 4px;
	border-radius: 50%;
	background: linear-gradient(135deg, #d1f7e3 0%, #f2fcf7 100%);
}

.player-avatar {
	width: 80px;
	height: 80px;
	border-radius: 50%;
	border: 2px solid #ffffff;
	object-fit: cover;
}

.player-name {
	font-size: 17px;
	text-align: center;
	color: #0f172a;
}

.player-team {
	font-size: 13px;
	color: #64748b;
	text-align: center;
}

.coins-pill {
	font-size: 13px;
	border-radius: 999px;
	padding: 5px 12px;
	background: #d1fae5;
	color: #065f46;
	border: 1px solid #bdeccf;
}

.metric-row {
	width: 100%;
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 8px;
}

.metric-box {
	background: #f8fafc;
	border: 1px solid #e2e8f0;
	border-radius: 10px;
	padding: 8px;
	text-align: center;
}

.metric-label {
	font-size: 11px;
	color: #64748b;
}

.metric-value {
	font-size: 15px;
	font-weight: 600;
	color: #0f172a;
}

.empty-state {
	min-height: 160px;
	display: flex;
	justify-content: center;
	align-items: center;
	color: #6b7280;
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
		width: 100%;
	}

	.status-row {
		flex-direction: column;
		align-items: flex-start;
	}

	.top-players-grid {
		grid-template-columns: 1fr;
	}
}
</style>
