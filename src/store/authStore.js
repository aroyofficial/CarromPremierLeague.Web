import { defineStore } from "pinia";
import { authService } from "@/services/authService";
import { authToken } from "@/utils/authToken";

let profileRequest = null;

export const useAuthStore = defineStore("auth", {
	state: () => ({
		token: authToken.get(),
		username: authToken.getUser(),
		adminId: null,
		permissions: [],
		profileLoaded: false,
		loading: false,
	}),

	getters: {
		isAuthenticated: (state) => Boolean(state.token),
		can: (state) => (code) => Boolean(state.token) && state.permissions.includes(code),
		canAny: (state) => (codes) => Boolean(state.token) && (codes || []).some((code) => state.permissions.includes(code)),
		canAll: (state) => (codes) => Boolean(state.token) && (codes || []).every((code) => state.permissions.includes(code)),
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
				this.profileLoaded = false;
				await this.loadProfile({ force: true });
			} finally {
				this.loading = false;
			}
		},

		async loadProfile({ force = false } = {}) {
			if (!this.token) return null;
			if (this.profileLoaded && !force) return { id: this.adminId, permissions: this.permissions };
			if (!profileRequest || force) {
				profileRequest = authService
					.me()
					.then((response) => {
						const admin = response?.data || {};
						this.adminId = admin.id ?? null;
						this.username = admin.username || this.username;
						this.permissions = Array.isArray(admin.permissions) ? admin.permissions : [];
						this.profileLoaded = true;
						if (this.token && this.username) authToken.set(this.token, this.username);
						return admin;
					})
					.finally(() => {
						profileRequest = null;
					});
			}
			return profileRequest;
		},

		logout() {
			this.token = null;
			this.username = null;
			this.adminId = null;
			this.permissions = [];
			this.profileLoaded = false;
			authToken.clear();
		},
	},
});
