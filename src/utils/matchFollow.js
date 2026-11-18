const FEED_STORAGE_KEY = "cpl-calendar-feeds";

// The feed token is the only way to revoke a link, and the API stores just its hash, so the page
// keeps one link per season and team. A new link for the same scope replaces the saved one.
export function feedScopeKey(seasonId, teamId) {
	return `${Number(seasonId)}:${teamId ? Number(teamId) : 0}`;
}

export function readSavedFeeds(storage) {
	try {
		const parsed = JSON.parse(storage.getItem(FEED_STORAGE_KEY) || "null");
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch {
		return {};
	}
}

export function savedFeed(storage, seasonId, teamId) {
	return readSavedFeeds(storage)[feedScopeKey(seasonId, teamId)] || null;
}

export function rememberFeed(storage, seasonId, teamId, feed) {
	const feeds = readSavedFeeds(storage);
	feeds[feedScopeKey(seasonId, teamId)] = feed;
	storage.setItem(FEED_STORAGE_KEY, JSON.stringify(feeds));
}

export function forgetFeed(storage, seasonId, teamId) {
	const feeds = readSavedFeeds(storage);
	delete feeds[feedScopeKey(seasonId, teamId)];
	storage.setItem(FEED_STORAGE_KEY, JSON.stringify(feeds));
}

export function feedLinks(httpsUrl) {
	const webcal = String(httpsUrl || "").replace(/^https:\/\//, "webcal://").replace(/^http:\/\//, "webcal://");
	return { https: httpsUrl, webcal };
}

export function pushSupported() {
	return typeof navigator !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

const SYNC_STATE_LABELS = {
	connected: "Connected",
	syncing: "Syncing",
	update_pending: "Update pending",
	synced: "Synced",
	sync_failed: "Sync failed. It will retry.",
	reauthorization_required: "Reauthorization required",
};

export function syncStateLabel(state) {
	return SYNC_STATE_LABELS[state] || "Connected";
}

// What the admin can do next with one match on one connected calendar. A missing state means
// the match list has not loaded yet, so there is no action to offer.
export function matchCalendarAction(state) {
	if (!state) return null;
	if (state.removed) return { action: "restore", label: "Add this match back" };
	return { action: "withdraw", label: "Remove this match" };
}

// The worker needs the API address to re-register a rotated subscription on its own.
export function serviceWorkerUrl(baseUrl, apiBase) {
	const base = String(baseUrl || "/");
	const prefix = base.endsWith("/") ? base : `${base}/`;
	return apiBase ? `${prefix}sw.js?api=${encodeURIComponent(apiBase)}` : `${prefix}sw.js`;
}

// The service worker re-registers a rotated subscription without the page. On the next
// visit the page adopts the browser's current endpoint, or forgets one the browser dropped.
// A failed "turn off" call that still leaves nothing to retry: the server has no active row for the endpoint.
export function unsubscribeSettled(error) {
	const status = error?.response?.status;
	return status === 404 || status === 400;
}

export function reconcileSaved(saved, live) {
	if (!saved?.endpoint) return { action: "keep" };
	if (!live?.endpoint) return { action: "clear" };
	if (live.endpoint === saved.endpoint) return { action: "keep" };
	return {
		action: "replace",
		value: { endpoint: live.endpoint, p256dh: live.keys?.p256dh || "", auth: live.keys?.auth || "" },
	};
}

export function urlBase64ToUint8Array(value) {
	const padding = "=".repeat((4 - (value.length % 4)) % 4);
	const normalized = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
	const raw = atob(normalized);
	const bytes = new Uint8Array(raw.length);
	for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
	return bytes;
}

export function alertChoices(source = {}) {
	return {
		notify_scheduled: source.notify_scheduled !== false,
		notify_changed: source.notify_changed !== false,
		notify_cancelled: source.notify_cancelled !== false,
		notify_live: source.notify_live !== false,
		notify_ended: source.notify_ended !== false,
		notify_score: source.notify_score !== false,
		notify_reminder: source.notify_reminder !== false,
		notify_sync_problem: source.notify_sync_problem !== false,
	};
}

// What the browser's notification permission means for this site, in plain words.
export function permissionLabel(permission, supported = true) {
	if (!supported) return "This browser cannot show web push alerts.";
	if (permission === "granted") return "Browser notifications are allowed for this site.";
	if (permission === "denied") return "Browser notifications are blocked for this site. Allow them in the site settings, then reload.";
	return "Browser notifications have not been allowed yet. Nothing is asked until you tap the button.";
}
