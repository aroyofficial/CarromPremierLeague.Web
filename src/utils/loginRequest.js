const FALLBACK_SECONDS = 10 * 60;

export function requestDeadline(nowMs, expiresIn) {
	const given = Number(expiresIn);
	const seconds = Number.isFinite(given) && given >= 0 ? Math.floor(given) : FALLBACK_SECONDS;
	return nowMs + seconds * 1000;
}

export function secondsLeft(deadlineMs, nowMs) {
	if (!deadlineMs) return 0;
	return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
}
