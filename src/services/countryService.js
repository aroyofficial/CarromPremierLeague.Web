import api from "./api";

export const countryService = {
	async getAll() {
		return await api.get("countries");
	},

	async getById(id) {
		return await api.get(`countries/${id}`);
	},
};
