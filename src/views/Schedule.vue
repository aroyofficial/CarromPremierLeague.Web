<template>
	<div class="page-container schedule-page">
		<header class="page-heading">
			<div>
				<span class="page-eyebrow">Season</span>
				<h1 class="page-title">Schedule</h1>
				<p class="page-subtitle">Every strike, from the first league match to the final.</p>
			</div>
			<div class="page-filters">
				<el-select
					v-model="selectedSeason"
					placeholder="Select Season"
					size="large"
					:popper-options="dropdownPopperOptions"
					@change="fetchSchedule()"
				>
					<el-option v-for="item in seasons" :key="item.id" :label="item.name" :value="item.id" />
				</el-select>
			</div>
		</header>

		<div class="summary" aria-label="Schedule summary">
			<button type="button" class="summary-card" :class="{ 'is-on': filter === 'all' }" @click="filter = 'all'">
				<strong>{{ matches.length }}</strong>
				<span>Matches</span>
			</button>
			<button type="button" class="summary-card live" :class="{ 'is-on': filter === 'live' }" @click="filter = 'live'">
				<strong>{{ counts.live }}</strong>
				<span>Live</span>
			</button>
			<button type="button" class="summary-card" :class="{ 'is-on': filter === 'upcoming' }" @click="filter = 'upcoming'">
				<strong>{{ counts.upcoming }}</strong>
				<span>To play</span>
			</button>
			<button type="button" class="summary-card" :class="{ 'is-on': filter === 'played' }" @click="filter = 'played'">
				<strong>{{ counts.played }}</strong>
				<span>Played</span>
			</button>
		</div>

		<div v-loading="loading" element-loading-text="Loading..." class="schedule-body">
			<section v-for="group in groups" :key="group.date" class="day-group">
				<h2 class="day-label">{{ groupLabel(group.date) }}</h2>
				<div class="day-rail" aria-hidden="true">
					<span class="dow">{{ dateParts(group.date).dow }}</span>
					<span class="dom">{{ dateParts(group.date).dom }}</span>
					<span class="mon">{{ dateParts(group.date).mon }}</span>
				</div>
				<div class="day-list">
				<article
					v-for="(match, index) in group.items"
					:key="match.id"
					class="match"
					:class="matchClass(match)"
					:style="{ '--i': index }"
				>
					<div class="face">
						<div class="face-main">
						<div class="board">
							<div class="club" :class="[sideState(match, match.team1_id), favored(match, match.team1_id)]">
								<img :src="teamLogo(match.team1_id)" alt="" class="crest" />
								<div class="club-copy">
									<strong>{{ match.team1_name || "TBD" }}</strong>
									<em v-if="isPlayed(match) && match.winner_team_id === match.team1_id">Winner</em>
									<em v-if="showToss(match) && tossSide(match) === 'home'" class="toss-note">Won the toss</em>
								</div>
							</div>

							<div class="mid">
								<div v-if="isLive(match)" class="score live-score">
									<span class="live-btn live-btn-compact">
										<span class="live-dot"></span>
										Live
									</span>
									<span class="score-num">{{ scoreLine(match) }}</span>
								</div>
								<div v-else-if="isPlayed(match) && match.players.length" class="score">
									<span class="score-num">{{ scoreLine(match) }}</span>
									<span class="score-caption" :class="{ 'is-extra': finishInfo(match).extra }">{{ finishInfo(match).text }}</span>
								</div>
								<div v-else-if="isPlayed(match)" class="score">
									<span class="score-num">{{ centerMark(match) }}</span>
									<span class="score-caption" :class="{ 'is-extra': finishInfo(match).extra }">{{ match.duration == null ? centerCaption(match) : finishInfo(match).text }}</span>
								</div>
								<span v-else class="vs-mark">VS</span>
								<span v-if="isLive(match)" class="match-meta">
									<span class="clock-time" :class="{ 'is-extra': clockState(match).extra }">{{ clockState(match).time }}</span>
									<span v-if="clockState(match).extra" class="extra-label">Extra</span>
									<span class="match-label">Match {{ match.order }}</span>
								</span>
								<span v-else class="match-label">Match {{ match.order }}</span>
							</div>

							<div class="club club-away" :class="[sideState(match, match.team2_id), favored(match, match.team2_id)]">
								<div class="club-copy">
									<strong>{{ match.team2_name || "TBD" }}</strong>
									<em v-if="isPlayed(match) && match.winner_team_id === match.team2_id">Winner</em>
									<em v-if="showToss(match) && tossSide(match) === 'away'" class="toss-note">Won the toss</em>
								</div>
								<img :src="teamLogo(match.team2_id)" alt="" class="crest" />
							</div>
						</div>

						<div v-if="showChance(match)" class="chance-wrap">
							<p v-if="isLive(match)" class="chance-label">Win chance</p>
							<div class="chance">
								<span>{{ match.win_probability.team1_percent }}%</span>
								<div class="chance-track">
									<span class="chance-home" :style="{ width: `${match.win_probability.team1_percent}%` }"></span>
									<span class="chance-away" :style="{ width: `${match.win_probability.team2_percent}%` }"></span>
								</div>
								<span>{{ match.win_probability.team2_percent }}%</span>
							</div>
						</div>
						</div>
					</div>

					<div class="match-rule" aria-hidden="true"></div>
					<div class="match-actions">
						<button
							type="button"
							class="action"
							:class="{ 'is-on': openId === match.id }"
							:aria-expanded="openId === match.id"
							@click="toggleScorecard(match.id)"
						>
							{{ openId === match.id ? "Hide scorecard" : "Show scorecard" }}
						</button>
						<button type="button" class="action" @click="openStats(match)">Stats</button>
					</div>

					<div class="drawer-shell" :class="{ 'is-open': openId === match.id }">
					<div class="drawer-clip">
					<div class="drawer" :inert="openId !== match.id">
						<div v-if="match.golden_strike && isPlayed(match)" class="golden-banner">
							<span class="queen" aria-hidden="true"></span>
							<div>
								<strong>Golden Strike</strong>
								<p>{{ resultText(match) }}</p>
							</div>
						</div>

						<section v-if="showBoard(match)" class="scoreboard">
							<div class="tally">
								<div class="tally-row tally-names">
									<span></span>
									<span>{{ match.team1_name || "Team 1" }}</span>
									<span>{{ match.team2_name || "Team 2" }}</span>
								</div>
								<div class="tally-row tally-score">
									<span>Score</span>
									<strong>{{ teamScore(match, match.team1_id) }}</strong>
									<strong>{{ teamScore(match, match.team2_id) }}</strong>
								</div>
								<div
									v-for="row in teamRows(match)"
									:key="row.label"
									class="tally-row"
									:class="{ 'is-opponent': row.opponent }"
								>
									<span>{{ row.label }}</span>
									<strong>{{ row.home }}</strong>
									<strong>{{ row.away }}</strong>
								</div>
							</div>
						</section>

						<section v-if="showBoard(match)" class="panel players-panel">
							<div class="player-columns">
								<div v-for="side in boardSides(match)" :key="side.id" class="player-side">
									<h4>{{ side.name }}</h4>
									<article v-for="player in playersFor(match, side.id)" :key="player.player_id" class="player-card">
										<div class="player-name">
											<img
												:src="playerPhoto(player)"
												:alt="`${player.first_name} ${player.last_name}`"
												class="player-photo"
												@error="useLocalPhoto($event, player)"
											/>
											<strong>{{ player.first_name }} {{ player.last_name }}</strong>
										</div>
										<dl class="stat-lines">
											<div v-for="line in playerLines(player)" :key="line.label" :class="{ 'is-opponent': line.opponent }">
												<dt>{{ line.label }}</dt>
												<dd>{{ line.value }}</dd>
											</div>
										</dl>
									</article>
								</div>
							</div>
						</section>

						<div v-if="isScheduled(match) && match.win_probability" class="drawer-grid">
							<section class="panel">
								<h3>Win chance</h3>
								<p class="hint">Head-to-head and player stats from every season, plus the last 5 matches each side has played in this season.</p>
								<div class="chance-readout">
									<div>
										<strong>{{ match.win_probability.team1_percent }}%</strong>
										<span>{{ match.team1_name || "Team 1" }}</span>
									</div>
									<div class="chance-readout-right">
										<strong>{{ match.win_probability.team2_percent }}%</strong>
										<span>{{ match.team2_name || "Team 2" }}</span>
									</div>
								</div>
							</section>
						</div>

						<section v-if="(isPlayed(match) || isLive(match)) && match.rank_changes.length" class="panel">
							<h3>Points table after this match</h3>
							<p v-if="isLive(match)" class="hint">Follows the current score.</p>
							<div class="snapshot">
								<div class="snapshot-row snapshot-head">
									<span>#</span>
									<span>Team</span>
									<span>Move</span>
									<span>Pts</span>
									<span>Net</span>
								</div>
								<div
									v-for="row in match.rank_changes"
									:key="row.team_id"
									class="snapshot-row"
									:class="{ 'is-in': row.in_match, 'is-up': row.change > 0, 'is-down': row.change < 0 }"
								>
									<em>{{ row.rank }}</em>
									<strong>
										<img :src="teamLogo(row.team_id)" alt="" />
										{{ row.team_name || teamName(match, row.team_id) }}
									</strong>
									<span>{{ moveLabel(row) }}</span>
									<b>{{ row.points }}</b>
									<b>{{ netLabel(row) }}</b>
								</div>
							</div>
						</section>
					</div>
					</div>
					</div>
				</article>
				</div>
			</section>

			<div v-if="!loading && !groups.length" class="empty-state">
				{{ errorMessage || emptyLabel }}
			</div>
		</div>

		<el-dialog v-model="statsOpen" :title="statsTitle" width="min(560px, 92vw)" align-center append-to-body>
			<p v-if="statsMatch && !statsMatch.head_to_head.matches_played" class="history-note">
				{{ statsMatch.team1_name }} and {{ statsMatch.team2_name }} have not played each other before.
			</p>
			<div v-else-if="statsMatch" class="h2h">
				<div class="h2h-cell">
					<strong>{{ statsMatch.head_to_head.team1_wins }}</strong>
					<span>{{ statsMatch.team1_name }} wins</span>
					<em>{{ statsMatch.head_to_head.team1_coins }} coins pocketed</em>
				</div>
				<div class="h2h-cell h2h-draw">
					<strong>{{ statsMatch.head_to_head.draws }}</strong>
					<span>Draws</span>
					<em>{{ statsMatch.head_to_head.matches_played }} meetings</em>
				</div>
				<div class="h2h-cell">
					<strong>{{ statsMatch.head_to_head.team2_wins }}</strong>
					<span>{{ statsMatch.team2_name }} wins</span>
					<em>{{ statsMatch.head_to_head.team2_coins }} coins pocketed</em>
				</div>
			</div>
		</el-dialog>
	</div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import dayjs from "@/plugins/dayjs";
