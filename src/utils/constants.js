const Pages = Object.freeze({
	HOME: 0,
	POINTS_TABLE: 1,
	FIXTURES: 2,
	TEAMS: 3,
	PLAYERS: 4,
	GALLERY: 5,
});

const Routes = Object.freeze({
	NOT_FOUND: "/not-found",
	HOME: "/",
	POINTS_TABLE: "/points-table",
	FIXTURES: "/fixtures",
	TEAMS: "/teams",
	PLAYERS: "/players",
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

const MatchObject = Object.freeze([
	{
		id: 1,
		name: "Team 1 Won",
	},
	{
		id: 2,
		name: "Team 2 Won",
	},
	{
		id: 3,
		name: "Not Decided",
	},
]);

export { Pages, Routes, MatchStatus, MatchCategory, MatchObject };
