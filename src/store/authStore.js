import { defineStore } from "pinia";
import { authService } from "@/services/authService";
import { authToken } from "@/utils/authToken";

export const useAuthStore = defineStore("auth", {
	state: () => ({
		token: authToken.get(),
		username: authToken.getUser(),
		loading: false,
	}),

	getters: {
		isAuthenticated: (state) => Boolean(state.token),
	},

	actions: {
		async login(username, password) {
			this.loading = true;
			try {
				const response = await authService.login(username, password);
				const token = response?.data?.access_token;
				if (!token) {
					throw new Error("Login response did not include an access token.");
				}
				this.token = token;
				this.username = username;
				authToken.set(token, username);
			} finally {
				this.loading = false;
			}
		},

		logout() {
			this.token = null;
			this.username = null;
			authToken.clear();
		},
	},
});
