import { defineStore } from "pinia";
import { rosterService } from "@/services/rosterService";

export const useRosterStore = defineStore("roster", {
	state: () => ({
		teams: new Map(),
		loading: false,
	}),

	actions: {
		async fetchTeamDetails(seasonId) {
			this.loading = true;
			try {
				const response = await rosterService.getTeams(seasonId);
				this.teams.set(seasonId, response.data.teams);
			} finally {
				this.loading = false;
			}
		},
	},
});
