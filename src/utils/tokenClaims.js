// Reads the claims of a bearer token so the console can show the right thing before the profile loads.
// The signature is checked by the server on every request; nothing here grants access.
export function readClaims(token) {
	if (typeof token !== "string") return {};
	const part = token.split(".")[1];
	if (!part) return {};
	try {
		const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
		const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
		const json = decodeURIComponent(
			atob(padded)
				.split("")
				.map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
				.join(""),
		);
		const claims = JSON.parse(json);
		return claims && typeof claims === "object" ? claims : {};
	} catch {
		return {};
	}
}
