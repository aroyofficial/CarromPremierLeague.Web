import api from "./api";

// Token-only read for the transparent widget page. The public route ignores any sign-in header.
export const widgetService = {
	async snapshot(token) {
		return await api.get(`widgets/t/${encodeURIComponent(token)}`);
	},
};
