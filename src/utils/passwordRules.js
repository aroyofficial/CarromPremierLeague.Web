export const MIN_PASSWORD_LENGTH = 12;

// The API only requires the length. The other checks are guidance shown while typing.
export function passwordChecks(password, confirm) {
	const value = password || "";
	return [
		{ id: "length", label: `At least ${MIN_PASSWORD_LENGTH} characters`, met: value.length >= MIN_PASSWORD_LENGTH, required: true },
		{ id: "mix", label: "Upper and lower case letters", met: /[a-z]/.test(value) && /[A-Z]/.test(value), required: false },
		{ id: "number", label: "A number or a symbol", met: /[\d\W_]/.test(value), required: false },
		{ id: "match", label: "Both passwords match", met: value.length > 0 && value === (confirm || ""), required: true },
	];
}

export function passwordStrength(password) {
	const value = password || "";
	if (!value) return { score: 0, label: "" };
	let score = 0;
	if (value.length >= MIN_PASSWORD_LENGTH) score += 1;
	if (value.length >= 16) score += 1;
	if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
	if (/\d/.test(value)) score += 1;
	if (/[^A-Za-z0-9]/.test(value)) score += 1;
	if (value.length < MIN_PASSWORD_LENGTH) return { score: Math.min(score, 1), label: "Too short" };
	const labels = ["", "Weak", "Fair", "Good", "Strong", "Very strong"];
	return { score, label: labels[score] };
}

export function passwordReady(password, confirm) {
	return passwordChecks(password, confirm).every((check) => !check.required || check.met);
}

export function formatDuration(totalSeconds) {
	const seconds = Math.max(0, Math.floor(totalSeconds));
	const minutes = Math.floor(seconds / 60);
	return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}
