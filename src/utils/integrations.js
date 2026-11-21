import { Permission } from "./constants.js";

export const SETTINGS_ENTRY_PERMISSIONS = Object.freeze([
	Permission.SETTINGS_UPDATE,
	Permission.WEBHOOKS_MANAGE,
	Permission.APPS_MANAGE,
]);

export const settingsAccess = (permissions) => {
	const held = new Set(Array.isArray(permissions) ? permissions : []);
	const canUpdateSettings = held.has(Permission.SETTINGS_UPDATE);
	const canManageWebhooks = held.has(Permission.WEBHOOKS_MANAGE);
	const canManageApps = held.has(Permission.APPS_MANAGE);
	return {
		canOpen: canUpdateSettings || canManageWebhooks || canManageApps,
		canUpdateSettings,
		canManageWebhooks,
		canManageApps,
	};
};

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
