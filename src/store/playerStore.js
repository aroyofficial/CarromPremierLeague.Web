import { defineStore } from "pinia";
import { playerService } from "@/services/playerService";
import { resolveAsset } from "@/utils/common";

const toSlug = (value) => (value || "").toLowerCase().trim().replace(/\s+/g, "-");

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
				this.players = (response.data || []).map((player) => {
					const fallbackAvatar = resolveAsset(
						`public/assets/images/players/${toSlug(player.first_name)}-${toSlug(player.last_name)}.png`,
					);

					return {
						...player,
						avatar_url: player.avatar_url || fallbackAvatar,
					};
				});
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
				this.playerProfiles = (response.data || []).map((player) => {
					const fallbackAvatar = resolveAsset(
						`public/assets/images/players/${toSlug(player.first_name)}-${toSlug(player.last_name)}.png`,
					);

					return {
						...player,
						avatar_url: player.avatar_url || fallbackAvatar,
					};
				});
				this.profilesLoaded = true;
				return this.playerProfiles;
			} finally {
				this.loading = false;
			}
		},
	},
});
