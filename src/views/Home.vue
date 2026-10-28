<template>
	<div class="home">
		<section class="hero" aria-labelledby="hero-title">
			<div class="hero-bg" aria-hidden="true">
				<div class="board">
					<span class="pocket p1"></span>
					<span class="pocket p2"></span>
					<span class="pocket p3"></span>
					<span class="pocket p4"></span>
					<span class="board-circle"></span>
				</div>
				<span
					v-for="coin in floatingCoins"
					:key="coin.id"
					class="coin"
					:class="coin.tone"
					:style="coin.style"
				></span>
			</div>

			<div class="hero-content">
				<span class="hero-eyebrow">
					<span class="eyebrow-dot"></span>
					{{ heroEyebrow }}
				</span>
				<h1 id="hero-title" class="hero-title">
					<span class="shimmer">{{ heroTitle }}</span>
				</h1>
				<p class="hero-subtitle">{{ heroSubtitle }}</p>

				<div v-if="loading" class="countdown-skeleton" aria-hidden="true">
					<span v-for="n in 4" :key="n"></span>
				</div>
				<SeasonCountdown
					v-else-if="countdownTarget"
					:target="countdownTarget"
					@finished="onCountdownFinished"
				/>

				<div class="hero-ctas">
					<router-link :to="Routes.TEAMS" class="cta cta-primary">Meet the Teams</router-link>
					<router-link :to="Routes.RULES" class="cta cta-ghost">Read the Rules</router-link>
				</div>
			</div>
			<div class="hero-wave" aria-hidden="true"></div>
		</section>

		<section class="page-container champions" aria-labelledby="champions-title">
			<div class="section-head">
				<span class="page-eyebrow">Defending Champions</span>
				<h2 id="champions-title" class="page-title">
					{{ lastSeason ? `${lastSeason.name} Champions` : "Champions" }}
				</h2>
			</div>

			<div v-if="loading" class="champion-card skeleton-card" aria-busy="true"></div>

			<div v-else-if="champion" class="champion-card">
				<div class="confetti" aria-hidden="true">
					<span v-for="n in 18" :key="n" :style="{ '--n': n }"></span>
				</div>

				<div class="champion-identity">
					<div class="trophy" aria-hidden="true">&#127942;</div>
					<div class="logo-ring">
						<img :src="champion.team.logo_url" :alt="`${champion.team.name} logo`" />
					</div>
					<h3 class="champion-name">{{ champion.team.name }}</h3>
					<p v-if="champion.team.slogan" class="champion-slogan">“{{ champion.team.slogan }}”</p>
					<p v-if="champion.finalOpponent" class="final-note">
						Beat <strong>{{ champion.finalOpponent.name }}</strong> in the Final
					</p>
				</div>

				<div class="champion-details">
					<div v-if="champion.standing" class="record">
						<div v-for="stat in championStats" :key="stat.label" class="record-item">
							<span class="record-value">{{ stat.value }}</span>
							<span class="record-label">{{ stat.label }}</span>
						</div>
					</div>

					<h4 class="squad-title">Championship Squad</h4>
					<ul v-if="champion.players.length" class="squad">
						<li v-for="(player, index) in champion.players" :key="player.player_id" :style="{ '--i': index }">
							<img
								:src="player.avatar_url"
								:alt="`${player.first_name} ${player.last_name}`"
								@error="onAvatarError"
							/>
							<span>{{ player.first_name }} {{ player.last_name }}</span>
						</li>
					</ul>
					<p v-else class="muted">Squad details are not available.</p>
				</div>
			</div>

			<div v-else class="empty-card">
				<p>{{ loadError || (lastSeason ? `Data is not available for ${lastSeason.name}.` : "No completed season yet. The first champions will be crowned soon!") }}</p>
			</div>

			<div v-if="pastChampions.length" class="hall">
				<h3 class="hall-title">Hall of Champions</h3>
				<ul class="hall-list">
					<li v-for="entry in pastChampions" :key="entry.season.id">
						<img :src="entry.team.logo_url" :alt="`${entry.team.name} logo`" />
						<div>
							<span class="hall-team">{{ entry.team.name }}</span>
							<span class="hall-season">{{ entry.season.name }}</span>
						</div>
					</li>
				</ul>
			</div>
		</section>

		<section class="page-container quick-links" aria-label="Explore">
			<router-link v-for="link in quickLinks" :key="link.to" :to="link.to" class="quick-card">
				<span class="quick-icon" aria-hidden="true">{{ link.icon }}</span>
				<span class="quick-title">{{ link.title }}</span>
				<span class="quick-text">{{ link.text }}</span>
			</router-link>
		</section>
	</div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import dayjs from "@/plugins/dayjs";
