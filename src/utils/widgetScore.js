import { MatchCategory, MatchOutcome, MatchStatus, TossOutcome } from "./constants.js";

// Mirrors the scoring the public schedule uses, so a widget shows the same numbers as the site.
export const COINS_PER_COLOR = 9;

const statusId = (name) => MatchStatus.find((status) => status.name === name)?.id;

export const fineCoins = (player) => {
	const split = (player.single_fines || 0) + 2 * (player.double_fines || 0);
	return split || player.coins_fined || 0;
};

export const tallyTeam = (players = []) =>
	players.reduce(
		(sum, player) => {
			sum.coins += player.coins_pocketed || 0;
			sum.opponent += player.opponent_coins_pocketed || 0;
			sum.fines += fineCoins(player);
			sum.strikers += player.strikers_pocketed || 0;
			return sum;
		},
		{ coins: 0, opponent: 0, fines: 0, strikers: 0 },
	);

// Own coins of this colour count less any fine owed; coins the other side pocketed count for this side.
export const teamScore = (own, other) => Math.max(0, own.coins - own.fines) + (other.opponent || 0);

export const scorecardTotals = (players = {}) => {
	const home = tallyTeam(players.team1 || []);
	const away = tallyTeam(players.team2 || []);
	return { team1: teamScore(home, away), team2: teamScore(away, home) };
};

export const isLive = (match) => match?.status === statusId("In Progress");
export const isPlayed = (match) => match?.status === statusId("Played");
export const hasToss = (match) =>
	match?.toss_outcome === TossOutcome.Team1Won || match?.toss_outcome === TossOutcome.Team2Won;
export const isReady = (match) => match?.status === statusId("Scheduled") && Boolean(match?.ready_at);

/** Exact stage in the matchday workflow: scheduled -> ready -> toss_done -> live -> played. */
export const matchStage = (match) => {
	if (isPlayed(match)) return "played";
	if (isLive(match)) return "live";
	if (match?.status === statusId("Scheduled") && hasToss(match)) return "toss_done";
	if (isReady(match)) return "ready";
	return "scheduled";
};

export const MATCH_STAGE_META = Object.freeze({
	scheduled: { label: "Scheduled", tag: "info" },
	ready: { label: "Ready", tag: "primary" },
	toss_done: { label: "Toss done", tag: "warning" },
	live: { label: "In Progress", tag: "danger" },
	played: { label: "Played", tag: "success" },
});

export const statusLabel = (match) => {
	if (isLive(match)) return "Live";
	if (isPlayed(match)) return "Final";
	if (isReady(match) || hasToss(match)) return "Ready";
	return "Upcoming";
};

export const categoryName = (category) => MatchCategory.find((item) => item.id === category)?.name || "Match";

export const matchLabel = (match) => {
	const name = categoryName(match?.category);
	const num = match?.order ?? match?.match_order;
	if (num == null) return name;
	return name === "League" ? `Match ${num}` : `${name} · Match ${num}`;
};

export const matchFormatLabel = (category, clock = {}) => {
	const reg = Number(clock?.regulation_minutes || 15);
	const extra = Number(clock?.extra_minutes || 5);
	if (category === 7) return "Golden Strike · Sudden Death";
	if (category === 1) return `${reg} min Regulation`;
	return `${reg} min + ${extra} min Extra Time`;
};

export const teamInitials = (name) => {
	const cleaned = String(name || "").trim();
	if (!cleaned || cleaned.toUpperCase() === "TBD") return "TB";
	const parts = cleaned.split(/\s+/).filter(Boolean);
	if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
	return cleaned.slice(0, 2).toUpperCase();
};

export const coinPips = (score, total = COINS_PER_COLOR) => {
	const filled = Math.max(0, Math.min(total, Number(score) || 0));
	return Array.from({ length: total }, (_, idx) => idx < filled);
};

export const winnerTeam = (match) => {
	if (match?.outcome === MatchOutcome.Team1Won) return match.team1;
	if (match?.outcome === MatchOutcome.Team2Won) return match.team2;
	return null;
};

export const resultLine = (match) => {
	const winner = winnerTeam(match);
	if (!winner) return isPlayed(match) ? "Result pending" : "";
	if (match.golden_strike) return `${winner.name} won via Golden Strike`;
	if (match.net_points != null) return `${winner.name} won by ${match.net_points} coins`;
	return `${winner.name} won`;
};

export const tossWinnerSide = (match) => {
	if (match?.toss_outcome === TossOutcome.Team1Won) return "team1";
	if (match?.toss_outcome === TossOutcome.Team2Won) return "team2";
	return null;
};

export const tossLine = (match) => {
	if (match?.toss_outcome === TossOutcome.Team1Won && match.team1) return `${match.team1.name} won the toss`;
	if (match?.toss_outcome === TossOutcome.Team2Won && match.team2) return `${match.team2.name} won the toss`;
	return "Toss not decided yet";
};

// A window of fixtures around the first match that is not finished yet, so the widget always shows what is next.
export const fixtureWindow = (matches = [], size = 10) => {
	if (matches.length <= size) return matches;
	const firstOpen = matches.findIndex((match) => !isPlayed(match));
	const anchor = firstOpen === -1 ? matches.length - 1 : firstOpen;
	const start = Math.min(Math.max(0, anchor - 3), matches.length - size);
	return matches.slice(start, start + size);
};
