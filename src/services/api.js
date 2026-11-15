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
		// A failed sign-in, a token refresh, or the other-device poll must not end a session that is still good.
		const path = String(error.config?.url || "");
		const background =
			path.includes("auth/login-request") || path.includes("auth/refresh") || path.includes("assistant/");
		const failedLogin = /auth\/login\/?$/.test(path);
		if (error.response?.status === 401 && authToken.get() && !background && !failedLogin) {
			authToken.clear();
			window.dispatchEvent(new CustomEvent("cpl:session-expired"));
		}
		if (error.response?.status === 403 && authToken.get()) {
			window.dispatchEvent(new CustomEvent("cpl:permission-denied"));
		}
		return Promise.reject(error.response?.data || error);
	},
);

export default api;