import SeasonCountdown from "@/components/SeasonCountdown.vue";
import { useSeasonStore } from "@/store/seasonStore";
import { useTeamStore } from "@/store/teamStore";
import { useRosterStore } from "@/store/rosterStore";
import { seasonService } from "@/services/seasonService";
import { matchService } from "@/services/matchService";
import { resolveAsset } from "@/utils/common";
import { Routes, MatchStatus, MatchCategory, MatchOutcome, LEAGUE_TIMEZONE } from "@/utils/constants";
import { isSeasonFinished, isSeasonUpcoming, seasonStartValue } from "@/utils/season";

const seasonStore = useSeasonStore();
const teamStore = useTeamStore();
const rosterStore = useRosterStore();

const loading = ref(true);
const loadError = ref("");
const champion = ref(null);
const pastChampions = ref([]);
const seasonStarted = ref(false);

const FINAL_CATEGORY = MatchCategory.find((c) => c.name === "Final")?.id;
const PLAYED_STATUS = MatchStatus.find((s) => s.name === "Played")?.id;

const floatingCoins = Array.from({ length: 14 }, (_, i) => ({
	id: i,
	tone: i % 7 === 0 ? "queen" : i % 2 === 0 ? "white" : "black",
	style: {
		left: `${(i * 37) % 100}%`,
		animationDelay: `${(i * 0.9) % 8}s`,
		animationDuration: `${9 + (i % 5) * 2}s`,
		"--size": `${14 + (i % 4) * 6}px`,
	},
}));

const quickLinks = [
	{ to: Routes.POINTS_TABLE, icon: "📊", title: "Points Table", text: "Live standings and tie-breakers" },
	{ to: Routes.RULES, icon: "📜", title: "Rules", text: "15-minute games and Golden Strike" },
	{ to: Routes.TEAMS, icon: "🛡️", title: "Teams", text: "Season rosters and title history" },
	{ to: Routes.PLAYERS, icon: "🎯", title: "Players", text: "Profiles and career numbers" },
];

const completedSeasons = computed(() =>
	(seasonStore.seasons || [])
		.filter(isSeasonFinished)
		.sort((a, b) => seasonStartValue(b) - seasonStartValue(a)),
);

const lastSeason = computed(() => completedSeasons.value[0] || null);

const seasonStart = (season) => dayjs.tz(`${season.start_date} 00:00`, LEAGUE_TIMEZONE);

const upcomingSeason = computed(() => {
	return (seasonStore.seasons || [])
		.filter(isSeasonUpcoming)
		.sort((a, b) => seasonStartValue(a) - seasonStartValue(b))[0] || null;
});

const countdownTarget = computed(() =>
	upcomingSeason.value ? seasonStart(upcomingSeason.value).valueOf() : null,
);

const heroEyebrow = computed(() => {
	if (!upcomingSeason.value) return "Carrom Premier League";
	return seasonStarted.value || dayjs().valueOf() >= countdownTarget.value
		? "Now Playing"
		: "Upcoming Season";
});

const heroTitle = computed(() =>
	upcomingSeason.value ? `${upcomingSeason.value.name} is coming` : "The board is being set",
);

