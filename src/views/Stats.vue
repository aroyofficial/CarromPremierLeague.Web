<template>
	<div id="stats-wrapper" class="d-flex flex-column align-items-center mt-5">
		<div class="d-flex flex-column" style="width: max-content">
			<div id="stats-filters" class="mb-4 d-flex justify-content-end">
				<el-select
					v-model="selectedSeason"
					placeholder="Select Season"
					style="width: 180px"
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
			<div v-loading="loading" element-loading-text="Loading..." id="stats-body">
				<div
					v-if="!loading && topCoinPotters.length > 0"
					class="top-players-grid"
				>
					<div
						v-for="(player, index) in topCoinPotters"
						:key="player.player_id"
						class="player-card"
					>
						<div class="rank-badge poppins-semibold">#{{ index + 1 }}</div>
						<img :src="getPlayerAvatar(player)" class="player-avatar" />
						<div class="player-name poppins-semibold">
							{{ player.first_name }} {{ player.last_name }}
						</div>
						<div class="player-team">
							{{ player.team_name || "Team unavailable" }}
						</div>
						<div class="coins-pill poppins-semibold">
							{{ player.coins_pocketed }} coins
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

const seasonStore = useSeasonStore();
const statsStore = useStatsStore();
const selectedSeason = ref(null);
const seasons = ref([]);
const topCoinPotters = ref([]);
const emptyMessage = ref("No league stage coin stats available for this season.");
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
		emptyMessage.value =
			result.message || "No league stage coin stats available for this season.";
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
	padding: 20px 15%;
}

#stats-body {
	min-height: 220px;
	min-width: 760px;
	border: 1px solid var(--el-border-color-lighter);
	padding: 18px;
	border-radius: 10px;
	box-shadow:
		0 10px 25px rgba(22, 163, 74, 0.14),
		0 20px 40px rgba(22, 163, 74, 0.08),
		0 2px 6px rgba(0, 0, 0, 0.05);
}

.top-players-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 16px;
}

.player-card {
	border: 1px solid #d9f4e2;
	background: linear-gradient(170deg, #f7fff9 0%, #effdf4 100%);
	border-radius: 14px;
	padding: 14px;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
}

.rank-badge {
	font-size: 14px;
	padding: 2px 10px;
	border-radius: 999px;
	background: #1f9d55;
	color: #ffffff;
}

.player-avatar {
	width: 78px;
	height: 78px;
	border-radius: 50%;
	border: 2px solid #bfeccf;
	object-fit: cover;
}

.player-name {
	font-size: 16px;
	text-align: center;
}

.player-team {
	font-size: 13px;
	color: #4b5563;
	text-align: center;
}

.coins-pill {
	font-size: 13px;
	border-radius: 999px;
	padding: 4px 10px;
	background: #d1fae5;
	color: #065f46;
}

.empty-state {
	min-height: 160px;
	display: flex;
	justify-content: center;
	align-items: center;
	color: #6b7280;
}

@media (max-width: 900px) {
	#stats-body {
		min-width: 0;
		width: min(92vw, 760px);
	}

	.top-players-grid {
		grid-template-columns: 1fr;
	}
}
</style>
