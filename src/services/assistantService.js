import api from "./api";

const chatTimeout = { timeout: 120000 };

export const assistantService = {
	status: () => api.get("/assistant/status"),
	publicChat: (message, history) => api.post("/assistant/public/chat", { message, history }, chatTimeout),
	adminChat: (message, history, pending = null) =>
		api.post("/assistant/admin/chat", { message, history, pending }, chatTimeout),
	confirm: (token, approve = true) => api.post("/assistant/admin/confirm", { token, approve }, chatTimeout),
};