const heroSubtitle = computed(() => {
	if (!upcomingSeason.value) {
		return "Dates for the next season will be announced soon. Stay tuned!";
	}
	const start = seasonStart(upcomingSeason.value).format("dddd, D MMMM YYYY");
	return `First strike on ${start}. Fifteen-minute games and a new champion.`;
});

const championStats = computed(() => {
	const s = champion.value?.standing;
	if (!s) return [];
	return [
		{ label: "Played", value: s.matches_played },
		{ label: "Won", value: s.wins },
		{ label: "Points", value: s.points },
		{ label: "Net", value: s.net_points },
	];
});

const teamById = (id) => (teamStore.teams || []).find((t) => t.id === id) || null;

const onCountdownFinished = () => {
	seasonStarted.value = true;
};

const onAvatarError = (event) => {
	event.target.src = resolveAsset("public/assets/images/favicon.png");
};

const findFinalOpponent = async (seasonId, winnerId) => {
	try {
		const response = await matchService.getAll(seasonId);
		const final = (response.data || []).find(
			(m) => m.category === FINAL_CATEGORY && m.status === PLAYED_STATUS,
		);
		if (!final || final.outcome === MatchOutcome.NotDecided) return null;
		const opponentId = final.team1 === winnerId ? final.team2 : final.team1;
		return teamById(opponentId);
	} catch {
		return null;
	}
};

const loadChampions = async () => {
	if (!completedSeasons.value.length) return;

	const tables = await Promise.allSettled(
		completedSeasons.value.map((season) => seasonService.getLeagueTable(season.id)),
	);

	const winners = completedSeasons.value
		.map((season, index) => {
			const result = tables[index];
			const table = result.status === "fulfilled" ? result.value?.data : null;
			if (!table || table.data_available === false) {
				return null;
			}
			const team = table?.winner_id ? teamById(table.winner_id) : null;
			return team ? { season, team, table } : null;
		})
		.filter(Boolean);

	const latest = winners.find((w) => w.season.id === lastSeason.value.id);
	pastChampions.value = winners.filter((w) => w !== latest);

	if (!latest) return;

	if (!rosterStore.teams.has(latest.season.id)) {
		await rosterStore.fetchTeamDetails(latest.season.id).catch(() => null);
	}
	const roster = rosterStore.teams.get(latest.season.id) || [];

	champion.value = {
		team: latest.team,
		standing: latest.table.standings?.find((s) => s.team_id === latest.team.id) || null,
		players: roster.find((r) => r.team_id === latest.team.id)?.players || [],
		finalOpponent: await findFinalOpponent(latest.season.id, latest.team.id),
	};
};

onMounted(async () => {
	try {
		await loadChampions();
	} catch (error) {
		console.error("Failed to load champions", error);
		loadError.value = "We couldn't load the champions right now. Please try again later.";
	} finally {
		loading.value = false;
	}
});
</script>

<style scoped lang="scss">
.hero {
	position: relative;
	overflow: hidden;
	color: #fff;
	background:
		radial-gradient(ellipse at 20% 0%, rgba(245, 184, 46, 0.18), transparent 55%),
		radial-gradient(ellipse at 90% 100%, rgba(230, 57, 70, 0.18), transparent 50%),
		linear-gradient(160deg, var(--cpl-navy-900) 0%, var(--cpl-navy-800) 55%, var(--cpl-navy-700) 100%);
	padding: clamp(48px, 9vw, 110px) var(--page-gutter) clamp(90px, 12vw, 140px);
}

.hero-bg {
	position: absolute;
	inset: 0;
	pointer-events: none;
}

.board {
	position: absolute;
	top: 50%;
	left: 50%;
	width: min(720px, 120vw);
	aspect-ratio: 1;
	transform: translate(-50%, -50%) rotate(0deg);
	border-radius: 28px;
	border: 14px solid rgba(201, 139, 79, 0.16);
	background: radial-gradient(circle, rgba(233, 197, 155, 0.07), rgba(233, 197, 155, 0.02));
	animation: board-spin 90s linear infinite;
}

