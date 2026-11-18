export const NO_MATCH_SCHEDULED = "No match scheduled for the season.";
const NO_MATCH_PLAYED = "No match has been played in this season.";

/** The Golden Striker is a result. It appears only after a match has been played and scored. */
export const showGoldenStriker = ({ matchesPlayed, players }) => {
	const list = players || [];
	if (!list.length) return false;
	if (matchesPlayed == null) return true;
	return Number(matchesPlayed) > 0;
};

export const strikerEmptyMessage = (message, state) => {
	if (showGoldenStriker(state)) return "";
	if (message === NO_MATCH_PLAYED) return message;
	if (Number(state.matchesPlayed) > 0) {
		return message || "No player stats found for completed league-stage matches in this season.";
	}
	return NO_MATCH_SCHEDULED;
};