import { useSeasonStore } from "@/store/seasonStore";
import { useTeamStore } from "@/store/teamStore";
import { seasonService } from "@/services/seasonService";
import { MatchCategory, MatchStatus, TossOutcome } from "@/utils/constants";
import { resolveAsset } from "@/utils/common";

const seasonStore = useSeasonStore();
const teamStore = useTeamStore();
const selectedSeason = ref(null);
const seasons = ref([]);
const matches = ref([]);
const loading = ref(false);
const errorMessage = ref("");
const filter = ref("all");
const openId = ref(null);
let refreshTimer = null;
const statsOpen = ref(false);
const statsMatch = ref(null);
const statsTitle = computed(() => {
	if (!statsMatch.value) return "Stats";
	return `${statsMatch.value.team1_name} vs ${statsMatch.value.team2_name}`;
});
const dropdownPopperOptions = ref({
	placement: "bottom-start",
	modifiers: [{ name: "flip", enabled: false }],
});

const statusId = (name) => MatchStatus.find((status) => status.name === name)?.id;
const isLive = (match) => match.status === statusId("In Progress");
const isPlayed = (match) => match.status === statusId("Played");
const isScheduled = (match) => match.status === statusId("Scheduled");

const counts = computed(() => ({
	live: matches.value.filter(isLive).length,
	played: matches.value.filter(isPlayed).length,
	upcoming: matches.value.filter(isScheduled).length,
}));

