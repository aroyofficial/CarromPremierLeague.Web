import { defineStore } from "pinia";
import { countryService } from "@/services/countryService";

export const useCountryStore = defineStore("country", {
	state: () => ({
		countries: [],
		loading: false,
		loaded: false,
	}),

	actions: {
		async fetchCountries(forceRefresh = false) {
			if (this.loaded && !forceRefresh) {
				return this.countries;
			}

			this.loading = true;
			try {
				const response = await countryService.getAll();
				this.countries = response.data || [];
				this.loaded = true;
				return this.countries;
			} finally {
				this.loading = false;
			}
		},
	},
});
