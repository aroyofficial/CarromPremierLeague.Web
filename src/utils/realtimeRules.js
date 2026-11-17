const MAX_SEEN = 200;

export const FAST_POLL_MS = 5000;
export const SLOW_POLL_MS = 60000;
// The server sends a heartbeat every 15s. Two missed ones means the socket is only pretending to be open.
export const STALE_MS = 35000;
// A connection that never opens (a sleeping host, a hung proxy) is abandoned and retried.
export const CONNECT_TIMEOUT_MS = 20000;

// Which public writes each screen actually displays. A notice for any other area does not refetch it.
export const areas = {
	schedule: ["matches", "seasons", "teams", "players", "settings"],
	points: ["matches", "seasons", "teams", "settings"],
	stats: ["matches", "seasons", "players", "teams", "settings"],
	playerStats: ["matches", "seasons", "players", "settings"],
	players: ["players", "teams", "countries", "seasons", "rosters", "matches"],
};

export const areaMatches = (body, watched) => {
	if (!watched || !watched.length) return true;
	const area = body?.payload?.area;
	if (!area) return true;
	return watched.includes(area);
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