.pocket {
	position: absolute;
	width: 9%;
	aspect-ratio: 1;
	border-radius: 50%;
	background: rgba(0, 0, 0, 0.35);
	box-shadow: inset 0 0 0 2px rgba(201, 139, 79, 0.2);
}
.p1 { top: 2%; left: 2%; }
.p2 { top: 2%; right: 2%; }
.p3 { bottom: 2%; left: 2%; }
.p4 { bottom: 2%; right: 2%; }

.board-circle {
	position: absolute;
	inset: 34%;
	border-radius: 50%;
	border: 2px solid rgba(233, 197, 155, 0.15);
	box-shadow: 0 0 0 18px rgba(233, 197, 155, 0.03);
}

.coin {
	position: absolute;
	bottom: -40px;
	width: var(--size);
	height: var(--size);
	border-radius: 50%;
	opacity: 0;
	animation: coin-rise linear infinite;

	&.white {
		background: radial-gradient(circle at 35% 35%, #fffaf0, #e9c59b);
		box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.08);
	}
	&.black {
		background: radial-gradient(circle at 35% 35%, #4b5563, #111827);
		box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.1);
	}
	&.queen {
		background: radial-gradient(circle at 35% 35%, #ff7a85, var(--cpl-red-500));
		box-shadow: 0 0 14px rgba(230, 57, 70, 0.6);
	}
}

.hero-content {
	position: relative;
	z-index: 1;
	max-width: 860px;
	margin: 0 auto;
	text-align: center;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: clamp(14px, 2.5vw, 22px);
}

.hero-eyebrow {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	padding: 6px 14px;
	border-radius: 999px;
	font-size: 12px;
	font-weight: 600;
	letter-spacing: 0.16em;
	text-transform: uppercase;
	color: var(--cpl-gold-400);
	background: rgba(245, 184, 46, 0.1);
	border: 1px solid rgba(245, 184, 46, 0.3);
	animation: fade-up 0.6s ease both;
}

.eyebrow-dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: var(--cpl-gold-400);
	animation: blink 1.6s ease-in-out infinite;
}

.hero-title {
	margin: 0;
	font-family: var(--cpl-font-display);
	font-weight: 800;
	font-size: clamp(32px, 7vw, 68px);
	line-height: 1.05;
	animation: fade-up 0.7s 0.1s ease both;
}

.shimmer {
	background: linear-gradient(
		100deg,
		#fff 0%,
		#fff 40%,
		var(--cpl-gold-400) 50%,
		#fff 60%,
		#fff 100%
	);
	background-size: 250% 100%;
	-webkit-background-clip: text;
	background-clip: text;
	color: transparent;
	animation: shimmer 5s ease-in-out infinite;
}

.hero-subtitle {
	margin: 0;
	max-width: 620px;
	font-size: clamp(14px, 2vw, 17px);
	color: rgba(255, 255, 255, 0.75);
	animation: fade-up 0.7s 0.2s ease both;
}

.hero-content > :deep(.countdown) {
	margin-top: 8px;
	animation: fade-up 0.8s 0.3s ease both;
}

.countdown-skeleton {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: clamp(10px, 3vw, 28px);
	width: 100%;
	max-width: 620px;

	span {
		aspect-ratio: 1;
		max-width: 130px;
		width: 100%;
		justify-self: center;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.06);
		animation: blink 1.4s ease-in-out infinite;
	}
}

.hero-ctas {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 12px;
	margin-top: 8px;
	animation: fade-up 0.8s 0.4s ease both;
}

.cta {
	padding: 12px 24px;
	border-radius: 999px;
	font-weight: 600;
	font-size: 15px;
	text-decoration: none;
	transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;

	&:hover {
		transform: translateY(-2px);
	}
}

.cta-primary {
	color: var(--cpl-navy-900);
	background: linear-gradient(135deg, var(--cpl-gold-400), var(--cpl-gold-500));
	box-shadow: 0 10px 26px rgba(245, 184, 46, 0.35);
}

