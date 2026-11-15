export function assistantIsVisible({ enabled, checked, available }) {
	return Boolean(enabled && checked && available);
}
