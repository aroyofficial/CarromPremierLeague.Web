import { defineStore } from "pinia";
import { teamService } from "@/services/teamService";

export const useTeamStore = defineStore("team", {
	state: () => ({
		teams: [],
		loading: false,
	}),

	actions: {
		async fetchTeams() {
			this.loading = true;
			try {
				const response = await teamService.getAll();
				this.teams = response.data;
			} finally {
				this.loading = false;
			}
		},
	},
});
