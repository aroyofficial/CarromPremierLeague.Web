import api from "./api";

export const statsService = {
	async getHeadToHead(team1Id, team2Id) {
		return await api.get(
			`stats/head-to-head?team1Id=${team1Id}&team2Id=${team2Id}`,
		);
	},
};
