export const COINS_PER_COLOR = 9;

const count = (value) => Number(value || 0);

export const fineCoins = (single, double) => count(single) + 2 * count(double);

const total = (rows, key) => rows.reduce((sum, row) => sum + count(row[key]), 0);

export const coinBounds = (rows, row) => {
	const own = count(row.own);
	const opponent = count(row.opponent);
	const sameTeam = rows.filter((item) => item.teamId === row.teamId);
	const otherTeam = rows.filter((item) => item.teamId !== row.teamId);
	const teammateOwn = total(sameTeam, "own") - own;
	const teammateOpponent = total(sameTeam, "opponent") - opponent;
	const teamFines = sameTeam.reduce((sum, item) => sum + fineCoins(item.single, item.double), 0);
	const teamNet = total(sameTeam, "own") - teamFines;
	const otherOwn = total(otherTeam, "own");
	const otherOpponent = total(otherTeam, "opponent");
	const otherFines = otherTeam.reduce((sum, item) => sum + fineCoins(item.single, item.double), 0);

	const ownColorMax = Math.max(0, COINS_PER_COLOR - teammateOwn - otherOpponent);
	const ownNetMax = own + Math.max(0, COINS_PER_COLOR - teamNet);
	const legalOwnMax = Math.min(ownColorMax, ownNetMax);
	const legalOwnMin = Math.max(0, teamFines - teammateOwn);

	const opponentColorMax = Math.max(0, COINS_PER_COLOR - teammateOpponent - Math.max(otherOwn, otherFines));
	const legalOpponentMax = opponentColorMax;
	const legalOpponentMin = 0;

	return {
		ownMin: Math.min(legalOwnMin, own),
		ownMax: Math.max(legalOwnMax, own),
		opponentMin: Math.min(legalOpponentMin, opponent),
		opponentMax: Math.max(legalOpponentMax, opponent),
	};
};
