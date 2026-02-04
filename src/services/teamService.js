import api from "./api";

export const teamService = {
	async getAll() {
		return await api.get("teams");
	},

	async getById(id) {
		return await api.get(`teams/${id}`);
	},
};
