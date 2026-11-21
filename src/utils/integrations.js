export const groupAppScopes = (availableScopes, heldPermissions) => {
	const held = new Set(Array.isArray(heldPermissions) ? heldPermissions : []);
	const groups = new Map();
	for (const scope of Array.isArray(availableScopes) ? availableScopes : []) {
		if (!held.has(scope.code)) continue;
		if (scope.parent && !held.has(scope.parent)) continue;
		if (!groups.has(scope.area)) {
			groups.set(scope.area, {
				area: scope.area,
				areaName: scope.area_name || scope.area,
				scopes: [],
			});
		}
		groups.get(scope.area).scopes.push(scope);
	}
	return [...groups.values()];
};

export const toggleAppScope = (selectedCodes, code, on, availableScopes) => {
	const catalog = Array.isArray(availableScopes) ? availableScopes : [];
	const byCode = new Map(catalog.map((item) => [item.code, item]));
	const next = new Set(Array.isArray(selectedCodes) ? selectedCodes : []);
	if (!byCode.has(code)) return [...next];

	if (on) {
		next.add(code);
		const parent = byCode.get(code)?.parent;
		if (parent && byCode.has(parent)) next.add(parent);
	} else {
		next.delete(code);
		for (const item of catalog) {
			if (item.parent === code) next.delete(item.code);
		}
	}

	return catalog.filter((item) => next.has(item.code)).map((item) => item.code);
};

/** Turns on or off every scope of one area, keeping parents and children consistent. */
export const toggleScopeGroup = (selectedCodes, group, on, availableScopes) => {
	let next = Array.isArray(selectedCodes) ? [...selectedCodes] : [];
	for (const scope of group?.scopes || []) {
		const has = next.includes(scope.code);
		if (on && !has) next = toggleAppScope(next, scope.code, true, availableScopes);
		if (!on && has) next = toggleAppScope(next, scope.code, false, availableScopes);
	}
	return next;
};

export const groupWebhookEvents = (availableEvents) => {
	const groups = new Map();
	for (const item of Array.isArray(availableEvents) ? availableEvents : []) {
		const groupName = item.group || "Events";
		if (!groups.has(groupName)) {
			groups.set(groupName, { group: groupName, events: [] });
		}
		groups.get(groupName).events.push(item);
	}
	return [...groups.values()];
};

/** Keeps the groups and items whose name, code, description or group match the search. */
export const filterByTerm = (groups, term, fields) => {
	const needle = String(term || "").trim().toLowerCase();
	if (!needle) return groups;
	return groups
		.map((group) => {
			const groupHit = String(group.title || "").toLowerCase().includes(needle);
			const items = group.items.filter(
				(item) => groupHit || fields.some((field) => String(item[field] ?? "").toLowerCase().includes(needle)),
			);
			return { ...group, items };
		})
		.filter((group) => group.items.length);
};

export const AUTH_TYPES = Object.freeze([
	{ value: "none", label: "None", hint: "The endpoint does not need a credential." },
	{ value: "bearer", label: "Bearer token", hint: "Sent as Authorization: Bearer <token>." },
	{ value: "basic", label: "Basic", hint: "Sent as Authorization: Basic <username:password>." },
	{ value: "header", label: "Custom header", hint: "Sent as one header you name, such as X-Api-Key." },
]);

const HEADER_NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const RESERVED_HEADERS = new Set([
	"host",
	"content-length",
	"content-type",
	"content-encoding",
	"transfer-encoding",
	"connection",
	"keep-alive",
	"upgrade",
	"te",
	"trailer",
	"expect",
	"user-agent",
	"cookie",
	"set-cookie",
	"proxy-authorization",
	"proxy-authenticate",
]);

/** An empty string means the name is acceptable. */
export const headerNameError = (name) => {
	const value = String(name || "").trim();
	if (!value) return "Enter the header name.";
	if (value.length > 100) return "Header name is too long.";
	if (!HEADER_NAME.test(value)) return "Use letters, digits and - _ . only.";
	const lowered = value.toLowerCase();
	if (RESERVED_HEADERS.has(lowered) || lowered.startsWith("x-cpl-")) return `${value} is set by CPL and cannot be used.`;
	return "";
};

/** An empty string means the URL is acceptable. The server repeats this check, and also blocks private addresses. */
export const webhookUrlError = (url) => {
	const value = String(url || "").trim();
	if (!value) return "Enter the endpoint URL.";
	let parsed;
	try {
		parsed = new URL(value);
	} catch {
		return "Enter a full URL, such as https://example.com/hooks/cpl.";
	}
	if (parsed.username || parsed.password) return "Put the credential in Authorization, not in the URL.";
	if (parsed.protocol === "https:") return "";
	const local = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
	if (parsed.protocol === "http:" && local) return "";
	return "The endpoint must use https://.";
};

/** What the form needs to show and send for the credential. */
export const blankAuth = () => ({
	type: "none",
	token: "",
	username: "",
	password: "",
	headerName: "",
	headerValue: "",
	// True while editing a webhook that already has a stored credential and the admin keeps it.
	keep: false,
});

export const authFromWebhook = (hook) => ({
	...blankAuth(),
	type: hook?.auth_type || "none",
	headerName: hook?.auth_header_name || "",
	keep: Boolean(hook?.auth_type && hook.auth_type !== "none"),
});

