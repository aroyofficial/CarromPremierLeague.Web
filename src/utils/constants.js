const Routes = Object.freeze({
	NOT_FOUND: "/not-found",
	HOME: "/",
	POINTS_TABLE: "/points-table",
	RULES: "/rules",
	FIXTURES: "/fixtures",
	SCHEDULE: "/schedule",
	TEAMS: "/teams",
	PLAYERS: "/players",
	STATS: "/stats",
	PLAYER_STATS: "/stats/players",
	LOGIN: "/login",
	ADMIN: "/admin",
});

const AdminSections = Object.freeze([
	{ name: "admin-dashboard", path: "", label: "Overview", icon: "DataBoard" },
	{ name: "admin-seasons", path: "seasons", label: "Seasons", icon: "Calendar" },
	{ name: "admin-teams", path: "teams", label: "Teams", icon: "Flag" },
	{ name: "admin-players", path: "players", label: "Players", icon: "User" },
	{ name: "admin-rosters", path: "rosters", label: "Rosters", icon: "Connection" },
	{ name: "admin-matches", path: "matches", label: "Matches", icon: "Trophy" },
	{ name: "admin-countries", path: "countries", label: "Countries", icon: "Location" },
	{ name: "admin-users", path: "users", label: "Admin Users", icon: "Lock" },
]);

const NavItems = Object.freeze([
	{ label: "Home", path: Routes.HOME },
	{ label: "Schedule", path: Routes.SCHEDULE },
	{ label: "Points Table", path: Routes.POINTS_TABLE },
	{ label: "Rules", path: Routes.RULES },
	{ label: "Teams", path: Routes.TEAMS },
	{ label: "Players", path: Routes.PLAYERS },
	{ label: "Stats", path: Routes.STATS },
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
		id: 7,
		name: "Golden Strike",
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
	AdminSections,
	LEAGUE_TIMEZONE,
	MatchStatus,
	MatchCategory,
	MatchOutcome,
	SeasonStatus,
	TossOutcome,
	BackgroundMusic,
};