const visibleMatches = computed(() => {
	if (filter.value === "live") return matches.value.filter(isLive);
	if (filter.value === "played") return matches.value.filter(isPlayed);
	if (filter.value === "upcoming") return matches.value.filter(isScheduled);
	return matches.value;
});

const groups = computed(() => {
	const grouped = [];
	for (const match of visibleMatches.value) {
		const date = match.scheduled_date || "unscheduled";
		const last = grouped[grouped.length - 1];
		if (!last || last.date !== date) grouped.push({ date, items: [match] });
		else last.items.push(match);
	}
	return grouped;
});

const emptyLabel = computed(() => {
	if (errorMessage.value) return errorMessage.value;
	if (filter.value === "live") return "No match is live right now.";
	if (filter.value === "played") return "No matches have been played in this season.";
	if (filter.value === "upcoming") return "Every match in this season has been played.";
	return "No matches have been scheduled for this season.";
});

const categoryName = (category) => MatchCategory.find((item) => item.id === category)?.name || "Match";

const dateParts = (value) => {
	const date = value ? dayjs(value) : null;
	if (!date?.isValid()) return { dow: "TBC", dom: "–", mon: "" };
	return { dow: date.format("ddd"), dom: date.format("D"), mon: date.format("MMM") };
};

const groupLabel = (value) => (value && value !== "unscheduled" ? dayjs(value).format("dddd, D MMMM YYYY") : "Date to be confirmed");

const teamLogo = (teamId) => {
	if (!teamId) return resolveAsset("public/assets/images/teams/tbd.png");
	return teamStore.teams.find((team) => team.id === teamId)?.logo_url || resolveAsset("public/assets/images/teams/tbd.png");
};

const playersFor = (match, teamId) => match.players.filter((player) => player.team_id === teamId);

const fineCoins = (player) => {
	const split = (player.single_fines || 0) + 2 * (player.double_fines || 0);
	return split || player.coins_fined || 0;
};

const tally = (match, teamId) =>
	playersFor(match, teamId).reduce(
		(sum, player) => {
			sum.coins += player.coins_pocketed || 0;
			sum.opponent += player.opponent_coins_pocketed || 0;
			sum.single += player.single_fines || 0;
			sum.double += player.double_fines || 0;
			sum.fines += fineCoins(player);
			sum.strikers += player.strikers_pocketed || 0;
			return sum;
		},
		{ coins: 0, opponent: 0, single: 0, double: 0, fines: 0, strikers: 0 },
	);

const teamScore = (match, teamId) => {
	const totals = tally(match, teamId);
	return totals.coins - totals.fines;
};

const teamRows = (match) => {
	const home = tally(match, match.team1_id);
	const away = tally(match, match.team2_id);
	return [
		{ label: "Own Coins Pocketed", home: home.coins, away: away.coins },
		{ label: "Opponent Coins Pocketed", home: home.opponent, away: away.opponent, opponent: true },
		{ label: "Single Fines (1 coin)", home: home.single, away: away.single },
		{ label: "Double Fines (2 coins)", home: home.double, away: away.double },
		{ label: "Strikers Pocketed", home: home.strikers, away: away.strikers },
	];
};

const playerLines = (player) => [
	{ label: "Own Coins Pocketed", value: player.coins_pocketed || 0 },
	{ label: "Opponent Coins Pocketed", value: player.opponent_coins_pocketed || 0, opponent: true },
	{ label: "Single Fines (1 coin)", value: player.single_fines || 0 },
	{ label: "Double Fines (2 coins)", value: player.double_fines || 0 },
	{ label: "Strikers Pocketed", value: player.strikers_pocketed || 0 },
];

const boardSides = (match) => [
	{ id: match.team1_id, name: match.team1_name || "Team 1", away: false },
	{ id: match.team2_id, name: match.team2_name || "Team 2", away: true },
];

const showBoard = (match) => (isLive(match) || isPlayed(match)) && match.players.length > 0;

