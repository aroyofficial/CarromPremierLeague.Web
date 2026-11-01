import api from "./api";

export const matchService = {
	async getAll(seasonId) {
		return await api.get("matches?seasonId=" + seasonId);
	},

	async getById(id) {
		return await api.get(`matches/${id}`);
	},

	async getNextMatchOrder(seasonId) {
		return await api.get(`matches/next-order?seasonId=${seasonId}`);
	},

	async schedule(match) {
		return await api.post("matches", match);
	},

	async update(matchId, payload) {
		return await api.patch(`matches/${matchId}`, payload);
	},

	async updateStats(matchId, stats) {
		return await api.put(`matches/${matchId}/stats`, { stats });
	},
};
