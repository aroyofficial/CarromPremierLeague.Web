import { defineStore } from "pinia";
import { seasonService } from "@/services/seasonService";

export const useSeasonStore = defineStore("season", {
	state: () => ({
		seasons: [],
		selectedSeason: null,
		loading: false,
		leagueTable: null,
	}),

	actions: {
		async fetchSeasons() {
			this.loading = true;
			try {
				const response = await seasonService.getAll();
				this.seasons = response.data;
				if (this.seasons.length > 0) {
					this.selectedSeason = this.seasons[0].id;
				}
			} finally {
				this.loading = false;
			}
		},

		async fetchLeagueTable() {
			this.loading = true;
			try {
				const response = await seasonService.getLeagueTable(
					this.selectedSeason,
				);
				this.leagueTable = response.data;
				return response.data;
			} finally {
				this.loading = false;
			}
		},

		setSeason(id) {
			this.selectedSeason = id;
		},
	},
});
