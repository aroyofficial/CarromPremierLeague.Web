import api from "./api";

export const mediaService = {
	getDefaults: () => api.get("media/defaults"),
};
