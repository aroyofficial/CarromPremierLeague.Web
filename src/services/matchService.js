import api from "./api";

export const matchService = {
	async getAll(seasonId) {
		return await api.get("matches?seasonId=" + seasonId);
	},

	async getById(id) {
		return await api.get(`matches/${id}`);
	},
};
