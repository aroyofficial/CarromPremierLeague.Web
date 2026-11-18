// The season screen shows one action, and only for an upcoming season with a full group.
export function scheduleButton(teamCount, upcoming, matchCount) {
	if (!upcoming || Number(teamCount) < 4) return null;
	return Number(matchCount) > 0 ? "reschedule" : "schedule";
}
