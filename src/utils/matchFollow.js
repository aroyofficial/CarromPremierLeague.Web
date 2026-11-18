export function feedLinks(httpsUrl) {
	const webcal = String(httpsUrl || "").replace(/^https:\/\//, "webcal://").replace(/^http:\/\//, "webcal://");
	return { https: httpsUrl, webcal };
}

export function pushSupported() {
	return typeof navigator !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

const SYNC_STATE_LABELS = {
	connected: "Connected",
	update_pending: "Update pending",
	synced: "Synced",
	sync_failed: "Sync failed. It will retry.",
	reauthorization_required: "Reauthorization required",
};

export function syncStateLabel(state) {
	return SYNC_STATE_LABELS[state] || "Connected";
}

// The worker needs the API address to re-register a rotated subscription on its own.
export function serviceWorkerUrl(baseUrl, apiBase) {
	const base = String(baseUrl || "/");
	const prefix = base.endsWith("/") ? base : `${base}/`;
	return apiBase ? `${prefix}sw.js?api=${encodeURIComponent(apiBase)}` : `${prefix}sw.js`;
}

// The service worker re-registers a rotated subscription without the page. On the next
// visit the page adopts the browser's current endpoint, or forgets one the browser dropped.
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
	};
}