.cta-ghost {
	color: #fff;
	border: 1px solid rgba(255, 255, 255, 0.35);

	&:hover {
		background: rgba(255, 255, 255, 0.08);
	}
}

.hero-wave {
	position: absolute;
	left: 0;
	right: 0;
	bottom: -1px;
	height: 60px;
	background: var(--cpl-surface-muted);
	clip-path: ellipse(70% 100% at 50% 100%);
}

.section-head {
	text-align: center;
	margin-bottom: clamp(20px, 4vw, 36px);
}

.champion-card {
	position: relative;
	overflow: hidden;
	display: grid;
	grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
	gap: clamp(20px, 4vw, 48px);
	padding: clamp(20px, 4vw, 44px);
	border-radius: var(--cpl-radius-lg);
	background:
		radial-gradient(circle at 0% 0%, rgba(255, 209, 102, 0.35), transparent 45%),
		linear-gradient(135deg, #fffdf6 0%, #ffffff 60%);
	border: 1px solid rgba(245, 184, 46, 0.35);
	box-shadow: 0 20px 50px rgba(245, 184, 46, 0.15), var(--cpl-shadow-card);
	animation: fade-up 0.7s ease both;
}

.skeleton-card {
	min-height: 320px;
	background: linear-gradient(90deg, #eef2f7 0%, #f8fafc 50%, #eef2f7 100%);
	background-size: 200% 100%;
	border: none;
	animation: skeleton 1.4s ease-in-out infinite;
}

.confetti span {
	position: absolute;
	top: -12px;
	left: calc(var(--n) * 5.5%);
	width: 8px;
	height: 14px;
	border-radius: 2px;
	opacity: 0;
	background: hsl(calc(var(--n) * 37), 85%, 60%);
	animation: confetti-fall 3.6s ease-in calc(var(--n) * 0.18s) infinite;
}

.champion-identity {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	gap: 10px;
}

.trophy {
	font-size: clamp(36px, 6vw, 52px);
	line-height: 1;
	animation: trophy-bounce 2.4s ease-in-out infinite;
	filter: drop-shadow(0 8px 12px rgba(245, 184, 46, 0.45));
}

.logo-ring {
	position: relative;
	width: clamp(120px, 22vw, 180px);
	aspect-ratio: 1;
	border-radius: 50%;
	padding: 6px;
	background: conic-gradient(from 0deg, var(--cpl-gold-400), var(--cpl-red-500), var(--cpl-gold-500), var(--cpl-gold-400));
	animation: ring-spin 6s linear infinite;

	img {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		object-fit: cover;
		background: #fff;
		border: 4px solid #fff;
		animation: ring-spin 6s linear infinite reverse;
	}
}

.champion-name {
	margin: 6px 0 0;
	font-family: var(--cpl-font-display);
	font-size: clamp(24px, 4vw, 34px);
	font-weight: 800;
	color: var(--cpl-ink-900);
}

.champion-slogan {
	margin: 0;
	font-style: italic;
	color: var(--cpl-ink-600);
}

.final-note {
	margin: 0;
	font-size: 14px;
	color: var(--cpl-ink-600);
}

.champion-details {
	display: flex;
	flex-direction: column;
	justify-content: center;
	gap: 18px;
	min-width: 0;
}

.record {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 10px;
}

.record-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 14px 6px;
	border-radius: var(--cpl-radius-md);
	background: #fff;
	border: 1px solid var(--cpl-line);
}

.record-value {
	font-family: var(--cpl-font-display);
	font-size: clamp(20px, 3.4vw, 28px);
	font-weight: 800;
	color: var(--cpl-ink-900);
}

.record-label {
	font-size: 11px;
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: var(--cpl-ink-400);
}

.squad-title {
	margin: 0;
	font-size: 13px;
	letter-spacing: 0.12em;
	text-transform: uppercase;
	color: var(--cpl-wood-500);
}

.squad {
	list-style: none;
	margin: 0;
	padding: 0;
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
	gap: 10px;

	li {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 12px;
		border-radius: var(--cpl-radius-md);
		background: #fff;
		border: 1px solid var(--cpl-line);
		animation: fade-up 0.5s ease both;
		animation-delay: calc(0.3s + var(--i) * 0.08s);
	}

	img {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		object-fit: cover;
		box-shadow: 0 0 0 2px var(--cpl-gold-400);
	}

	span {
		font-weight: 600;
		font-size: 15px;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
}

.empty-card {
	padding: 32px 20px;
	text-align: center;
	border-radius: var(--cpl-radius-lg);
	background: #fff;
	border: 1px dashed var(--cpl-line);
	color: var(--cpl-ink-600);
}

.muted {
	color: var(--cpl-ink-400);
	margin: 0;
}

.hall {
	margin-top: 28px;
}

.hall-title {
	font-size: 16px;
	font-weight: 600;
	margin: 0 0 12px;
}

.hall-list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
	gap: 10px;

	li {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px;
		border-radius: var(--cpl-radius-md);
		background: #fff;
		border: 1px solid var(--cpl-line);
	}

	img {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		object-fit: cover;
	}

	div {
		display: flex;
		flex-direction: column;
	}
}

.hall-team {
	font-weight: 600;
}

.hall-season {
	font-size: 12px;
	color: var(--cpl-ink-400);
}

.quick-links {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 16px;
	padding-top: 0;
}

.quick-card {
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 22px;
	border-radius: var(--cpl-radius-lg);
	background: #fff;
	border: 1px solid var(--cpl-line);
	box-shadow: var(--cpl-shadow-card);
	text-decoration: none;
	color: inherit;
	transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;

	&:hover {
		transform: translateY(-4px);
		border-color: var(--cpl-gold-400);
		box-shadow: 0 18px 36px rgba(15, 23, 42, 0.12);
	}
}

.quick-icon {
	font-size: 28px;
}

.quick-title {
	font-family: var(--cpl-font-display);
	font-size: 18px;
	font-weight: 700;
}

.quick-text {
	font-size: 13px;
	color: var(--cpl-ink-600);
}

@media (max-width: 991.98px) {
	.champion-card {
		grid-template-columns: 1fr;
	}
	.quick-links {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

@media (max-width: 575.98px) {
	.record {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
	.squad {
		grid-template-columns: 1fr;
	}
	.quick-links {
		grid-template-columns: 1fr;
	}
	.cta {
		flex: 1 1 100%;
		text-align: center;
	}
}

@keyframes board-spin {
	to {
		transform: translate(-50%, -50%) rotate(360deg);
	}
}

@keyframes coin-rise {
	0% {
		transform: translateY(0) rotate(0deg);
		opacity: 0;
	}
	10% {
		opacity: 0.8;
	}
	90% {
		opacity: 0.6;
	}
	100% {
		transform: translateY(-120vh) rotate(360deg);
		opacity: 0;
	}
}

@keyframes fade-up {
	from {
		opacity: 0;
		transform: translateY(16px);
	}
	to {
		opacity: 1;
		transform: none;
	}
}

@keyframes shimmer {
	0%,
	100% {
		background-position: 100% 0;
	}
	50% {
		background-position: 0 0;
	}
}

@keyframes blink {
	0%,
	100% {
		opacity: 1;
	}
	50% {
		opacity: 0.35;
	}
}

@keyframes skeleton {
	from {
		background-position: 200% 0;
	}
	to {
		background-position: -200% 0;
	}
}

@keyframes confetti-fall {
	0% {
		opacity: 0;
		transform: translateY(0) rotate(0deg);
	}
	15% {
		opacity: 1;
	}
	100% {
		opacity: 0;
		transform: translateY(420px) rotate(540deg);
	}
}

@keyframes trophy-bounce {
	0%,
	100% {
		transform: translateY(0) rotate(-4deg);
	}
	50% {
		transform: translateY(-8px) rotate(4deg);
	}
}

@keyframes ring-spin {
	to {
		transform: rotate(360deg);
	}
}
</style>
