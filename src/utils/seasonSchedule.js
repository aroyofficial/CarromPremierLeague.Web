// The season screen shows one action, and only for an upcoming season with a full group.
export function scheduleButton(teamCount, upcoming, matchCount) {
	if (!upcoming || Number(teamCount) < 4) return null;
	return Number(matchCount) > 0 ? "reschedule" : "schedule";
}

/** How many times a team may meet each other team. One is a single round robin. */
export const DEFAULT_ROUNDS = 1;
export const MAX_ROUNDS = 4;

/** Whatever was typed, as a whole number the API accepts. Anything unusable falls back to one. */
export function clampRounds(value) {
	const rounds = Math.floor(Number(value));
	if (!Number.isFinite(rounds) || rounds < DEFAULT_ROUNDS) return DEFAULT_ROUNDS;
	return Math.min(rounds, MAX_ROUNDS);
}

/** League matches a full schedule holds: every pair of teams, `rounds` times. */
export function leagueMatchCount(teamCount, rounds = DEFAULT_ROUNDS) {
	const teams = Math.max(0, Math.floor(Number(teamCount) || 0));
	return (teams * Math.max(0, teams - 1) * clampRounds(rounds)) / 2;
}

/** "once", "twice", "3 times": how the dialog says how often a pair meets. */
export function roundsWords(rounds) {
	const count = clampRounds(rounds);
	if (count === 1) return "once";
	if (count === 2) return "twice";
	return `${count} times`;
}
