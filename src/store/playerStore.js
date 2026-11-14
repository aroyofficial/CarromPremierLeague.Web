import { defineStore } from "pinia";
import { playerService } from "@/services/playerService";

export const usePlayerStore = defineStore("player", {
	state: () => ({
		players: [],
		playerProfiles: [],
		loading: false,
		loaded: false,
		profilesLoaded: false,
	}),

	actions: {
		async fetchPlayers(forceRefresh = false) {
			if (this.loaded && !forceRefresh) {
				return this.players;
			}

			this.loading = true;
			try {
				const response = await playerService.getAll();
				this.players = response.data || [];
				this.loaded = true;
				return this.players;
			} finally {
				this.loading = false;
			}
		},

		async fetchPlayerProfiles(forceRefresh = false) {
			if (this.profilesLoaded && !forceRefresh) {
				return this.playerProfiles;
			}

			this.loading = true;
			try {
				const response = await playerService.getProfiles();
				this.playerProfiles = response.data || [];
				this.profilesLoaded = true;
				return this.playerProfiles;
			} finally {
				this.loading = false;
			}
		},
	},
});
