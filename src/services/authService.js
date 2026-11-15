import api from "./api";
import { deviceId, deviceLabel } from "@/utils/deviceSession";

export const authService = {
	async login(username, password) {
		return await api.post("auth/login", {
			username,
			password,
			device_id: deviceId(),
			device_label: deviceLabel(),
		});
	},

	async logout() {
		return await api.post("auth/logout", { device_id: deviceId() });
	},

	async pendingLogin() {
		return await api.get("auth/login-request");
	},

	async approveLogin(requestId) {
		return await api.post("auth/login-request/approve", { request_id: requestId });
	},

	async denyLogin(requestId) {
		return await api.post("auth/login-request/deny", { request_id: requestId });
	},

	async claimLogin(requestId) {
		return await api.post("auth/login-request/claim", { request_id: requestId });
	},

	async refresh() {
		return await api.post("auth/refresh");
	},

	async me() {
		return await api.get("auth/me");
	},

	async forgotPassword(username) {
		return await api.post("auth/forgot-password", { username });
	},

	async resetPassword(username, code, password) {
		return await api.post("auth/reset-password", { username, code, password });
	},
};
