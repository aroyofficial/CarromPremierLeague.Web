import api from "./api";

export const seasonService = {
	async getAll() {
		return await api.get("seasons");
	},

	async getById(id) {
		return await api.get(`seasons/${id}`);
	},

	async getLeagueTable(seasonId) {
		return await api.get(`seasons/${seasonId}/league-table`);
	},
};
