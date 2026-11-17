// The one way to tell the admin or a visitor that something happened.
// Shown by NotifyHost.vue (mounted once in App.vue). Use confirm dialogs (ElMessageBox) for questions, not this.
//
//   notify.success("Saved");
//   notify.error("Could not save", { critical: true });   // stays until dismissed
//   const job = notify.loading("Uploading…");
//   job.update("success", "Uploaded"); // or job.close()

import { reactive } from "vue";
import { MAX_VISIBLE, dedupeKey, durationFor, overflowIds, staleIds } from "./notifyRules";

export const notifyState = reactive({ items: [] });

let nextId = 1;

const trim = () => {
	const ids = overflowIds(notifyState.items, MAX_VISIBLE);
	if (!ids.length) return;
	notifyState.items = notifyState.items.filter((item) => !ids.includes(item.id));
};

const find = (id) => notifyState.items.find((item) => item.id === id);

function show(type, message, options = {}) {
	const key = dedupeKey(type, message, options.key);
	const existing = notifyState.items.find((item) => item.key === key);
	if (existing) {
		// Same message again: count it and restart the timer.
		existing.count += 1;
		existing.serial += 1;
		existing.createdAt = Date.now();
		existing.duration = durationFor(type, options);
		return existing.id;
	}
	const item = {
		id: nextId++,
		key,
		type,
		title: options.title || "",
		message: String(message ?? ""),
		critical: Boolean(options.critical),
		duration: durationFor(type, options),
		count: 1,
		serial: 0,
		createdAt: Date.now(),
	};
	notifyState.items.push(item);
	trim();
	return item.id;
}

export function dismiss(id) {
	notifyState.items = notifyState.items.filter((item) => item.id !== id);
}

export function dismissAll() {
	notifyState.items = [];
}

/** Called after a route change with the time the navigation started. */
export function clearStale(navigationStartedAt) {
	const ids = staleIds(notifyState.items, navigationStartedAt);
	if (ids.length) notifyState.items = notifyState.items.filter((item) => !ids.includes(item.id));
}

export const notify = {
	success: (message, options) => show("success", message, options),
	info: (message, options) => show("info", message, options),
	warning: (message, options) => show("warning", message, options),
	error: (message, options) => show("error", message, options),
	/** Returns a handle. update() changes the type and message; close() removes it. */
	loading(message, options = {}) {
		const id = show("loading", message, { ...options, key: options.key || `loading:${nextId}` });
		return {
			id,
			update(type, nextMessage, updateOptions = {}) {
				const item = find(id);
				if (!item) return;
				item.type = type;
				item.message = String(nextMessage ?? "");
				item.critical = Boolean(updateOptions.critical);
				item.duration = durationFor(type, updateOptions);
				item.key = dedupeKey(type, nextMessage, updateOptions.key);
				item.serial += 1;
			},
			close() {
				dismiss(id);
			},
		};
	},
};
