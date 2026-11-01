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

				<SeasonCountdown
					v-if="countdownTarget"
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
import { ref, computed } from "vue";
import dayjs from "@/plugins/dayjs";
import SeasonCountdown from "@/components/SeasonCountdown.vue";
import { useSeasonStore } from "@/store/seasonStore";
import { Routes, LEAGUE_TIMEZONE } from "@/utils/constants";
import { isSeasonUpcoming, seasonStartValue } from "@/utils/season";

const seasonStore = useSeasonStore();

const seasonStarted = ref(false);

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
	{ to: Routes.SCHEDULE, icon: "📅", title: "Schedule", text: "Live matches, results, and win chances" },
	{ to: Routes.POINTS_TABLE, icon: "📊", title: "Points Table", text: "Live standings and tie-breakers" },
	{ to: Routes.RULES, icon: "📜", title: "Rules", text: "15-minute games and Golden Strike" },
	{ to: Routes.TEAMS, icon: "🛡️", title: "Teams", text: "Season rosters and title history" },
	{ to: Routes.PLAYERS, icon: "🎯", title: "Players", text: "Profiles and career numbers" },
];

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
	return `The season opens on ${start}, with the first strike — fifteen-minute games, and a new champion to crown.`;
});

const onCountdownFinished = () => {
	seasonStarted.value = true;
};
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

.quick-links {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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
	.quick-links {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

@media (max-width: 575.98px) {
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

</style>