const scoreLine = (match) => `${teamScore(match, match.team1_id)} – ${teamScore(match, match.team2_id)}`;

const REGULATION_MS = 15 * 60 * 1000;
const EXTRA_MS = 5 * 60 * 1000;
const now = ref(Date.now());

const tossSide = (match) => {
	if (match.toss_outcome === TossOutcome.Team1Won) return "home";
	if (match.toss_outcome === TossOutcome.Team2Won) return "away";
	return "";
};

const showToss = (match) => (isLive(match) || isPlayed(match)) && tossSide(match) !== "";

const showChance = (match) => (isScheduled(match) || isLive(match)) && match.win_probability;

const REGULATION_SECONDS = 15 * 60;
const EXTRA_SECONDS = 5 * 60;

const finishInfo = (match) => {
	if (match.duration == null) return { text: "Final score", extra: false };
	const extraPlayed = match.extra || 0;
	if (extraPlayed > 0) {
		const left = Math.max(0, EXTRA_SECONDS - extraPlayed);
		if (left === 0) return { text: "Full extra time", extra: true };
		return { text: `${formatClock(left)} left in extra`, extra: true };
	}
	const left = Math.max(0, REGULATION_SECONDS - match.duration);
	if (left === 0) return { text: "Full 15:00", extra: false };
	return { text: `${formatClock(left)} left`, extra: false };
};

const formatClock = (totalSeconds) => {
	const remaining = Math.max(0, totalSeconds);
	const minutes = Math.floor(remaining / 60).toString().padStart(2, "0");
	const seconds = (remaining % 60).toString().padStart(2, "0");
	return `${minutes}:${seconds}`;
};

const isKnockout = (match) => {
	const name = categoryName(match.category);
	return name === "Final" || name === "Eliminator";
};

const clockState = (match) => {
	const start = match.started_at ? dayjs(match.started_at).valueOf() : now.value;
	const regulationLeft = Math.max(0, Math.ceil((start + REGULATION_MS - now.value) / 1000));
	if (isKnockout(match) && regulationLeft === 0 && match.extra_started_at) {
		const extraStart = dayjs(match.extra_started_at).valueOf();
		const extraLeft = Math.max(0, Math.ceil((extraStart + EXTRA_MS - now.value) / 1000));
		return { time: formatClock(extraLeft), extra: true };
	}
	return { time: formatClock(regulationLeft), extra: false };
};

const localPhoto = (player) => {
	const slug = `${player.first_name || ""}-${player.last_name || ""}`.toLowerCase().trim().replace(/\s+/g, "-");
	return resolveAsset(`public/assets/images/players/${slug}.png`);
};

const playerPhoto = (player) => player.avatar_url || localPhoto(player);

const useLocalPhoto = (event, player) => {
	const fallback = localPhoto(player);
	if (event.target.src !== fallback) event.target.src = fallback;
};

const teamName = (match, teamId) => {
	if (teamId === match.team1_id) return match.team1_name;
	if (teamId === match.team2_id) return match.team2_name;
	return "Team";
};

const sideState = (match, teamId) => {
	if (!isPlayed(match) || !teamId || !match.winner_team_id) return "";
	return match.winner_team_id === teamId ? "is-winner" : "is-loser";
};

const favored = (match, teamId) => {
	if (!isScheduled(match) || !match.win_probability || !teamId) return "";
	const home = match.win_probability.team1_percent;
	const away = match.win_probability.team2_percent;
	if (home === away) return "";
	const leader = home > away ? match.team1_id : match.team2_id;
	return leader === teamId ? "is-favored" : "";
};

const matchClass = (match) => ({
	"is-live": isLive(match),
	"is-open": openId.value === match.id,
	"is-final": categoryName(match.category) === "Final",
	"is-golden": categoryName(match.category) === "Golden Strike" || match.golden_strike,
});

const resultText = (match) => {
	if (!match.winner_team_id) return "The match finished level.";
	const winner = teamName(match, match.winner_team_id);
	if (match.golden_strike) return `${winner} took it on the Golden Strike.`;
	if (match.net_points != null) return `${winner} won by ${match.net_points} coins.`;
	return `${winner} won.`;
};

const centerMark = (match) => {
	if (!match.winner_team_id) return "TIE";
	if (match.golden_strike) return "GS";
	return match.net_points ?? "–";
};

const centerCaption = (match) => {
	if (!match.winner_team_id) return "level";
	if (match.golden_strike) return "golden strike";
	return "net coins";
};

const headToHeadCaption = (match) =>
	isPlayed(match)
		? "Wins and coins pocketed against each other, including this match."
		: "Wins and coins pocketed against each other before this match.";

const moveLabel = (row) => {
	if (row.previous_rank == null) return `→ #${row.rank}`;
	if (row.previous_rank === row.rank) return "Stayed";
	return `#${row.previous_rank} → #${row.rank}`;
};

const netLabel = (row) => {
	const net = row.net || 0;
	return net > 0 ? `+${net}` : `${net}`;
};

const toggleScorecard = (id) => {
	openId.value = openId.value === id ? null : id;
};

const openStats = (match) => {
	statsMatch.value = match;
	statsOpen.value = true;
};

