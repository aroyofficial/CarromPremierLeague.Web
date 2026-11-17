// Show enough of an address to recognise it, never the whole thing.
//   maskEmail("arijit.roy@example.com") -> "a••••••y@example.com"
export function maskEmail(email) {
	const value = String(email || "").trim();
	const at = value.lastIndexOf("@");
	if (at <= 0 || at === value.length - 1) return "";
	const local = value.slice(0, at);
	const domain = value.slice(at);
	if (local.length <= 2) return `${local[0]}•${domain}`;
	return `${local[0]}${"•".repeat(Math.min(local.length - 2, 6))}${local[local.length - 1]}${domain}`;
}
