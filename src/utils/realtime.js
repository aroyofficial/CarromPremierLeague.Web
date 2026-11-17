/**
 * Server change notices over EventSource. The server only says what changed;
 * screens refetch. Polling continues, slower while a stream is open.
 * VITE_REALTIME_ENABLED must be the string "true", and the API flag must be on.
 */

import { apiBaseUrl } from "@/services/api";
import { areaMatches } from "@/utils/realtimeRules";
import { connect, keepFresh as keepFreshWith } from "@/utils/realtimeStream";

export const realtimeEnabled = () => import.meta.env.VITE_REALTIME_ENABLED === "true";

const streamUrl = (path) => `${String(apiBaseUrl || "").replace(/\/?$/, "/")}${path}`;
const available = () => realtimeEnabled() && typeof EventSource !== "undefined";

// Every screen in this tab shares one public connection.
const listeners = new Set();
let publicState = "off";
let closePublic = null;

const setPublicState = (state) => {
	publicState = state;
	for (const listener of listeners) listener.onState?.(state);
};

export const watchPublic = ({ onEvent, onState, areas }) => {
	if (!available()) {
		onState?.("off");
		return () => {};
	}
	const listener = { onEvent, onState, areas };
	listeners.add(listener);
	if (!closePublic) {
		publicState = "down";
		closePublic = connect({
			url: async () => streamUrl("realtime/public"),
			events: ["league.invalidated"],
			onEvent: (body) => {
				for (const item of listeners) {
					if (areaMatches(body, item.areas)) item.onEvent?.(body);
				}
			},
			onState: setPublicState,
		});
	}
	onState?.(publicState);
	return () => {
		listeners.delete(listener);
		if (!listeners.size && closePublic) {
			closePublic();
			closePublic = null;
			publicState = "off";
		}
	};
};

export const watchAdmin = ({ getTicket, onEvent, onState }) => {
	if (!available()) {
		onState?.("off");
		return () => {};
	}
	onState?.("down");
	return connect({
		url: async () => {
			const ticket = await getTicket();
			return ticket ? streamUrl(`realtime/admin?ticket=${encodeURIComponent(ticket)}`) : null;
		},
		events: ["admin.login_request.changed"],
		onEvent: (body) => onEvent?.(body),
		onState: (state) => onState?.(state),
	});
};

export const keepFresh = (refresh, { watch, areas, fastMs, slowMs } = {}) =>
	keepFreshWith(refresh, {
		watch: watch || ((handlers) => watchPublic({ ...handlers, areas })),
		fastMs,
		slowMs,
	});
