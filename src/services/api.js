import axios from "axios";
import { authToken } from "@/utils/authToken";

const apiBaseUrl =
	globalThis.__CPL_API_BASE_URL__ || import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
	baseURL: apiBaseUrl,
	// Long enough to survive a cold start on the free API host.
	timeout: 90000,
	headers: {
		"Content-Type": "application/json",
	},
});

api.interceptors.request.use(
	(config) => {
		const token = authToken.get();
		if (token) config.headers.Authorization = `Bearer ${token}`;
		return config;
	},
	(error) => Promise.reject(error),
);

api.interceptors.response.use(
	(response) => response.data,
	(error) => {
		console.error("API Error:", error.response?.data || error.message);
		return Promise.reject(error.response?.data || error);
	},
);

export default api;
