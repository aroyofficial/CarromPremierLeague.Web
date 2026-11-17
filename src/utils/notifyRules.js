// Pure rules for the application-wide notification system. No Vue here, so they can be unit-tested with node --test.

export const NOTIFY_TYPES = ["success", "info", "warning", "error", "loading"];

// Most notifications on screen at once. Loading and critical ones are never trimmed.
export const MAX_VISIBLE = 4;

// Default time on screen, in milliseconds.
const DEFAULTS = {
	success: 4000, // 3–5 s
	info: 5000,
	warning: 8000, // 6–10 s: recoverable, contextual
	error: 8000, // 6–10 s: recoverable, contextual
};

// Allowed range for a custom duration. Critical notifications ignore this and persist.
const RANGES = {
	success: [3000, 5000],
	info: [3000, 6000],
	warning: [6000, 10000],
	error: [6000, 10000],
};

/**
 * How long a notification stays, in ms. 0 means it stays until dismissed.
 * - loading: until the caller closes or updates it
 * - critical (security, session, destructive failures): until dismissed
 * - error: until dismissed, because the toast is often the only explanation of what failed.
 *   Pass contextual: true when a field-level error on screen explains it too; then it clears.
 */
export function durationFor(type, { critical = false, contextual = false, duration } = {}) {
	if (type === "loading") return 0;
	if (critical) return 0;
	if (type === "error" && !contextual) return 0;
	const range = RANGES[type] || RANGES.info;
	if (typeof duration === "number" && duration > 0) {
		return Math.min(range[1], Math.max(range[0], duration));
	}
	return DEFAULTS[type] ?? DEFAULTS.info;
}

// The same message of the same type is shown once and counted, instead of stacking copies.
export function dedupeKey(type, message, key) {
	return key || `${type}:${String(message ?? "")}`;
}

// Which items to remove so that no more than MAX_VISIBLE remain. Oldest first, never loading or critical.
export function overflowIds(items, max = MAX_VISIBLE) {
	const removable = items.filter((item) => item.type !== "loading" && !item.critical);
	const excess = items.length - max;
	if (excess <= 0) return [];
	return removable.slice(0, excess).map((item) => item.id);
}

// After navigation, errors and warnings raised on the previous page no longer apply.
// Critical ones stay until dismissed; anything raised after the navigation started stays too.
export function staleIds(items, navigationStartedAt) {
	return items
		.filter((item) => (item.type === "error" || item.type === "warning") && !item.critical)
		.filter((item) => typeof item.createdAt === "number" && item.createdAt < navigationStartedAt)
		.map((item) => item.id);
}

// Errors and warnings are announced assertively; everything else politely.
export function liveRole(type) {
	return type === "error" || type === "warning" ? "alert" : "status";
}
