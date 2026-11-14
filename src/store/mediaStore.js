import { defineStore } from "pinia";
import { mediaService } from "@/services/mediaService";

let pending = null;

export const useMediaStore = defineStore("media", {
	state: () => ({
		player: "",
		team: "",
		uploadsEnabled: false,
		loaded: false,
	}),

	actions: {
		ensureDefaults() {
			if (this.loaded) return Promise.resolve();
			if (!pending) {
				pending = mediaService
					.getDefaults()
					.then((response) => {
						const data = response?.data || {};
						this.player = data.player || "";
						this.team = data.team || "";
						this.uploadsEnabled = Boolean(data.uploads_enabled);
						this.loaded = true;
					})
					.catch(() => {
						// Pictures fall back to initials until the next attempt.
					})
					.finally(() => {
						pending = null;
					});
			}
			return pending;
		},
	},
});
