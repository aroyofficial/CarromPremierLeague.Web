import api from "./api";

export const rosterService = {
	async getTeams(seasonId) {
		return await api.get(`rosters/season/${seasonId}/teams`);
	},
};
