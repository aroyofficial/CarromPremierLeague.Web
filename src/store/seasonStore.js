import { defineStore } from "pinia";
import { seasonService } from "@/services/seasonService";

export const useSeasonStore = defineStore("season", {
	state: () => ({
		seasons: [],
		selectedSeason: null,
		loading: false,
		leagueTable: null,
	}),

	getters: {
		visibleSeasons: (state) => (state.seasons || []).filter((season) => season.show === true),
	},

	actions: {
		async fetchSeasons() {
			this.loading = true;
			try {
				const response = await seasonService.getAll();
				this.seasons = response.data || [];
				const visible = this.seasons.filter((season) => season.show === true);
				const currentIsVisible = visible.some((season) => season.id === this.selectedSeason);
				if (!currentIsVisible) {
					this.selectedSeason = visible.length > 0 ? visible[0].id : null;
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
