export function contactNumberError(number, hasCode) {
	const text = String(number || "").trim();
	if (!text || !hasCode) return "Enter both a country code and a contact number";
	if (!/^\d{10}$/.test(text)) return "Enter exactly 10 digits, without spaces";
	return "";
}

// Optional contact number. Empty is fine. Anything typed must be a complete number with its country code.
// Mirrors the API: Indian numbers are 10-digit mobiles starting 6-9; elsewhere the country code
// and the number (without a leading 0) must make 8 to 15 digits together, as E.164 requires.
export function optionalContactError(number, code) {
	const text = String(number || "").trim();
	const hasCode = Boolean(code);
	if (!text && !hasCode) return "";
	if (!text) return "Enter a contact number, or clear the country code.";
	if (!hasCode) return "Choose a country code for this number.";
	const digits = text.replace(/\D/g, "");
	if (/[^\d\s\-()]/.test(text)) return "Use digits only.";
	if (code === "+91") {
		// Like the API: a trunk 0 and a repeated 91 in front of a 10-digit mobile are allowed.
		const national = digits.replace(/^0+/, "").replace(/^91(?=\d{10}$)/, "");
		return /^[6-9]\d{9}$/.test(national) ? "" : "Enter a 10-digit Indian mobile number that starts with 6 to 9.";
	}
	const total = String(code).replace(/\D/g, "").replace(/^0+/, "").length + digits.replace(/^0+/, "").length;
	return total >= 8 && total <= 15 ? "" : "Enter the full number. With the country code it should be 8 to 15 digits.";
}
