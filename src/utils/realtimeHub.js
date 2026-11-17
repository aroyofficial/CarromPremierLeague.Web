import { areaMatches, EVENT_TYPES } from "./realtimeRules.js";
import { connect as connectStream } from "./realtimeStream.js";

/**
 * One connection per tab. Signed out it reads the public stream; signed in it reads the admin
 * stream, which carries public, staff, and this admin's own notices. Every screen registers here.
 */
export const createHub = ({ available, streamUrl, connect = connectStream }) => {
	const listeners = new Set();
	let state = "off";
	let close = null;
	let ticketSource = null;

	const setState = (next) => {
		state = next;
		for (const listener of listeners) listener.onState?.(next);
	};

	const dispatch = (body) => {
		for (const listener of listeners) {
			if (areaMatches(body, listener.areas)) listener.onEvent?.(body);
		}
	};

	const url = () => {
		const source = ticketSource;
		if (!source) return async () => streamUrl("realtime/public");
		return async () => {
			const ticket = await source();
			return ticket ? streamUrl(`realtime/admin?ticket=${encodeURIComponent(ticket)}`) : null;
		};
	};

	const open = () => {
		if (!available()) {
			setState("off");
			return;
		}
		setState("down");
		close = connect({ url: url(), events: EVENT_TYPES, onEvent: dispatch, onState: setState });
	};

	const shut = () => {
		if (!close) return;
		close();
		close = null;
	};

	const reopen = () => {
		shut();
		if (listeners.size) open();
		else state = "off";
	};

	return {
		watch({ areas, onEvent, onState }) {
			const listener = { areas, onEvent, onState };
			listeners.add(listener);
			if (!close && available()) open();
			onState?.(available() ? state : "off");
			return () => {
				listeners.delete(listener);
				if (!listeners.size) {
					shut();
					state = "off";
				}
			};
		},
		// `source` returns a one-time ticket for the signed-in admin, or null when signed out.
		setTicketSource(source) {
			const next = source || null;
			if (next === ticketSource) return;
			ticketSource = next;
			if (listeners.size) reopen();
		},
		mode: () => (ticketSource ? "admin" : "public"),
		state: () => state,
	};
};
