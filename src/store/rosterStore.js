import { defineStore } from "pinia";
import { rosterService } from "@/services/rosterService";
import { resolveAsset } from "@/utils/common";

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
				const teams = response.data.teams;
				teams.forEach((t) => {
					t.players.forEach((p) => {
						p.avatar_url = resolveAsset(
							`public/assets/images/players/${p.first_name.toLowerCase().replace(" ", "-")}-${p.last_name.toLowerCase().replace(" ", "-")}.png`,
						);
					});
				});
				this.teams.set(seasonId, teams);
			} finally {
				this.loading = false;
			}
		},
	},
});
