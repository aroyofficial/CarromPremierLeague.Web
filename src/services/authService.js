import api from "./api";

export const authService = {
	async login(username, password) {
		return await api.post("auth/login", { username, password });
	},
};
