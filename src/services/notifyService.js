import api, { apiBaseUrl } from "./api";

export const notifyService = {
	capabilities() {
		return api.get("notifications/capabilities");
	},

	subscribe(body) {
		return api.post("notifications/subscriptions", body);
	},

	savePreferences(body) {
		return api.put("notifications/subscriptions", body);
	},

	unsubscribe(endpoint) {
		return api.delete("notifications/subscriptions", { data: { endpoint } });
	},

	createFeed(body) {
		return api.post("calendar/feeds", body);
	},

	connectGoogle() {
		return api.post("calendar/google/connect");
	},

	connectMicrosoft() {
		return api.post("calendar/microsoft/connect");
	},

	listConnections() {
		return api.get("calendar/connections");
	},

	disconnectConnection(id) {
		return api.delete(`calendar/connections/${id}`);
	},

	// Voids a subscription link at once. Calendar apps stop getting updates from it.
	revokeFeed(token) {
		return api.delete(`calendar/feeds/${encodeURIComponent(token)}`);
	},

	// Per connection: whether this match is on that calendar, or was removed from it.
	matchConnectionStates(matchId) {
		return api.get(`calendar/matches/${Number(matchId)}/connections`);
	},

	withdrawMatch(connectionId, matchId) {
		return api.post(`calendar/connections/${Number(connectionId)}/matches/${Number(matchId)}/withdraw`);
	},

	restoreMatch(connectionId, matchId) {
		return api.post(`calendar/connections/${Number(connectionId)}/matches/${Number(matchId)}/restore`);
	},

	// A one-time file. It is a plain link, so the browser downloads it without the admin token.
	matchDownloadUrl(matchId) {
		return `${String(apiBaseUrl || "").replace(/\/?$/, "/")}calendar/matches/${Number(matchId)}.ics`;
	},
};
