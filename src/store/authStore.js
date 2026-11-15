import { defineStore } from "pinia";
import { authService } from "@/services/authService";
import { ASSISTANT_PERMISSION } from "@/utils/assistantVisibility";
import { fullName, givenName } from "@/utils/adminNames";
import { authToken } from "@/utils/authToken";
import { readClaims } from "@/utils/tokenClaims";

let profileRequest = null;
let endingSession = false;
let reissuedFor = null;

export const useAuthStore = defineStore("auth", {
	state: () => ({
		token: authToken.get(),
		username: authToken.getUser(),
		firstName: authToken.getNames().firstName,
		lastName: authToken.getNames().lastName,
		adminId: null,
		permissions: [],
		mustChangePassword: false,
		profileLoaded: false,
		loading: false,
	}),

	getters: {
		isAuthenticated: (state) => Boolean(state.token),
		displayName: (state) => fullName(state),
		greetingName: (state) => givenName(state),
		can: (state) => (code) => Boolean(state.token) && state.permissions.includes(code),
		canAny: (state) => (codes) => Boolean(state.token) && (codes || []).some((code) => state.permissions.includes(code)),
		canAll: (state) => (codes) => Boolean(state.token) && (codes || []).every((code) => state.permissions.includes(code)),
		// Whether this admin may use Striker. The token claim answers until the profile loads, then the
		// permissions the server just returned decide. The server checks the database either way.
		assistantAccess: (state) => {
			if (!state.token) return false;
			if (state.profileLoaded) return state.permissions.includes(ASSISTANT_PERMISSION);
			return readClaims(state.token).ast === true;
		},
	},

	actions: {
		async login(username, password) {
			this.loading = true;
			try {
				const response = await authService.login(username, password);
				const data = response?.data || {};
				if (data.pending) return { pending: true, requestId: data.request_id };
				if (data.mfa_required) {
					return { mfa: true, mfaToken: data.mfa_token, methods: data.mfa_methods || [] };
				}
				const token = data.access_token;
				if (!token) {
					throw new Error("Login response did not include an access token.");
				}
				this.token = token;
				this.username = username;
				this.mustChangePassword = Boolean(data.must_change_password);
				authToken.set(token, username);
				this.profileLoaded = false;
				await this.loadProfile({ force: true });
				return { pending: false };
			} finally {
				this.loading = false;
			}
		},

		adopt(token, username) {
			this.token = token;
			this.username = username;
			authToken.set(token, username);
			this.profileLoaded = false;
			return this.loadProfile({ force: true });
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
						this.firstName = admin.first_name || "";
						this.lastName = admin.last_name || "";
						authToken.setNames(this.firstName, this.lastName);
						this.permissions = Array.isArray(admin.permissions) ? admin.permissions : [];
						this.mustChangePassword = Boolean(admin.must_change_password);
						this.profileLoaded = true;
						if (this.token && this.username) authToken.set(this.token, this.username);
						return this.reissueStaleClaims().then(() => admin);
					})
					.finally(() => {
						profileRequest = null;
					});
			}
			return profileRequest;
		},

		// A grant or revoke after sign-in leaves the token claim behind. Ask once for a token that matches.
		async reissueStaleClaims() {
			if (!this.token || this.mustChangePassword || reissuedFor === this.token) return;
			const claimed = readClaims(this.token).ast === true;
			if (claimed === this.permissions.includes(ASSISTANT_PERMISSION)) return;
			reissuedFor = this.token;
			try {
				const response = await authService.refresh();
				const fresh = response?.data?.access_token;
				if (fresh && this.token) {
					this.token = fresh;
					if (this.username) authToken.set(fresh, this.username);
				}
			} catch {
				/* The permissions from the server still decide what is shown. */
			}
		},

		dropLocal() {
			this.token = null;
			this.username = null;
			this.firstName = "";
			this.lastName = "";
			this.adminId = null;
			this.permissions = [];
			this.mustChangePassword = false;
			this.profileLoaded = false;
			authToken.clear();
		},

		async logout() {
			if (this.token && !endingSession) {
				endingSession = true;
				try {
					await authService.logout();
				} catch {
					/* The local session still ends if the server is unreachable. */
				} finally {
					endingSession = false;
				}
			}
			this.token = null;
			this.username = null;
			this.firstName = "";
			this.lastName = "";
			this.adminId = null;
			this.permissions = [];
			this.mustChangePassword = false;
			this.profileLoaded = false;
			authToken.clear();
		},
	},
});
