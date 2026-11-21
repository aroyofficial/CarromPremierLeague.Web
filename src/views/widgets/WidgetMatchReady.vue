<template>
	<section class="bc-card mr-panel">
		<header class="bc-topbar">
			<div class="bc-eyebrow">
				<span class="bc-league-pill">CPL</span>
				<span v-if="seasonName">{{ seasonName }}</span>
				<span v-if="seasonName" class="bc-dot"></span>
				<span>{{ matchLabel(match) }}</span>
			</div>
			<span class="bc-badge is-gold">
				{{ mode === "up_next" ? "Up Next on Stream" : "Players at the Table · Match Ready" }}
			</span>
		</header>

		<div class="mr-showcase">
			<div class="mr-club">
				<div class="bc-crest is-lg">
					<img v-if="match.team1?.logo_url" :src="match.team1.logo_url" alt="" />
					<span v-else class="bc-crest-initials">{{ teamInitials(match.team1?.name) }}</span>
				</div>
				<h2>{{ match.team1?.name || "TBD" }}</h2>
				<div v-if="homeRoster.length" class="mr-roster">
					<div v-for="player in homeRoster" :key="player.player_id" class="mr-player">
						<span class="bc-avatar">
							<img v-if="player.avatar_url" :src="player.avatar_url" alt="" />
							<span v-else>{{ teamInitials(player.name) }}</span>
						</span>
						<span>{{ player.name }}</span>
					</div>
				</div>
			</div>

			<div class="mr-center">
				<div class="mr-vs-ring">VS</div>
				<span class="mr-format">{{ matchFormatLabel(match.category, clock) }}</span>
			</div>

			<div class="mr-club">
				<div class="bc-crest is-lg">
					<img v-if="match.team2?.logo_url" :src="match.team2.logo_url" alt="" />
					<span v-else class="bc-crest-initials">{{ teamInitials(match.team2?.name) }}</span>
				</div>
				<h2>{{ match.team2?.name || "TBD" }}</h2>
				<div v-if="awayRoster.length" class="mr-roster">
					<div v-for="player in awayRoster" :key="player.player_id" class="mr-player">
						<span class="bc-avatar">
							<img v-if="player.avatar_url" :src="player.avatar_url" alt="" />
							<span v-else>{{ teamInitials(player.name) }}</span>
						</span>
						<span>{{ player.name }}</span>
					</div>
				</div>
			</div>
		</div>

		<footer v-if="h2h && h2h.matches_played > 0" class="mr-h2h">
			<div class="mr-h2h-stat">
				<strong>{{ h2h.team1_wins }}</strong>
				<span>{{ match.team1?.name }} Wins</span>
			</div>
			<div class="mr-h2h-mid">
				<span class="mr-h2h-title">Head-to-Head · {{ h2h.matches_played }} Played</span>
				<div class="mr-h2h-bar">
					<span class="mr-h2h-fill is-left" :style="{ width: `${h2hSplit}%` }"></span>
				</div>
			</div>
			<div class="mr-h2h-stat is-right">
				<strong>{{ h2h.team2_wins }}</strong>
				<span>{{ match.team2?.name }} Wins</span>
			</div>
		</footer>

		<div v-if="progress != null" class="bc-timer-track">
			<div class="bc-timer-fill" :style="{ width: `${Math.round((1 - progress) * 100)}%` }"></div>
		</div>
	</section>
</template>

<script setup>
import { computed } from "vue";
import { matchFormatLabel, matchLabel, teamInitials } from "@/utils/widgetScore";

const props = defineProps({
	bundle: { type: Object, required: true },
	seasonName: { type: String, default: "" },
	clock: { type: Object, default: () => ({}) },
	mode: { type: String, default: "ready" },
	progress: { type: Number, default: null },
});

const match = computed(() => props.bundle?.match || {});
const homeRoster = computed(() => props.bundle?.rosters?.team1 || props.bundle?.players?.team1 || []);
const awayRoster = computed(() => props.bundle?.rosters?.team2 || props.bundle?.players?.team2 || []);
const h2h = computed(() => props.bundle?.head_to_head || null);
const h2hSplit = computed(() => {
	if (!h2h.value) return 50;
	const total = (h2h.value.team1_wins || 0) + (h2h.value.team2_wins || 0);
	if (!total) return 50;
	return Math.round(((h2h.value.team1_wins || 0) / total) * 100);
});
</script>

<style scoped>
.mr-panel {
	width: 1380px;
}

.mr-showcase {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
	align-items: center;
	gap: 36px;
	padding: 40px 48px 36px;
}

.mr-club {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	gap: 16px;
}

.mr-club h2 {
	margin: 0;
	font-size: 42px;
	font-weight: 800;
	line-height: 1.12;
}

.mr-roster {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 10px;
	margin-top: 4px;
}

.mr-player {
	display: inline-flex;
	align-items: center;
	gap: 10px;
	padding: 6px 16px 6px 8px;
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.055);
	border: 1px solid rgba(255, 255, 255, 0.12);
	font-size: 19px;
	font-weight: 600;
	color: #e2e8f0;
}

.mr-center {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 16px;
}

.mr-vs-ring {
	display: grid;
	place-items: center;
	width: 88px;
	height: 88px;
	border-radius: 50%;
	background: radial-gradient(circle, rgba(245, 184, 46, 0.25) 0%, rgba(15, 23, 42, 0.92) 72%);
	border: 2px solid var(--bc-accent-line);
	font-size: 32px;
	font-weight: 900;
	letter-spacing: 0.06em;
	color: var(--bc-accent-soft);
}

.mr-format {
	padding: 6px 16px;
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.06);
	font-size: 16px;
	font-weight: 600;
	color: var(--bc-sub);
	white-space: nowrap;
}

.mr-h2h {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr) auto;
	align-items: center;
	gap: 28px;
	padding: 20px 48px 24px;
	background: rgba(2, 6, 18, 0.45);
	border-top: 1px solid var(--bc-rim-soft);
}

.mr-h2h-stat {
	display: flex;
	align-items: baseline;
	gap: 10px;
}

.mr-h2h-stat.is-right {
	flex-direction: row-reverse;
}

.mr-h2h-stat strong {
	font-size: 34px;
	font-weight: 900;
	color: var(--bc-accent-soft);
}

.mr-h2h-stat span {
	font-size: 17px;
	font-weight: 600;
	color: var(--bc-sub);
}

.mr-h2h-mid {
	display: flex;
	flex-direction: column;
	gap: 8px;
	text-align: center;
}

.mr-h2h-title {
	font-size: 15px;
	font-weight: 700;
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: var(--bc-muted);
}

.mr-h2h-bar {
	height: 8px;
	border-radius: 999px;
	background: rgba(148, 163, 184, 0.25);
	overflow: hidden;
}

.mr-h2h-fill {
	display: block;
	height: 100%;
	background: linear-gradient(90deg, var(--bc-accent) 0%, var(--bc-accent-soft) 100%);
}
</style>
