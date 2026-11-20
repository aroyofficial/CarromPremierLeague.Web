import { LEAGUE_TIMEZONE, SeasonStatus } from "./constants.js";

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

const leagueToday = () =>
	new Intl.DateTimeFormat("en-CA", {
		timeZone: LEAGUE_TIMEZONE,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(new Date());

const openingDay = (season) => (season?.start_date ? String(season.start_date).slice(0, 10) : "");

/** A visible season whose opening day is still ahead. */
const opensLater = (season) => Boolean(season?.show && openingDay(season) > leagueToday());

/**
 * The countdown is for a visible season that has not opened.
 * A finished season is not that season, even when its start date is still ahead.
 */
export const countdownSeason = (seasons, currentFinished) => {
	const current = currentShownSeason(seasons);
	return (
		(seasons || [])
			.filter(opensLater)
			.filter((season) => !(currentFinished && current && season.id === current.id))
			.sort((a, b) => openingDay(a).localeCompare(openingDay(b)))[0] || null
	);
};
