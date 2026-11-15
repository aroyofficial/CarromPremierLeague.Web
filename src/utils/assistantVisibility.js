export const ASSISTANT_PERMISSION = "assistant.use";

export function assistantIsVisible({ enabled, checked, available }) {
	return Boolean(enabled && checked && available);
}

// Striker has one switch for the public site and one for the admin console. An older API only sends
// the single `assistant_enabled`, which then applies to both.
export function assistantSwitches(data) {
	const legacy = data?.assistant_enabled;
	const pick = (value) => (typeof value === "boolean" ? value : typeof legacy === "boolean" ? legacy : true);
	return {
		assistant_public_enabled: pick(data?.assistant_public_enabled),
		assistant_admin_enabled: pick(data?.assistant_admin_enabled),
	};
}

// The admin launcher needs the admin switch, a signed-in admin who may use Striker, and a provider.
export function adminAssistantIsVisible({ enabled, checked, available, signedIn, mustChangePassword, hasAccess }) {
	return Boolean(signedIn && !mustChangePassword && hasAccess && assistantIsVisible({ enabled, checked, available }));
}
