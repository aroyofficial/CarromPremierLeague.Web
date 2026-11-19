// The contact field holds the national number only, at most 10 digits.
// A pasted trunk 0 or a repeated 91 in front of a 10-digit mobile is removed first.
export function limitContactDigits(value) {
	let digits = String(value ?? "").replace(/\D/g, "");
	if (digits.length <= 10) return digits;
	const national = digits.replace(/^0+/, "").replace(/^91(?=\d{10}$)/, "");
	return (national.length <= 10 ? national : digits).slice(0, 10);
}

export function contactNumberError(number, hasCode) {
	const text = String(number || "").trim();
	if (!text || !hasCode) return "Enter both a country code and a contact number";
	if (!/^\d{10}$/.test(text)) return "Enter exactly 10 digits, without spaces";
	return "";
}

// Optional contact number. Empty is fine. Anything typed must be a complete number with its country code.
// Mirrors the API: at most 10 digits. Indian numbers are mobiles starting 6-9; elsewhere the
// country code and the number (without a leading 0) must make 8 to 15 digits together.
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
		if (national.length > 10) return "Enter at most 10 digits.";
		return /^[6-9]\d{9}$/.test(national) ? "" : "Enter a 10-digit Indian mobile number that starts with 6 to 9.";
	}
	const nationalDigits = digits.replace(/^0+/, "");
	if (nationalDigits.length > 10) return "Enter at most 10 digits.";
	const total = String(code).replace(/\D/g, "").replace(/^0+/, "").length + nationalDigits.length;
	return total >= 8 && total <= 15 ? "" : "Enter the full number. With the country code it should be 8 to 15 digits.";
}