const fetchSchedule = async (options) => {
	const quiet = Boolean(options && options.quiet);
	if (!selectedSeason.value) {
		matches.value = [];
		openId.value = null;
		return;
	}
	if (!quiet) {
		loading.value = true;
		errorMessage.value = "";
	}
	try {
		seasonStore.setSeason(selectedSeason.value);
		const response = await seasonService.getSchedule(selectedSeason.value);
		const nextMatches = response.data?.matches || [];
		matches.value = nextMatches;
		if (statsMatch.value) {
			statsMatch.value = nextMatches.find((match) => match.id === statsMatch.value.id) || null;
			if (!statsMatch.value) statsOpen.value = false;
		}
		if (!quiet) openId.value = null;
	} catch (error) {
		console.error("Failed to load schedule", error);
		if (!quiet) {
			matches.value = [];
			openId.value = null;
			errorMessage.value = "Unable to load the schedule right now. Please try again.";
		}
	} finally {
		if (!quiet) loading.value = false;
	}
};

onMounted(() => {
	seasons.value = seasonStore.visibleSeasons;
	selectedSeason.value = seasonStore.selectedSeason;
	fetchSchedule();
	refreshTimer = setInterval(() => fetchSchedule({ quiet: true }), 5000);
});

const clockTimer = setInterval(() => {
	now.value = Date.now();
}, 1000);

onUnmounted(() => {
	clearInterval(clockTimer);
	clearInterval(refreshTimer);
});
</script>

<style lang="scss" scoped>
.schedule-page {
	max-width: 1080px;
}

.summary {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 12px;
	margin-bottom: 22px;
}

.summary-card {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 2px;
	min-height: 88px;
	padding: 14px 16px;
	border: 1px solid var(--cpl-line);
	border-radius: 16px;
	background: #fff;
	box-shadow: var(--cpl-shadow-card);
	cursor: pointer;
	text-align: center;

	strong {
		font-family: var(--cpl-font-display);
		font-size: 28px;
		line-height: 1;
		color: var(--cpl-navy-900);
	}

	span {
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--cpl-ink-400);
	}

	&.is-on {
		border-color: var(--cpl-navy-800);
		background: var(--cpl-navy-900);
		strong,
		span {
			color: #fff;
		}
	}

	&.live strong {
		color: var(--cpl-red-500);
	}

	&.live.is-on strong {
		color: #fecaca;
	}
}

.schedule-body {
	min-height: 240px;
}

.day-group {
	position: relative;
	display: grid;
	grid-template-columns: 84px minmax(0, 1fr);
	gap: 0 16px;
	margin-bottom: 28px;
}

.day-label {
	grid-column: 1 / -1;
	margin: 4px 0 12px;
	font-size: 13px;
	font-weight: 700;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--cpl-wood-500);
}

@media (min-width: 768px) {
	.day-label {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
	}
}

.day-rail {
	align-self: stretch;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-start;
	padding-top: 22px;
	border-radius: 22px;
	background:
		radial-gradient(circle at 50% 12%, rgba(245, 184, 46, 0.32), transparent 36%),
		linear-gradient(180deg, #18284a, var(--cpl-navy-900) 22%);
	color: #fff;
	box-shadow: var(--cpl-shadow-card);

	.dow,
	.mon {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--cpl-gold-400);
	}

	.dom {
		font-family: var(--cpl-font-display);
		font-size: 34px;
		line-height: 1;
	}
}

.day-list {
	min-width: 0;
}

.match {
	margin-bottom: 12px;
	border-radius: 20px;
	background: #fffdf8;
	border: 1px solid #eadfce;
	box-shadow: var(--cpl-shadow-card);
	overflow: hidden;
	animation: rise 0.45s ease both;
	animation-delay: calc(var(--i) * 40ms);
	transition: transform 0.18s ease, box-shadow 0.18s ease;

	&:hover {
		transform: translateY(-2px);
		box-shadow: 0 16px 34px rgba(15, 23, 42, 0.1);
	}

	&.is-open {
		border-color: #e7c56a;
		box-shadow: 0 16px 36px rgba(146, 96, 10, 0.12);
	}

	&.is-final {
		border-color: #e7c56a;
	}

	&.is-live {
		border-color: #fecaca;
		box-shadow: 0 0 0 4px rgba(230, 57, 70, 0.08), var(--cpl-shadow-card);
	}
}

.face {
	padding: 16px 16px 8px;

}

.board {
	display: grid;
	grid-template-columns: minmax(0, 1fr) 156px minmax(0, 1fr);
	gap: 8px;
	align-items: center;
	padding: 10px 6px;
}

.club {
	display: flex;
	align-items: center;
	gap: 12px;
	min-width: 0;

	strong {
		display: block;
		font-size: 16px;
		line-height: 1.2;
		color: var(--cpl-ink-900);
	}

	em {
		display: block;
		margin-top: 3px;
		font-family: "Poppins", sans-serif;
		font-style: normal;
		font-size: 12px;
		font-weight: 600;
		line-height: 1.25;
		letter-spacing: 0;
		color: var(--cpl-ink-600);
	}

	&.is-winner strong {
		color: #92600a;
	}

	&.is-winner em {
		color: #92600a;
	}

	em.toss-note {
		color: var(--cpl-ink-600);
	}

	&.is-favored .crest {
		box-shadow: 0 0 0 3px #fffdf8, 0 0 0 5px var(--cpl-gold-500);
	}

	&.is-favored strong {
		color: #92600a;
	}
}

.club-away {
	justify-content: flex-end;
	text-align: right;
}

.crest {
	width: 54px;
	height: 54px;
	flex: 0 0 54px;
	border-radius: 50%;
	object-fit: cover;
	background: var(--cpl-surface-muted);
	box-shadow: 0 0 0 3px #fff, 0 0 0 4px var(--cpl-line);
}

