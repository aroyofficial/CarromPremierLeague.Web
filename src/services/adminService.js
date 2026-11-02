import api from "./api";

const crud = (resource, { updateMethod = "patch" } = {}) => ({
	list: () => api.get(`${resource}/`),
	get: (id) => api.get(`${resource}/${id}`),
	create: (payload) => api.post(`${resource}/`, payload),
	update: (id, payload) => api[updateMethod](`${resource}/${id}`, payload),
	remove: (id) => api.delete(`${resource}/${id}`),
});

export const adminApi = {
	seasons: {
		...crud("seasons", { updateMethod: "put" }),
		teams: (seasonId) => api.get(`seasons/${seasonId}/teams`),
		addTeam: (seasonId, teamId) => api.post(`seasons/${seasonId}/teams`, { team_id: teamId }),
		removeTeam: (seasonId, teamId) => api.delete(`seasons/${seasonId}/teams/${teamId}`),
	},
	teams: crud("teams"),
	players: crud("players"),
	countries: crud("countries"),
	matches: {
		list: (seasonId) => api.get("matches", { params: { seasonId } }),
		nextOrder: (seasonId) => api.get("matches/next-order", { params: { seasonId } }),
		create: (payload) => api.post("matches", payload),
		update: (id, payload) => api.patch(`matches/${id}`, payload),
		remove: (id) => api.delete(`matches/${id}`),
		stats: (id) => api.get(`matches/${id}/stats`),
		saveStats: (id, stats) => api.put(`matches/${id}/stats`, { stats }),
	},
	rosters: {
		season: (seasonId) => api.get(`rosters/season/${seasonId}`),
		assign: (payload) => api.post("rosters/assign", payload),
		remove: (payload) => api.delete("rosters/remove", { data: payload }),
	},
	admins: {
		me: () => api.get("auth/me"),
		list: () => api.get("admins"),
		create: (payload) => api.post("admins", payload),
		update: (id, payload) => api.patch(`admins/${id}`, payload),
		remove: (id) => api.delete(`admins/${id}`),
	},
};

export const apiErrorMessage = (error, fallback = "Something went wrong. Please try again.") => {
	if (!error) return fallback;
	if (Array.isArray(error.data) && error.data.length) {
		return error.data
			.map((item) => {
				const field = Array.isArray(item.loc) ? item.loc.filter((part) => part !== "body").join(".") : "";
				return field ? `${field}: ${item.msg}` : item.msg;
			})
			.join("; ");
	}
	if (typeof error.data === "string" && error.message === "Internal server error") {
		return error.data;
	}
	return error.message || error.detail || fallback;
};
