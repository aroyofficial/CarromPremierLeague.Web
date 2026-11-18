import { SeasonStatus } from "./constants.js";

/** Newest season the public site is showing. Seasons arrive newest first. */
export const currentShownSeason = (seasons) => (seasons || []).find((season) => season.show) || null;

/**
 * The champion is the Final winner, and only once every match in the season is played.
 * `winner_id` is that team. An unfinished season has no champion to celebrate.
 */
export const championFromTable = (table) => {
	if (!table || table.season_status !== SeasonStatus.FINISHED || !table.winner_id) return null;
	const standing = (table.standings || []).find((row) => row.team_id === table.winner_id);
	return {
		teamId: table.winner_id,
		teamName: standing?.team_name || "Champion",
	};
};

export const championSeenKey = (seasonId, teamId) => `cpl-champion:${seasonId}:${teamId}`;
