const MAX_SEEN = 200;

export const FAST_POLL_MS = 5000;
export const SLOW_POLL_MS = 60000;
// Admin consoles hold forms, so the fallback poll while the stream is down is gentler than on public screens.
export const ADMIN_FAST_POLL_MS = 15000;
// The server sends a heartbeat every 15s. Two missed ones means the socket is only pretending to be open.
export const STALE_MS = 35000;
// A connection that never opens (a sleeping host, a hung proxy) is abandoned and retried.
export const CONNECT_TIMEOUT_MS = 20000;

export const EVENT_TYPES = ["league.invalidated", "admin.invalidated", "admin.login_request.changed"];

const LEAGUE = ["matches", "seasons", "teams", "players", "countries", "rosters", "settings", "gallery"];

// Which areas each screen displays. A notice for any other area does not refetch it.
export const areas = {
	schedule: ["matches", "seasons", "teams", "players", "settings"],
	points: ["matches", "seasons", "teams", "settings"],
	stats: ["matches", "seasons", "players", "teams", "settings"],
	playerStats: ["matches", "seasons", "players", "settings"],
	players: ["players", "teams", "countries", "seasons", "rosters", "matches"],
	teams: ["teams", "seasons", "rosters", "players", "matches"],
	gallery: ["gallery", "seasons"],
	fixtures: ["matches", "seasons", "teams", "rosters", "settings"],
	adminDashboard: [...LEAGUE, "admins"],
	adminMatches: ["matches", "seasons", "teams", "players", "rosters", "settings"],
	adminTeams: ["teams"],
	adminSeasons: ["seasons", "teams"],
	adminPlayers: ["players", "countries"],
	adminRosters: ["rosters", "seasons", "teams", "players"],
	adminGallery: ["gallery", "seasons"],
	adminSettings: ["settings"],
	adminUsers: ["admins", "countries"],
	adminPermissions: ["admins"],
	adminProfile: ["me", "countries"],
	adminSecurity: ["me"],
	loginRequest: ["loginRequest"],
	stores: ["seasons", "teams", "settings", "me"],
};

// Every notice type reduces to one area, so every screen handles every notice the same way.
export const areaOf = (body) => {
	if (body?.eventType === "admin.login_request.changed") return "loginRequest";
	return body?.payload?.area || null;
};

export const areaMatches = (body, watched) => {
	if (!watched || !watched.length) return true;
	const area = areaOf(body);
	if (!area) return true;
	return watched.includes(area);
};

// A refetch waits while the screen has unsaved edits, so a notice never overwrites what someone is typing.
export const guarded = (refresh, paused) => () => {
	if (paused?.()) return undefined;
	return refresh();
};

export const acceptEvent = (body, seenIds) => {
	if (!body || body.eventVersion !== 1 || !body.eventId) return false;
	if (seenIds.has(body.eventId)) return false;
	seenIds.add(body.eventId);
	if (seenIds.size > MAX_SEEN) seenIds.delete(seenIds.values().next().value);
	return true;
};

export const retryDelayMs = (attempt) => Math.min(30000, 1000 * 2 ** Math.min(attempt, 5));

// While a stream is open a slow poll only covers a missed event; otherwise poll as before.
export const pollDelayMs = (state, fastMs = FAST_POLL_MS, slowMs = SLOW_POLL_MS) =>
	state === "open" ? slowMs : fastMs;
