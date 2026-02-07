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
			} finally {
				this.loading = false;
			}
		},
	},
});
