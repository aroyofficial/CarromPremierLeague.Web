const SCHEDULED = 1;
const IN_PROGRESS = 2;
const PLAYED = 3;
const LEAGUE = 1;
const MIN_SEASON_TEAMS = 4;
const TEAM_PLACES = 2;

const day = (value) => String(value || "").slice(0, 10);

const plural = (count, one, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

export const seasonPhase = (season, today) => {
	if (!season) return { key: "none", label: "No season yet", detail: "" };
	const start = day(season.start_date);
	const end = day(season.end_date);
	if (start && start > today) {
		const days = Math.round((Date.parse(start) - Date.parse(today)) / 86400000);
		return { key: "upcoming", label: "Upcoming", detail: days === 1 ? "Starts tomorrow" : `Starts in ${days} days` };
	}
	if (end && end < today) return { key: "finished", label: "Finished", detail: `Ended ${end}` };
	return { key: "running", label: "In progress", detail: start ? `Started ${start}` : "" };
};

export const matchSummary = (matches, today) => {
	const list = matches || [];
	const played = list.filter((match) => match.status === PLAYED).length;
	const live = list.filter((match) => match.status === IN_PROGRESS);
	const todays = list.filter((match) => match.status !== PLAYED && day(match.scheduled_date) === today);
	const upcoming = list
		.filter((match) => match.status === SCHEDULED && day(match.scheduled_date) > today)
		.sort((a, b) => day(a.scheduled_date).localeCompare(day(b.scheduled_date)) || a.order - b.order);
	const nextDate = upcoming.length ? day(upcoming[0].scheduled_date) : "";
	return {
		total: list.length,
		played,
		live,
		today: todays.sort((a, b) => a.order - b.order),
		nextDate,
		nextCount: nextDate ? upcoming.filter((match) => day(match.scheduled_date) === nextDate).length : 0,
	};
};

/**
 * Work waiting for this admin. Each task is listed only when `can` allows the area,
 * so an admin never sees a task they cannot act on.
 */
export const overviewTasks = ({ season, phase, seasonTeams, rosters, matches, drafts, admins, today, can }) => {
	const tasks = [];
	const teams = seasonTeams || [];
	const list = matches || [];

	if (season && phase.key === "upcoming") {
		if (can.seasonTeams && teams.length < MIN_SEASON_TEAMS) {
			const missing = MIN_SEASON_TEAMS - teams.length;
			tasks.push({
				id: "season-teams",
				tone: "warning",
				title: `Add ${plural(missing, "more team")} to ${season.name}`,
				detail: `A season needs at least ${MIN_SEASON_TEAMS} teams before its matches can be scheduled.`,
				to: "admin-seasons",
				action: "Open seasons",
			});
		}
		const leagueMatches = list.filter((match) => match.category === LEAGUE).length;
		if (can.schedule && teams.length >= MIN_SEASON_TEAMS && leagueMatches === 0) {
			tasks.push({
				id: "season-schedule",
				tone: "info",
				title: `Schedule the league matches for ${season.name}`,
				detail: `${plural(teams.length, "team")} are in. The schedule is not built yet.`,
				to: "admin-seasons",
				action: "Open seasons",
			});
		}
	}

	if (season && can.rosters && teams.length) {
		const counts = new Map(teams.map((team) => [team.team_id, 0]));
		(rosters || []).forEach((item) => counts.set(item.team_id, (counts.get(item.team_id) || 0) + 1));
		const short = [...counts.values()].filter((count) => count < TEAM_PLACES).length;
		if (short) {
			tasks.push({
				id: "roster-places",
				tone: "warning",
				title: `${plural(short, "team")} ${short === 1 ? "has" : "have"} open player places`,
				detail: `Each team plays with ${TEAM_PLACES} players.`,
				to: "admin-rosters",
				action: "Open rosters",
			});
		}
	}

	if (can.runMatches) {
		const live = list.filter((match) => match.status === IN_PROGRESS);
		if (live.length) {
			tasks.push({
				id: "matches-live",
				tone: "live",
				title: `${plural(live.length, "match", "matches")} in progress`,
				detail: "Finish or save the scorecard from the matches console.",
				to: "admin-matches",
				action: "Open matches",
			});
		}
		const overdue = list.filter((match) => match.status === SCHEDULED && day(match.scheduled_date) && day(match.scheduled_date) < today);
		if (overdue.length) {
			tasks.push({
				id: "matches-overdue",
				tone: "warning",
				title: `${plural(overdue.length, "match", "matches")} past ${overdue.length === 1 ? "its" : "their"} date and not played`,
				detail: "Play them or move them to a new date.",
				to: "admin-matches",
				action: "Open matches",
			});
		}
	}

	if (can.publishGallery && drafts.count) {
		tasks.push({
			id: "gallery-drafts",
			tone: "info",
			title: `${drafts.more ? `${drafts.count}+` : drafts.count} gallery ${drafts.count === 1 && !drafts.more ? "item is" : "items are"} waiting to be published`,
			detail: "Drafts stay off the public gallery until they are published.",
			to: "admin-gallery",
			action: "Open gallery",
		});
	}

	if (can.viewAdmins) {
		const waiting = (admins || []).filter((admin) => admin.is_active && admin.must_change_password).length;
		if (waiting) {
			tasks.push({
				id: "admins-first-sign-in",
				tone: "info",
				title: `${plural(waiting, "admin")} ${waiting === 1 ? "has" : "have"} not finished first sign-in`,
				detail: "They still need to set their own password.",
				to: "admin-users",
				action: "Open users",
			});
		}
	}

	return tasks;
};
