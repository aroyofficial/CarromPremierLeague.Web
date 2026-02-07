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

export {
	Pages,
	Routes,
	MatchStatus,
	MatchCategory,
	MatchOutcome,
	SeasonStatus,
};
