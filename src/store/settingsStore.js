import { defineStore } from "pinia";
import { assistantService } from "@/services/assistantService";
import { settingsService } from "@/services/settingsService";

const defaults = {
	regulation_minutes: 15,
	extra_minutes: 5,
	league_queen: false,
	queen_needs_cover: false,
	assistant_enabled: true,
};

export const useSettingsStore = defineStore("settings", {
	state: () => ({
		...defaults,
		loaded: false,
		assistantAvailable: false,
		assistantChecked: false,
	}),

	actions: {
		async fetchSettings() {
			const response = await settingsService.get();
			Object.assign(this, defaults, response.data || {});
			this.loaded = true;
			await this.refreshAssistant();
			return response.data;
		},

		async saveSettings(settings) {
			const response = await settingsService.update(settings);
			Object.assign(this, response.data || {});
			this.loaded = true;
			await this.refreshAssistant();
			return response.data;
		},

		async refreshAssistant() {
			if (!this.assistant_enabled) {
				this.assistantAvailable = false;
				this.assistantChecked = true;
				return;
			}
			try {
				const response = await assistantService.status();
				this.assistantAvailable = Boolean(response?.data?.available);
			} catch {
				this.assistantAvailable = false;
			}
			this.assistantChecked = true;
		},

		noteAssistantUnavailable() {
			this.assistantAvailable = false;
			this.assistantChecked = true;
		},
	},
});
