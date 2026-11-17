export function isLoading(value) {
	return Boolean(value);
}

export function loadingText(el, value) {
	if (value && typeof value === "object" && typeof value.text === "string") return value.text;
	return el?.getAttribute?.("element-loading-text") || "";
}
