import api from "./api";

export const statsService = {
	async getHeadToHead(team1Id, team2Id) {
		return await api.get(
			`stats/head-to-head?team1Id=${team1Id}&team2Id=${team2Id}`,
		);
	},

	async getSeasonTopCoinPotters(seasonId, limit = 3) {
		return await api.get(
			`stats/season/${seasonId}/top-coin-potters?limit=${limit}`,
		);
	},
};
