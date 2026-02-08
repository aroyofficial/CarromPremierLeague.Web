import { defineStore } from "pinia";
import { statsService } from "@/services/statsService";

export const useStatsStore = defineStore("stats", {
	state: () => ({
		stats: new Map(),
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
	},
});
