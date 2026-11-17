/**
 * Server change notices over EventSource. The server only says what changed; screens refetch.
 * Polling continues, slower while a stream is open.
 * VITE_REALTIME_ENABLED must be the string "true", and the API flag must be on.
 */

import { apiBaseUrl } from "@/services/api";
import { createHub } from "@/utils/realtimeHub";
import { keepFresh as keepFreshWith } from "@/utils/realtimeStream";

export const realtimeEnabled = () => import.meta.env.VITE_REALTIME_ENABLED === "true";

const streamUrl = (path) => `${String(apiBaseUrl || "").replace(/\/?$/, "/")}${path}`;

export const hub = createHub({
	available: () => realtimeEnabled() && typeof EventSource !== "undefined",
	streamUrl,
});

export const watchLive = (handlers) => hub.watch(handlers);

export const keepFresh = (refresh, { areas, fastMs, slowMs } = {}) =>
	keepFreshWith(refresh, {
		watch: (handlers) => hub.watch({ ...handlers, areas }),
		fastMs,
		slowMs,
	});
