import { defineStore } from "pinia";
import { statsService } from "@/services/statsService";

export const useStatsStore = defineStore("stats", {
	state: () => ({
		stats: new Map(),
		topCoinPotters: new Map(),
		topCoinPotterMessages: new Map(),
		topCoinPotterLeagueCompletion: new Map(),
		loading: false,
	}),

	actions: {
		async fetchHeadToHead(team1Id, team2Id) {
			this.loading = true;
			try {
				const response = await statsService.getHeadToHead(team1Id, team2Id);
				const key =
					team1Id < team2Id ? `${team1Id}-${team2Id}` : `${team2Id}-${team1Id}`;
				this.stats.set(key, response.data);
			} finally {
				this.loading = false;
			}
		},

		async fetchSeasonTopCoinPotters(seasonId, limit = 3, forceRefresh = false) {
			const key = `${seasonId}-${limit}`;
			if (!forceRefresh && this.topCoinPotters.has(key)) {
				return {
					players: this.topCoinPotters.get(key),
					isLeagueStageCompleted:
						this.topCoinPotterLeagueCompletion.get(key) || false,
					message:
						this.topCoinPotterMessages.get(key) ||
						"Top coin potters fetched successfully",
				};
			}

			this.loading = true;
			try {
				const response = await statsService.getSeasonTopCoinPotters(
					seasonId,
					limit,
				);
				const players = response?.data?.players || [];
				const isLeagueStageCompleted = Boolean(
					response?.data?.is_league_stage_completed,
				);
				const message =
					response?.message || "Top coin potters fetched successfully";
				this.topCoinPotters.set(key, players);
				this.topCoinPotterMessages.set(key, message);
				this.topCoinPotterLeagueCompletion.set(key, isLeagueStageCompleted);
				return { players, isLeagueStageCompleted, message };
			} finally {
				this.loading = false;
			}
		},
	},
});
