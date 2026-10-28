const Routes = Object.freeze({
	NOT_FOUND: "/not-found",
	HOME: "/",
	POINTS_TABLE: "/points-table",
	RULES: "/rules",
	FIXTURES: "/fixtures",
	TEAMS: "/teams",
	PLAYERS: "/players",
	STATS: "/stats",
	LOGIN: "/login",
});

const NavItems = Object.freeze([
	{ label: "Home", path: Routes.HOME },
	{ label: "Points Table", path: Routes.POINTS_TABLE },
	{ label: "Rules", path: Routes.RULES },
	{ label: "Teams", path: Routes.TEAMS },
	{ label: "Players", path: Routes.PLAYERS },
]);

const LEAGUE_TIMEZONE = "Asia/Kolkata";

const SeasonStatus = Object.freeze({
	SCHEDULED: 1,
	IN_PROGRESS: 2,
	FINISHED: 3,
});

const MatchStatus = Object.freeze([
	{
		id: 1,
		name: "Scheduled",
	},
	{
		id: 2,
		name: "In Progress",
	},
	{
		id: 3,
		name: "Played",
	},
]);

const MatchCategory = Object.freeze([
	{
		id: 1,
		name: "League",
	},
	{
		id: 3,
		name: "Eliminator",
	},
	{
		id: 4,
		name: "Qualifier 1",
	},
	{
		id: 5,
		name: "Qualifier 2",
	},
	{
		id: 6,
		name: "Friendly",
	},
	{
		id: 2,
		name: "Final",
	},
]);

const MatchOutcome = Object.freeze({
	Team1Won: 1,
	Team2Won: 2,
	NotDecided: 3,
});

const TossOutcome = Object.freeze({
	Team1Won: 1,
	Team2Won: 2,
	NotDecided: 3,
});

const BackgroundMusic = Object.freeze({
	Match: "cpl-bgm-audio",
	Countdown: "countdown-bgm-audio",
	Horn: "horn-bgm-audio",
});

export {
	Routes,
	NavItems,
	LEAGUE_TIMEZONE,
	MatchStatus,
	MatchCategory,
	MatchOutcome,
	SeasonStatus,
	TossOutcome,
	BackgroundMusic,
};
