export function contactNumberError(number, hasCode) {
	const text = String(number || "").trim();
	if (!text || !hasCode) return "Enter both a country code and a contact number";
	if (!/^\d{10}$/.test(text)) return "Enter exactly 10 digits, without spaces";
	return "";
}