.is-winner .crest {
	box-shadow: 0 0 0 3px #fff, 0 0 0 5px var(--cpl-gold-500);
}

.mid {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 16px;
	min-width: 0;
	padding: 6px 0 2px;
}

.live-score,
.score {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 16px;
	width: 100%;
}

.live-score {
	gap: 26px;
}

.match-label {
	font-size: 12px;
	font-weight: 700;
	letter-spacing: 0.14em;
	text-transform: uppercase;
	color: var(--cpl-ink-400);
}

.match-meta {
	display: flex;
	align-items: baseline;
	justify-content: center;
	gap: 8px;
}

.clock-time {
	font-variant-numeric: tabular-nums;
	font-size: 14px;
	font-weight: 800;
	letter-spacing: 0.04em;
	line-height: 1;
	color: var(--cpl-navy-800);

	&.is-extra {
		color: #92600a;
	}
}

.extra-label {
	font-size: 11px;
	font-weight: 800;
	letter-spacing: 0.12em;
	text-transform: uppercase;
	color: #92600a;
}

.match-rule {
	height: 1px;
	margin: 10px 22px 0;
	background: #eadfce;
}

.match-actions {
	display: flex;
	justify-content: flex-start;
	align-items: center;
	flex-wrap: wrap;
	gap: 8px;
	padding: 12px 22px 16px;
}

.action {
	min-height: 30px;
	padding: 0 12px;
	border: 1px solid #eadfce;
	border-radius: 999px;
	background: #fff;
	color: var(--cpl-navy-900);
	font-size: 12px;
	font-weight: 700;
	letter-spacing: 0.01em;
	cursor: pointer;

	&.is-on {
		border-color: var(--cpl-navy-900);
		background: var(--cpl-navy-900);
		color: #fff;
	}

	&:focus-visible {
		outline: 2px solid var(--cpl-gold-500);
		outline-offset: 2px;
	}
}

.vs-mark,
.score-num {
	font-family: var(--cpl-font-display);
	font-weight: 800;
	letter-spacing: 0.06em;
}

.vs-mark {
	display: grid;
	place-items: center;
	width: 46px;
	height: 46px;
	border-radius: 50%;
	background: var(--cpl-gold-100);
	color: #92600a;
	font-size: 13px;
}

.score-num {
	font-size: 30px;
	line-height: 1;
	color: var(--cpl-navy-900);
}

.score-caption.is-extra {
	color: #92600a;
}

.score-caption,
.chip {
	font-size: 11px;
	font-weight: 700;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--cpl-ink-400);
}

.live-btn.live-btn-compact {
	gap: 4px;
	padding: 2px 8px;
	font-size: 9px;
	letter-spacing: 0.1em;
	box-shadow: none;

	.live-dot {
		width: 5px;
		height: 5px;
	}
}

.live-score .score-num {
	font-size: 28px;
	white-space: nowrap;
}

.scoreboard {
	margin-bottom: 12px;
	padding: 16px 18px 14px;
	border-radius: 16px;
	background: var(--cpl-navy-900);
	color: #fff;
}

.tally {
	display: grid;
	gap: 0;
}

.tally-row {
	display: grid;
	grid-template-columns: minmax(196px, 1.45fr) minmax(0, 1fr) minmax(0, 1fr);
	gap: 8px;
	align-items: center;
	padding: 7px 0;
	border-top: 1px solid rgba(255, 255, 255, 0.08);

	span {
		color: rgba(255, 255, 255, 0.72);
		font-size: 13px;
		font-weight: 600;
	}

	strong {
		font-variant-numeric: tabular-nums;
		font-size: 15px;
		font-weight: 800;
		text-align: center;
	}

	&.is-opponent span,
	&.is-opponent strong {
		color: #f5d78a;
	}
}

.tally-names {
	border-top: 0;
	padding-bottom: 8px;

	span {
		color: #fff;
		font-size: 14px;
		font-weight: 800;
		text-align: center;
		line-height: 1.25;
	}

	span:first-child {
		text-align: left;
	}
}

.tally-score {
	border-top: 0;
	padding-top: 0;
	padding-bottom: 10px;

	span {
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--cpl-gold-400);
	}

	strong {
		font-family: var(--cpl-font-display);
		font-size: 40px;
		line-height: 1;
		text-align: center;
	}
}

.score-note {
	margin: 8px 0 0;
	color: rgba(255, 255, 255, 0.62);
	font-size: 12px;
	line-height: 1.4;
}

.history-note,
.history-panel {
	margin-top: 12px;
}

.history-note {
	margin-bottom: 0;
	color: var(--cpl-ink-600);
	font-size: 13px;
}

.player-card {
	flex: 1;
	padding: 12px;
	border-radius: 14px;
	background: var(--cpl-surface-muted);
}

.player-photo {
	width: 46px;
	height: 46px;
	flex: 0 0 46px;
	border-radius: 50%;
	object-fit: cover;
	background: #fff;
	box-shadow: 0 0 0 2px #fff, 0 0 0 3px var(--cpl-line);
}

.player-name {
	display: flex;
	align-items: center;
	gap: 10px;

	strong {
		font-size: 14px;
		letter-spacing: 0;
		text-transform: none;
		color: var(--cpl-ink-900);
	}
}

