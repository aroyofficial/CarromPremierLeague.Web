import { defineStore } from "pinia";
import { teamService } from "@/services/teamService";
import { resolveAsset } from "@/utils/common";

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
					team.logo_url = resolveAsset(
						`public/assets/images/teams/${team.name.toLowerCase().replace(" ", "_")}.png`,
					);
				});
			} finally {
				this.loading = false;
			}
		},
	},
});
