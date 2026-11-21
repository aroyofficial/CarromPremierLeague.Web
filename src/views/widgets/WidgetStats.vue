<template>
	<section class="bc-card st-panel">
		<header class="bc-topbar">
			<div class="bc-eyebrow">
				<span class="bc-league-pill">CPL</span>
				<span>{{ seasonName || "Season" }}</span>
				<span class="bc-dot"></span>
				<span>{{ stats.matches_played || 0 }} Matches Played</span>
			</div>
			<span class="bc-badge is-gold">
				{{ stats.is_league_stage_completed ? "Golden Striker Winner" : "Golden Striker Race" }}
			</span>
		</header>

		<div v-if="leader" class="st-grid">
			<div class="st-hero">
				<span class="st-hero-tag">#1 {{ stats.is_league_stage_completed ? "GOLDEN STRIKER" : "LEADER" }}</span>
				<div class="st-hero-avatar bc-pop" style="--i: 0">
					<BroadcastPicture :src="leader.avatar_url" :name="leader.name" shape="avatar" />
				</div>
				<h2>{{ leader.name }}</h2>
				<span class="st-hero-team">{{ leader.team_name || "League Player" }}</span>

				<div class="st-hero-net">
					<strong>{{ leader.net_coins }}</strong>
					<span>Net Coins</span>
				</div>

				<div class="st-hero-metrics">
					<div>
						<strong>{{ leader.coins_pocketed }}</strong>
						<span>Pocketed</span>
					</div>
					<div>
						<strong>{{ leader.coins_fined }}</strong>
						<span>Fines</span>
					</div>
					<div>
						<strong>{{ leader.strikers_pocketed }}</strong>
						<span>Strikers</span>
					</div>
				</div>
			</div>

			<div class="st-ladder">
				<h3>Top Coin Potters</h3>
				<div
					v-for="(player, idx) in contenders"
					:key="player.player_id"
					class="st-row bc-rise"
					:style="{ '--i': idx + 1 }"
				>
					<span class="st-rank">#{{ player.rank }}</span>
					<span class="bc-avatar">
						<BroadcastPicture :src="player.avatar_url" :name="player.name" shape="avatar" />
					</span>
					<div class="st-who">
						<strong>{{ player.name }}</strong>
						<span>{{ player.team_name || "CPL" }}</span>
					</div>
					<div class="st-mini-stats">
						<span>{{ player.coins_pocketed }}c</span>
						<span>{{ player.coins_fined }}f</span>
					</div>
					<span class="st-net-pill">{{ player.net_coins }} Net</span>
				</div>
				<p v-if="!contenders.length" class="st-note">More contenders will appear as league matches conclude.</p>
			</div>
		</div>

		<p v-else class="st-empty">Player statistics appear as soon as the first league match is completed.</p>
	</section>
</template>

<script setup>
import { computed } from "vue";
import BroadcastPicture from "./BroadcastPicture.vue";

const props = defineProps({
	snapshot: { type: Object, required: true },
});

const seasonName = computed(() => props.snapshot?.season?.name || "");
const stats = computed(() => props.snapshot?.top_stats || { players: [], matches_played: 0 });
const players = computed(() => stats.value.players || []);
const leader = computed(() => players.value[0] || null);
const contenders = computed(() => players.value.slice(1, 5));
</script>

<style scoped>
.st-grid {
	display: grid;
	grid-template-columns: 440px minmax(0, 1fr);
	gap: 32px;
	padding: 30px 42px 36px;
	align-items: stretch;
}

.st-hero {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	text-align: center;
	padding: 28px 24px;
	border-radius: 20px;
	background: radial-gradient(circle at 50% 0%, rgba(245, 184, 46, 0.24) 0%, rgba(15, 23, 42, 0.9) 70%);
	border: 1.5px solid var(--bc-accent-line);
}

.st-hero-tag {
	padding: 4px 14px;
	border-radius: 999px;
	background: var(--bc-accent);
	color: var(--bc-accent-ink);
	font-size: 14px;
	font-weight: 900;
	letter-spacing: 0.1em;
}

.st-hero-avatar {
	display: grid;
	place-items: center;
	width: 112px;
	height: 112px;
	margin: 18px 0 14px;
	border-radius: 50%;
	background: linear-gradient(145deg, #1e293b, #091020);
	border: 3px solid var(--bc-accent);
	box-shadow: 0 0 28px var(--bc-accent-glow);
	overflow: hidden;
	font-size: 36px;
	font-weight: 800;
	color: var(--bc-accent-soft);
}

.st-hero h2 {
	margin: 0;
	font-size: 34px;
	font-weight: 800;
}

.st-hero-team {
	margin-top: 4px;
	font-size: 18px;
	font-weight: 600;
	color: var(--bc-sub);
}

.st-hero-net {
	display: flex;
	align-items: baseline;
	gap: 10px;
	margin: 18px 0;
	padding: 8px 24px;
	border-radius: 14px;
	background: rgba(245, 184, 46, 0.16);
	border: 1px solid var(--bc-accent-line);
}

.st-hero-net strong {
	font-size: 46px;
	font-weight: 900;
	line-height: 1;
	color: var(--bc-accent-soft);
}

.st-hero-net span {
	font-size: 16px;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.08em;
}

.st-hero-metrics {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 12px;
	width: 100%;
	padding-top: 14px;
	border-top: 1px solid var(--bc-rim-soft);
}

.st-hero-metrics strong {
	display: block;
	font-size: 24px;
	font-weight: 800;
}

.st-hero-metrics span {
	font-size: 13px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color: var(--bc-muted);
}

.st-ladder {
	display: flex;
	flex-direction: column;
	justify-content: center;
	gap: 12px;
}

.st-ladder h3 {
	margin: 0 0 4px;
	font-size: 18px;
	font-weight: 700;
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: var(--bc-muted);
}

.st-row {
	display: grid;
	grid-template-columns: 52px auto minmax(0, 1fr) auto auto;
	align-items: center;
	gap: 16px;
	padding: 14px 20px;
	border-radius: 16px;
	background: rgba(255, 255, 255, 0.045);
	border: 1px solid rgba(255, 255, 255, 0.08);
}

.st-rank {
	font-size: 22px;
	font-weight: 800;
	color: var(--bc-accent-soft);
}

.st-who {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.st-who strong {
	font-size: 23px;
	font-weight: 800;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.st-who span {
	font-size: 16px;
	color: var(--bc-sub);
}

.st-mini-stats {
	display: flex;
	gap: 14px;
	font-size: 18px;
	font-weight: 600;
	color: var(--bc-muted);
}

.st-net-pill {
	padding: 6px 16px;
	border-radius: 10px;
	background: rgba(245, 184, 46, 0.16);
	border: 1px solid var(--bc-accent-line);
	font-size: 21px;
	font-weight: 800;
	color: var(--bc-accent-soft);
}

.st-note,
.st-empty {
	margin: 28px 0;
	text-align: center;
	font-size: 22px;
	color: var(--bc-muted);
}
</style>
