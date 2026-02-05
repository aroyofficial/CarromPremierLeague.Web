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
				this.teams.forEach((team) => {
					team.logo_url = `src/assets/images/${team.name.toLowerCase().replace(" ", "_")}.png`;
				});
			} finally {
				this.loading = false;
			}
		},
	},
});
