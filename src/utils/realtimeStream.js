import { acceptEvent, CONNECT_TIMEOUT_MS, pollDelayMs, retryDelayMs, STALE_MS } from "./realtimeRules.js";

// Opens one EventSource, reconnecting with backoff. `url` is async so each attempt can fetch a fresh ticket.
export const connect = ({ url, events, onEvent, onState, env = globalThis }) => {
	const seen = new Set();
	let source = null;
	let stopped = false;
	let opened = false;
	let attempt = 0;
	let timer = 0;
	let staleTimer = 0;
	let connectTimer = 0;

	const clearTimers = () => {
		env.clearTimeout(timer);
		env.clearTimeout(staleTimer);
		env.clearTimeout(connectTimer);
	};

	const retry = () => {
		clearTimers();
		source?.close();
		source = null;
		onState("down");
		if (stopped) return;
		attempt += 1;
		timer = env.setTimeout(open, retryDelayMs(attempt) + Math.floor(Math.random() * 400));
	};

	// Any bytes from the server prove the socket is alive. Silence does not.
	const armStale = () => {
		if (stopped) return;
		env.clearTimeout(staleTimer);
		staleTimer = env.setTimeout(retry, STALE_MS);
	};

	const open = async () => {
		if (stopped || source) return;
		let target = null;
		try {
			target = await url();
		} catch {
			target = null;
		}
		if (stopped || source) return;
		if (!target) {
			retry();
			return;
		}
		opened = false;
		source = new env.EventSource(target);
		connectTimer = env.setTimeout(() => {
			if (!opened) retry();
		}, CONNECT_TIMEOUT_MS);
		source.addEventListener("open", () => {
			opened = true;
			env.clearTimeout(connectTimer);
			attempt = 0;
			onState("open");
			armStale();
		});
		source.addEventListener("realtime.heartbeat", armStale);
		for (const name of events) {
			source.addEventListener(name, (message) => {
				armStale();
				let body = null;
				try {
					body = JSON.parse(message.data);
				} catch {
					return;
				}
				if (acceptEvent(body, seen)) onEvent(body);
			});
		}
		source.addEventListener("realtime.revoked", () => {
			stopped = true;
			clearTimers();
			source?.close();
			source = null;
			onState("down");
		});
		source.addEventListener("error", retry);
	};

	const onLine = () => {
		if (stopped) return;
		if (env.navigator?.onLine !== false) open();
		else onState("down");
	};
	env.addEventListener?.("online", onLine);
	open();

	return () => {
		stopped = true;
		clearTimers();
		env.removeEventListener?.("online", onLine);
		source?.close();
		source = null;
	};
};

/**
 * Runs `refresh` on every notice and keeps a fallback poll: `fastMs` while no stream
 * is open, `slowMs` while one is. Returns a stop function.
 */
export const keepFresh = (refresh, { watch, fastMs, slowMs, env = globalThis }) => {
	let timer = 0;
	let delay = 0;
	let state = "off";
	const arm = (nextState) => {
		const connected = nextState === "open" && state !== "open";
		const dropped = state === "open" && nextState !== "open";
		state = nextState;
		const next = pollDelayMs(nextState, fastMs, slowMs);
		if (!timer || next !== delay) {
			delay = next;
			env.clearInterval(timer);
			timer = env.setInterval(refresh, delay);
		}
		// Catch up at the moment the stream comes up or drops, instead of waiting for the next poll.
		if (connected || dropped) refresh();
	};
	arm("off");
	const stop = watch({ onEvent: () => refresh(), onState: arm });
	return () => {
		env.clearInterval(timer);
		timer = 0;
		stop();
	};
};