.stat-lines {
	display: grid;
	gap: 4px;
	margin: 10px 0 0;

	div {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 3ch;
		align-items: baseline;
		column-gap: 16px;
		font-size: 13px;
	}

	dt {
		color: var(--cpl-ink-600);
		font-weight: 600;
	}

	dd {
		margin: 0;
		padding: 0;
		justify-self: stretch;
		text-align: right;
		font-variant-numeric: tabular-nums;
		font-weight: 800;
		color: var(--cpl-navy-900);
	}

	.is-opponent dt,
	.is-opponent dd {
		color: #92600a;
	}
}

.live-btn {
	position: relative;
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 8px 14px;
	border-radius: 999px;
	background: var(--cpl-red-500);
	color: #fff;
	font-size: 12px;
	font-weight: 800;
	letter-spacing: 0.14em;
	text-transform: uppercase;
	box-shadow: 0 8px 18px rgba(230, 57, 70, 0.35);

	&::before,
	&::after {
		content: "";
		position: absolute;
		inset: -4px;
		border-radius: inherit;
		border: 2px solid rgba(230, 57, 70, 0.7);
		animation: ripple 1.7s ease-out infinite;
	}

	&::after {
		animation-delay: 0.55s;
	}
}

.live-dot {
	width: 7px;
	height: 7px;
	border-radius: 50%;
	background: #fff;
	box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7);
	animation: blink 1.2s ease-in-out infinite;
}

.drawer-shell {
	display: grid;
	grid-template-rows: 0fr;
	transition: grid-template-rows 0.32s ease;
}

.drawer-shell.is-open {
	grid-template-rows: 1fr;
}

.drawer-clip {
	overflow: hidden;
}

.chance-wrap {
	margin: 2px 4px 8px;
}

.chance-label {
	margin: 0 0 6px;
	text-align: center;
	font-size: 11px;
	font-weight: 700;
	letter-spacing: 0.12em;
	text-transform: uppercase;
	color: var(--cpl-ink-400);
}

.chance {
	display: grid;
	grid-template-columns: 42px minmax(0, 1fr) 42px;
	align-items: center;
	gap: 8px;
	margin: 0;
	font-size: 12px;
	font-weight: 800;
	font-variant-numeric: tabular-nums;
	color: var(--cpl-navy-800);

	span:first-child {
		color: var(--cpl-navy-800);
	}

	span:last-child {
		text-align: right;
		color: #92600a;
	}
}

.chance-track {
	display: flex;
	height: 8px;
	border-radius: 999px;
	overflow: hidden;
	background: #e7edf6;
	box-shadow: inset 0 0 0 1px rgba(17, 31, 58, 0.06);

	span {
		display: block;
		height: 100%;
	}
}

.chance-home {
	background: var(--cpl-navy-800);
}