/** An empty string means the credential fields are complete. */
export const authError = (auth) => {
	if (auth.keep || auth.type === "none") return "";
	if (auth.type === "bearer") return auth.token.trim() ? "" : "Enter the bearer token.";
	if (auth.type === "basic") {
		if (!auth.username.trim()) return "Enter the username.";
		if (auth.username.includes(":")) return "The username cannot contain a colon.";
		return auth.password ? "" : "Enter the password.";
	}
	if (auth.type === "header") {
		const name = headerNameError(auth.headerName);
		if (name) return name;
		return auth.headerValue.trim() ? "" : "Enter the header value.";
	}
	return "Choose how the endpoint is authorized.";
};

/**
 * The credential part of a save request. When editing and the credential is kept, nothing is sent, so
 * the stored one stays. "none" removes it.
 */
export const authPayload = (auth) => {
	if (auth.keep) return {};
	if (auth.type === "bearer") return { auth_type: "bearer", auth_token: auth.token.trim() };
	if (auth.type === "basic") return { auth_type: "basic", auth_username: auth.username.trim(), auth_password: auth.password };
	if (auth.type === "header") {
		return { auth_type: "header", auth_header_name: auth.headerName.trim(), auth_header_value: auth.headerValue.trim() };
	}
	return { auth_type: "none" };
};

/** Describes the stored credential for a list row, without ever showing it. */
export const authSummary = (hook) => {
	switch (hook?.auth_type) {
		case "bearer":
			return "Bearer token";
		case "basic":
			return "Basic auth";
		case "header":
			return hook.auth_header_name ? `${hook.auth_header_name} header` : "Custom header";
		default:
			return "";
	}
};

/** The API sends UTC times without a zone. Read them as UTC, not as local time. */
export const parseServerTime = (value) => {
	if (!value) return null;
	if (value instanceof Date) return value;
	const text = String(value);
	const zoned = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text);
	const date = new Date(zoned ? text : `${text}Z`);
	return Number.isNaN(date.getTime()) ? null : date;
};

export const relativeTime = (value, now = Date.now()) => {
	const date = parseServerTime(value);
	if (!date) return "";
	const diff = date.getTime() - now;
	const abs = Math.abs(diff);
	const minute = 60_000;
	const hour = 60 * minute;
	const day = 24 * hour;
	let text;
	if (abs < minute) return "just now";
	if (abs < hour) text = `${Math.round(abs / minute)} min`;
	else if (abs < day) text = `${Math.round(abs / hour)} h`;
	else if (abs < 30 * day) text = `${Math.round(abs / day)} d`;
	else return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
	return diff < 0 ? `${text} ago` : `in ${text}`;
};

export const fullTime = (value) => {
	const date = parseServerTime(value);
	return date ? date.toLocaleString() : "";
};

const isSuccess = (code) => Number(code) >= 200 && Number(code) < 300;

/** paused | failing | healthy | new */
export const webhookStatus = (hook) => {
	if (!hook?.is_active) return "paused";
	if (hook.failure_count > 0 || (hook.last_status_code && !isSuccess(hook.last_status_code))) return "failing";
	if (hook.last_delivered_at) return "healthy";
	return "new";
};

export const WEBHOOK_STATUS_LABEL = Object.freeze({
	paused: "Paused",
	failing: "Failing",
	healthy: "Healthy",
	new: "No deliveries yet",
});

export const summarizeWebhooks = (hooks) => {
	const list = Array.isArray(hooks) ? hooks : [];
	return {
		total: list.length,
		active: list.filter((hook) => hook.is_active).length,
		failing: list.filter((hook) => webhookStatus(hook) === "failing").length,
	};
};

export const filterWebhooks = (hooks, search, status) => {
	const needle = String(search || "").trim().toLowerCase();
	return (Array.isArray(hooks) ? hooks : []).filter((hook) => {
		if (status && status !== "all" && webhookStatus(hook) !== status) return false;
		if (!needle) return true;
		return [hook.name, hook.url, hook.description].some((value) => String(value ?? "").toLowerCase().includes(needle));
	});
};

const EXPIRING_SOON_MS = 7 * 24 * 60 * 60 * 1000;

/** expired | paused | expiring | active */
export const appStatus = (app, now = Date.now()) => {
	const expires = parseServerTime(app?.expires_at);
	if (expires && expires.getTime() <= now) return "expired";
	if (!app?.is_active) return "paused";
	if (expires && expires.getTime() - now <= EXPIRING_SOON_MS) return "expiring";
	return "active";
};

export const APP_STATUS_LABEL = Object.freeze({
	expired: "Expired",
	paused: "Paused",
	expiring: "Expiring soon",
	active: "Active",
});

export const summarizeApps = (apps, now = Date.now()) => {
	const list = Array.isArray(apps) ? apps : [];
	const states = list.map((app) => appStatus(app, now));
	return {
		total: list.length,
		active: states.filter((state) => state === "active" || state === "expiring").length,
		attention: states.filter((state) => state === "expired" || state === "expiring").length,
	};
};

export const filterApps = (apps, search, status, now = Date.now()) => {
	const needle = String(search || "").trim().toLowerCase();
	return (Array.isArray(apps) ? apps : []).filter((app) => {
		if (status && status !== "all" && appStatus(app, now) !== status) return false;
		if (!needle) return true;
		return [app.name, app.description, app.key_prefix].some((value) => String(value ?? "").toLowerCase().includes(needle));
	});
};
