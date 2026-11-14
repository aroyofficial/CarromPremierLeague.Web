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
	GALLERY: "/gallery",
	PLAYER_STATS: "/stats/players",
	LOGIN: "/login",
	ADMIN: "/admin",
});

// Codes match CarromPremierLeague.API core/permissions.py.
const Permission = Object.freeze({
	SEASONS_CREATE: "seasons.create",
	SEASONS_UPDATE: "seasons.update",
	SEASONS_DELETE: "seasons.delete",
	SEASONS_TEAMS: "seasons.teams",
	TEAMS_CREATE: "teams.create",
	TEAMS_UPDATE: "teams.update",
	TEAMS_DELETE: "teams.delete",
	PLAYERS_CREATE: "players.create",
	PLAYERS_UPDATE: "players.update",
	PLAYERS_DELETE: "players.delete",
	COUNTRIES_CREATE: "countries.create",
	COUNTRIES_UPDATE: "countries.update",
	COUNTRIES_DELETE: "countries.delete",
	ROSTERS_MANAGE: "rosters.manage",
	MATCHES_CREATE: "matches.create",
	MATCHES_UPDATE: "matches.update",
	MATCHES_SCORECARD: "matches.scorecard",
	MATCHES_RESET: "matches.reset",
	MATCHES_DELETE: "matches.delete",
	SETTINGS_UPDATE: "settings.update",
	ADMINS_VIEW: "admins.view",
	ADMINS_CREATE: "admins.create",
	ADMINS_UPDATE: "admins.update",
	ADMINS_DELETE: "admins.delete",
	PERMISSIONS_MANAGE: "permissions.manage",
	GALLERY_CREATE: "gallery.create",
	GALLERY_UPDATE: "gallery.update",
	GALLERY_PUBLISH: "gallery.publish",
	GALLERY_DELETE: "gallery.delete",
});

const areaCodes = (area) => Object.values(Permission).filter((code) => code.startsWith(`${area}.`));

// An empty permissions list means every signed-in admin can open the section.
const AdminSections = Object.freeze([
	{ name: "admin-dashboard", path: "", label: "Overview", icon: "DataBoard", permissions: [] },
	{ name: "admin-seasons", path: "seasons", label: "Seasons", icon: "Calendar", permissions: areaCodes("seasons") },
	{ name: "admin-teams", path: "teams", label: "Teams", icon: "Flag", permissions: areaCodes("teams") },
	{ name: "admin-players", path: "players", label: "Players", icon: "User", permissions: areaCodes("players") },
	{ name: "admin-gallery", path: "gallery", label: "Gallery", icon: "Picture", permissions: areaCodes("gallery") },
	{ name: "admin-rosters", path: "rosters", label: "Rosters", icon: "Connection", permissions: areaCodes("rosters") },
	{ name: "admin-matches", path: "matches", label: "Matches", icon: "Trophy", permissions: areaCodes("matches") },
	{ name: "admin-countries", path: "countries", label: "Countries", icon: "Location", permissions: areaCodes("countries") },
	{
		name: "admin-users",
		path: "users",
		label: "Users",
		icon: "UserFilled",
		permissions: [Permission.ADMINS_VIEW, Permission.ADMINS_CREATE],
	},
	{
		name: "admin-permissions",
		path: "permissions",
		label: "Permissions",
		icon: "Lock",
		permissions: [Permission.PERMISSIONS_MANAGE],
	},
	{ name: "admin-settings", path: "settings", label: "Settings", icon: "Setting", permissions: [Permission.SETTINGS_UPDATE] },
]);

const NavItems = Object.freeze([
	{ label: "Home", path: Routes.HOME },
	{ label: "Schedule", path: Routes.SCHEDULE },
	{ label: "Points Table", path: Routes.POINTS_TABLE },
	{ label: "Rules", path: Routes.RULES },
	{ label: "Teams", path: Routes.TEAMS },
	{ label: "Players", path: Routes.PLAYERS },
	{ label: "Gallery", path: Routes.GALLERY },
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
	Permission,
	LEAGUE_TIMEZONE,
	MatchStatus,
	MatchCategory,
	MatchOutcome,
	SeasonStatus,
	TossOutcome,
	BackgroundMusic,
};