.chance-away {
	background: linear-gradient(90deg, #e2aa22, var(--cpl-gold-500));
}

.drawer {
	padding: 4px 16px 16px;
	background: linear-gradient(#fffdf8, #f8f4ec);
	opacity: 0;
	transform: translateY(-6px);
	transition: opacity 0.28s ease, transform 0.28s ease;
}

.drawer-shell.is-open .drawer {
	opacity: 1;
	transform: none;
}

.golden-banner {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 12px;
	padding: 12px 14px;
	border-radius: 14px;
	background: linear-gradient(90deg, #fff8d6, #fff);
	border: 1px solid #f3e2a4;

	strong {
		display: block;
		color: #92600a;
	}

	p {
		margin: 2px 0 0;
		color: var(--cpl-ink-600);
		font-size: 13px;
	}
}

.queen {
	width: 28px;
	height: 28px;
	border-radius: 50%;
	background: radial-gradient(circle at 35% 35%, #ff7a85, var(--cpl-red-500));
	box-shadow: 0 0 0 4px rgba(230, 57, 70, 0.15);
}

.drawer-grid {
	display: grid;
	grid-template-columns: 1fr 1.2fr;
	gap: 12px;

	&:has(> :only-child) {
		grid-template-columns: 1fr;
	}
}

.panel {
	padding: 14px;
	border-radius: 16px;
	background: #fff;
	border: 1px solid var(--cpl-line);

	h3,
	h4 {
		margin: 0 0 8px;
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--cpl-ink-400);
	}
}

.hint {
	margin: 0 0 10px;
	color: var(--cpl-ink-600);
	font-size: 13px;
}

.chance-readout,
.coin-split,
.mini-stats,
.h2h {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
}

.chance-readout strong,
.coin-split strong,
.h2h strong {
	display: block;
	font-family: var(--cpl-font-display);
	font-size: 26px;
	line-height: 1;
	color: var(--cpl-navy-900);
}

.chance-readout span,
.coin-split span,
.h2h span,
.h2h em {
	display: block;
	color: var(--cpl-ink-600);
	font-size: 12px;
	font-style: normal;
}

.chance-readout-right,
.split-right,
.h2h-cell:last-child {
	text-align: right;
}

.split-track {
	flex: 1;
	height: 10px;
	border-radius: 999px;
	background: #e8eef8;
	overflow: hidden;

	span {
		display: block;
		height: 100%;
		background: linear-gradient(90deg, var(--cpl-navy-800), var(--cpl-gold-500));
	}
}

.mini-stats {
	margin-top: 8px;
	font-size: 12px;
	color: var(--cpl-ink-600);
}

.h2h-cell {
	flex: 1;
	padding: 8px;
	border-radius: 12px;
	background: var(--cpl-surface-muted);
}

.h2h-draw {
	text-align: center;
	background: var(--cpl-gold-100);
}

.players-panel,
.players-panel + .panel {
	margin-top: 12px;
}

.player-columns {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 14px;
	align-items: stretch;
}

.player-side {
	display: flex;
	flex-direction: column;
	gap: 10px;
	min-width: 0;
}

.player {
	display: flex;
	gap: 10px;
	align-items: center;
	padding: 8px 0;
}

.avatar {
	display: grid;
	place-items: center;
	width: 36px;
	height: 36px;
	flex: 0 0 36px;
	border-radius: 50%;
	background: var(--cpl-navy-900);
	color: var(--cpl-gold-400);
	font-size: 12px;
	font-weight: 800;
}

.avatar-away {
	background: #92600a;
	color: #fff;
}

.pills {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	margin-top: 4px;

	span {
		padding: 2px 7px;
		border-radius: 999px;
		background: var(--cpl-surface-muted);
		color: var(--cpl-ink-600);
		font-size: 11px;
	}

	b {
		color: var(--cpl-ink-900);
	}
}

.snapshot {
	display: grid;
	gap: 4px;
}

.snapshot-row {
	display: grid;
	grid-template-columns: 28px minmax(0, 1fr) auto 36px 42px;
	gap: 8px;
	align-items: center;
	padding: 8px 8px;
	border-radius: 12px;

	em,
	b,
	span {
		font-family: "Poppins", sans-serif;
		font-style: normal;
		font-variant-numeric: tabular-nums;
	}

	em {
		font-size: 14px;
		font-weight: 800;
		color: var(--cpl-navy-900);
	}

	strong {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
		font-size: 13px;
		font-weight: 700;
	}

	img {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		object-fit: cover;
		flex: 0 0 28px;
	}

	span,
	b {
		font-size: 12px;
		font-weight: 700;
		color: var(--cpl-ink-600);
	}

	b {
		text-align: right;
	}

	&.is-in {
		background: #fff6dc;
	}

	&.is-up span {
		color: #15803d;
	}

	&.is-down span {
		color: #b91c1c;
	}
}

.snapshot-head {
	padding-bottom: 2px;

	span {
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--cpl-ink-400);
	}
}

.empty-state {
	min-height: 220px;
	display: grid;
	place-items: center;
	text-align: center;
	color: var(--cpl-ink-600);
	background: #fff;
	border: 1px solid var(--cpl-line);
	border-radius: 22px;
}

@media (max-width: 1023.98px) {
	.tally-score strong {
		font-size: 34px;
	}

	.schedule-page {
		max-width: none;
	}
}

@media (max-width: 767.98px) {
	.summary {
		grid-template-columns: 1fr 1fr;
	}

	.drawer-grid,
	.player-columns {
		grid-template-columns: 1fr;
	}

	.snapshot-row {
		grid-template-columns: 22px minmax(0, 1fr) auto 28px 32px;
		gap: 6px;
		padding: 8px 4px;

		strong {
			font-size: 12px;
		}

		img {
			width: 22px;
			height: 22px;
			flex-basis: 22px;
		}
	}

	.day-group {
		grid-template-columns: 1fr;
	}

	.day-rail {
		display: none;
	}

	.face {
		padding: 14px 12px 6px;
	}

	.match-rule {
		margin-right: 16px;
		margin-left: 16px;
	}

	.match-actions {
		justify-content: flex-start;
		padding: 12px 16px 14px;
	}

	.action {
		flex: 0 0 auto;
	}

	.board {
		grid-template-columns: 1fr 1fr;
		grid-template-areas:
			"mid mid"
			"home away";
		justify-items: center;
		text-align: center;
		gap: 12px 8px;
	}

	.board > .club:first-child {
		grid-area: home;
	}

	.board > .mid {
		grid-area: mid;
	}

	.board > .club-away {
		grid-area: away;
	}

	.club,
	.club-away {
		flex-direction: column;
		justify-content: flex-start;
		align-items: center;
		text-align: center;
	}

	.club-away .crest {
		order: -1;
	}

	.drawer {
		padding: 4px 12px 14px;
	}

	.club strong {
		font-size: 14px;
	}

	.tally-row {
		grid-template-columns: minmax(148px, 1.5fr) minmax(0, 1fr) minmax(0, 1fr);
		gap: 6px;
	}

	.tally-names span,
	.tally-row span {
		font-size: 12px;
	}

	.scoreboard {
		padding: 14px 12px 12px;
	}
}

@media (max-width: 479.98px) {
	.summary-card {
		min-height: 76px;
		padding: 12px 10px;
	}

	.summary-card strong {
		font-size: 24px;
	}

	.crest {
		width: 46px;
		height: 46px;
		flex-basis: 46px;
	}

	.tally-score strong {
		font-size: 30px;
	}

	.player-name strong {
		font-size: 13px;
	}
}

@media (prefers-reduced-motion: reduce) {
	.drawer-shell,
	.drawer,
	.match {
		transition: none;
		animation: none;
	}
}

@keyframes ripple {
	from {
		transform: scale(0.92);
		opacity: 0.7;
	}
	to {
		transform: scale(1.45);
		opacity: 0;
	}
}

@keyframes blink {
	0%,
	100% { opacity: 1; }
	50% { opacity: 0.35; }
}

@keyframes rise {
	from {
		opacity: 0;
		transform: translateY(10px);
	}
	to {
		opacity: 1;
		transform: none;
	}
}
</style>
