<template>
	<nav class="stats-switch" aria-label="Statistics">
		<router-link :to="Routes.STATS" exact-active-class="is-active">Golden Striker</router-link>
		<router-link :to="Routes.PLAYER_STATS" exact-active-class="is-active">Player Stats</router-link>
	</nav>
</template>

<script setup>
import { Routes } from "@/utils/constants";
</script>

<style scoped lang="scss">
.stats-switch {
	display: inline-flex;
	align-self: flex-start;
	gap: 4px;
	margin-bottom: 18px;
	padding: 4px;
	border-radius: 999px;
	background: #fff;
	border: 1px solid var(--cpl-line);
	box-shadow: var(--cpl-shadow-card);

	a {
		padding: 8px 14px;
		border-radius: 999px;
		text-decoration: none;
		font-size: 13px;
		font-weight: 600;
		color: var(--cpl-ink-600);

		&.is-active {
			color: var(--cpl-navy-900);
			background: var(--cpl-gold-400);
		}
	}
}
</style>
