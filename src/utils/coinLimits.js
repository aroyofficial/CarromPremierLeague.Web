export const COINS_PER_COLOR = 9;
export const MAX_FINE_COINS = 255;

const count = (value) => Number(value || 0);

export const fineCoins = (single, double) => count(single) + 2 * count(double);

const sum = (rows, read) => rows.reduce((total, row) => total + read(row), 0);

const side = (rows) => ({
	own: sum(rows, (row) => count(row.own)),
	opponent: sum(rows, (row) => count(row.opponent)),
	fines: sum(rows, (row) => fineCoins(row.single, row.double)),
});

// A fine puts one of the team's pocketed coins back on the board, where either team can pocket it again.
// A fine the team cannot pay yet is due and returns nothing, so a colour has
// max(0, own - fines) + the other team's opponent coins of that colour off the board, never more than 9.
export const offBoard = (team, other) => Math.max(0, team.own - team.fines) + other.opponent;

export const teamTotals = (rows, teamId) => {
	const mine = side(rows.filter((row) => row.teamId === teamId));
	const other = side(rows.filter((row) => row.teamId !== teamId));
	return { mine, other };
};

// Score is the coins of this colour off the board. A due fine floors the team's own
// pockets at zero, and coins of this colour pocketed by the other team still count.
export const teamScore = (rows, teamId) => {
	const { mine, other } = teamTotals(rows, teamId);
	return offBoard(mine, other);
};

export const colourOverflow = (rows, teamId) => {
	const { mine, other } = teamTotals(rows, teamId);
	return Math.max(0, offBoard(mine, other) - COINS_PER_COLOR);
};

// A colour is finished once 9 of its coins are off the board, fines included.
export const eitherTeamReachedNine = (rows, teamIds) =>
	teamIds.some((teamId) => teamScore(rows, teamId) >= COINS_PER_COLOR);

// Limits keep every value that is already on the scorecard, so a stored number is never rewritten;
// they only stop a change that would break the nine-coin rule.
const keep = (min, max, value) => ({ min: Math.min(min, value), max: Math.max(max, value) });

export const coinBounds = (rows, row) => {
	const own = count(row.own);
	const opponent = count(row.opponent);
	const single = count(row.single);
	const double = count(row.double);
	const { mine, other } = teamTotals(rows, row.teamId);

	const ownMax = Math.max(0, COINS_PER_COLOR + mine.fines - other.opponent - (mine.own - own));
	// The other colour still free is one number for the whole team. Each player's counter
	// then stops early once a teammate has already pocketed some of those coins.
	const opponentCap = Math.max(0, COINS_PER_COLOR - Math.max(0, other.own - other.fines));
	const opponentMax = Math.max(0, opponentCap - (mine.opponent - opponent));

	const finesNeeded = Math.max(0, mine.own + other.opponent - COINS_PER_COLOR);
	const otherFines = mine.fines - fineCoins(single, double);
	const singleMin = Math.max(0, finesNeeded - (otherFines + 2 * double));
	const doubleMin = Math.max(0, Math.ceil((finesNeeded - (otherFines + single)) / 2));

	const ownLimits = keep(0, ownMax, own);
	const opponentLimits = keep(0, opponentMax, opponent);
	const singleLimits = keep(singleMin, MAX_FINE_COINS - 2 * double, single);
	const doubleLimits = keep(doubleMin, Math.floor((MAX_FINE_COINS - single) / 2), double);

	return {
		ownMin: ownLimits.min,
		ownMax: ownLimits.max,
		opponentMin: opponentLimits.min,
		opponentMax: opponentLimits.max,
		opponentCap,
		singleMin: singleLimits.min,
		singleMax: singleLimits.max,
		doubleMin: doubleLimits.min,
		doubleMax: doubleLimits.max,
	};
};
