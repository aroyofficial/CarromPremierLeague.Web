import { defineStore } from "pinia";
import { settingsService } from "@/services/settingsService";

const defaults = {
	regulation_minutes: 15,
	extra_minutes: 5,
	league_queen: false,
	queen_needs_cover: false,
};

export const useSettingsStore = defineStore("settings", {
	state: () => ({
		...defaults,
		loaded: false,
	}),

	actions: {
		async fetchSettings() {
			const response = await settingsService.get();
			Object.assign(this, defaults, response.data || {});
			this.loaded = true;
			return response.data;
		},

		async saveSettings(settings) {
			const response = await settingsService.update(settings);
			Object.assign(this, response.data || {});
			this.loaded = true;
			return response.data;
		},
	},
});
