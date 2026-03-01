import api from "./api";

export const playerService = {
	async getAll() {
		return await api.get("players");
	},

	async getProfiles() {
		return await api.get("players/profiles");
	},

	async getById(id) {
		return await api.get(`players/${id}`);
	},
};
