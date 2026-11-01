import { defineStore } from "pinia";
import { matchService } from "@/services/matchService";

export const useMatchStore = defineStore("match", {
	state: () => ({
		matches: [],
		loading: false,
		nextMatchOrder: null,
	}),

	actions: {
		async fetchMatches(seasonId) {
			this.loading = true;
			try {
				const response = await matchService.getAll(seasonId);
				this.matches = response.data;
			} finally {
				this.loading = false;
			}
		},
		async fetchNextMatchOrder(seasonId) {
			this.loading = true;
			try {
				const response = await matchService.getNextMatchOrder(seasonId);
				this.nextMatchOrder = response.data.order;
			} finally {
				this.loading = false;
			}
		},
		async scheduleMatch(match) {
			this.loading = true;
			try {
				const response = await matchService.schedule(match);
				this.matches.push(response.data);
				await this.fetchNextMatchOrder(match.season_id);
				return response.data;
			} finally {
				this.loading = false;
			}
		},
		async updateMatch(matchId, payload) {
			this.loading = true;
			try {
				const response = await matchService.update(matchId, payload);
				const index = this.matches.findIndex((match) => match.id === matchId);
				if (index !== -1) {
					this.matches[index] = {
						...this.matches[index],
						...response.data,
					};
				}
				return response.data;
			} finally {
				this.loading = false;
			}
		},
		async updateMatchStats(matchId, stats) {
			this.loading = true;
			try {
				const response = await matchService.updateStats(matchId, stats);
				return response.data;
			} finally {
				this.loading = false;
			}
		},
	},
});
