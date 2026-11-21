import api from "./api";

const crud = (resource, { updateMethod = "patch" } = {}) => ({
	list: () => api.get(`${resource}/`),
	get: (id) => api.get(`${resource}/${id}`),
	create: (payload) => api.post(`${resource}/`, payload),
	update: (id, payload) => api[updateMethod](`${resource}/${id}`, payload),
	remove: (id) => api.delete(`${resource}/${id}`),
});

const uploadImage = (url, file, onProgress) => {
	const body = new FormData();
	body.append("file", file);
	return api.put(url, body, {
		headers: { "Content-Type": "multipart/form-data" },
		onUploadProgress: (event) => {
			if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
		},
	});
};

const saveImageUrl = (url, link) => {
	const body = new FormData();
	body.append("url", link);
	return api.put(url, body, {
		headers: { "Content-Type": "multipart/form-data" },
	});
};

export const adminApi = {
	seasons: {
		...crud("seasons", { updateMethod: "put" }),
		teams: (seasonId) => api.get(`seasons/${seasonId}/teams`),
		addTeam: (seasonId, teamId) => api.post(`seasons/${seasonId}/teams`, { team_id: teamId }),
		removeTeam: (seasonId, teamId) => api.delete(`seasons/${seasonId}/teams/${teamId}`),
		schedule: (seasonId) => api.post(`seasons/${seasonId}/schedule`),
	},
	teams: {
		...crud("teams"),
		uploadLogo: (id, file, onProgress) => uploadImage(`teams/${id}/logo`, file, onProgress),
		setLogoUrl: (id, link) => saveImageUrl(`teams/${id}/logo`, link),
		removeLogo: (id) => api.delete(`teams/${id}/logo`),
	},
	players: {
		...crud("players"),
		uploadAvatar: (id, file, onProgress) => uploadImage(`players/${id}/avatar`, file, onProgress),
		setAvatarUrl: (id, link) => saveImageUrl(`players/${id}/avatar`, link),
		removeAvatar: (id) => api.delete(`players/${id}/avatar`),
	},
	countries: crud("countries"),
	matches: {
		list: (seasonId) => api.get("matches", { params: { seasonId } }),
		nextOrder: (seasonId) => api.get("matches/next-order", { params: { seasonId } }),
		create: (payload) => api.post("matches", payload),
		update: (id, payload) => api.patch(`matches/${id}`, payload),
		remove: (id) => api.delete(`matches/${id}`),
		reset: (id) => api.post(`matches/${id}/reset`),
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
		phoneCode: (phone_code, phone_number) => api.post("auth/me/phone/otp", { phone_code, phone_number }),
		verifyPhone: (phone_code, phone_number, code) => api.post("auth/me/phone/verify", { phone_code, phone_number, code }),
		list: () => api.get("admins"),
		get: (id) => api.get(`admins/${id}`),
		create: (payload) => api.post("admins", payload),
		update: (id, payload) => api.patch(`admins/${id}`, payload),
		emailCode: (id, email) => api.post(`admins/${id}/email-code`, { email }),
		setPermissions: (id, permissions) => api.put(`admins/${id}/permissions`, { permissions }),
		remove: (id) => api.delete(`admins/${id}`),
		uploadAvatar: (id, file, onProgress) => uploadImage(`admins/${id}/avatar`, file, onProgress),
		setAvatarUrl: (id, link) => saveImageUrl(`admins/${id}/avatar`, link),
		removeAvatar: (id) => api.delete(`admins/${id}/avatar`),
	},
	permissions: {
		catalog: () => api.get("permissions"),
		tree: () => api.get("permissions/tree"),
	},
	gallery: {
		seasons: () => api.get("gallery/seasons"),
		list: (params) => api.get("gallery", { params }),
		photo: (id) => api.get(`gallery/${id}`),
		adminList: (params) => api.get("admin/gallery", { params }),
		create: (body, onProgress) =>
			api.post("gallery", body, {
				headers: { "Content-Type": "multipart/form-data" },
				onUploadProgress: (event) => {
					if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
				},
			}),
		update: (id, payload) => api.patch(`gallery/${id}`, payload),
		order: (seasonId, itemIds) => api.put("gallery/order", { season_id: seasonId, item_ids: itemIds }),
		cover: (seasonId, itemId) => api.put(`seasons/${seasonId}/gallery-cover`, { item_id: itemId }),
		bulk: (payload) => api.post("gallery/bulk", payload),
		remove: (id) => api.delete(`gallery/${id}`),
	},
	webhooks: {
		list: () => api.get("webhooks"),
		create: (payload) => api.post("webhooks", payload),
		update: (id, payload) => api.patch(`webhooks/${id}`, payload),
		rotateSecret: (id) => api.post(`webhooks/${id}/rotate-secret`),
		test: (id) => api.post(`webhooks/${id}/test`),
		deliveries: (id, limit = 25) => api.get(`webhooks/${id}/deliveries`, { params: { limit } }),
		remove: (id) => api.delete(`webhooks/${id}`),
	},
	apps: {
		list: () => api.get("apps"),
		create: (payload) => api.post("apps", payload),
		update: (id, payload) => api.patch(`apps/${id}`, payload),
		rotate: (id) => api.post(`apps/${id}/rotate`),
		remove: (id) => api.delete(`apps/${id}`),
	},
	widgets: {
		list: () => api.get("widgets"),
		create: (payload) => api.post("widgets", payload),
		update: (id, payload) => api.patch(`widgets/${id}`, payload),
		rotate: (id) => api.post(`widgets/${id}/rotate`),
		preview: (id) => api.get(`widgets/${id}/preview`),
		seasonPreview: (seasonId) => api.get(`widgets/season-preview/${seasonId}`),
	},
};

export const apiErrorMessage = (error, fallback = "Something went wrong. Please try again.") => {
	if (!error) return fallback;
	if (typeof error === "string" && error.trim()) return error;
	if (typeof error.detail === "string" && error.detail.trim()) return error.detail;
	if (Array.isArray(error.detail) && error.detail.length) {
		return error.detail.map((item) => item?.msg || String(item)).join("; ");
	}
	if (Array.isArray(error.data) && error.data.length) {
		return error.data
			.map((item) => {
				const field = Array.isArray(item.loc) ? item.loc.filter((part) => part !== "body").join(".") : "";
				return field ? `${field}: ${item.msg}` : item.msg;
			})
			.join("; ");
	}
	return error.message || error.detail || fallback;
};
