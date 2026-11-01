<template>
	<div class="not-found">
		<div class="status-code">404</div>
		<h1 class="status-title">Page Not Found</h1>
		<p class="status-msg">Sorry, the page you are looking for could not be found.</p>
		<router-link :to="Routes.HOME" class="home-link">Back to Home</router-link>
	</div>
</template>

<script setup>
import { Routes } from "@/utils/constants";
</script>

<style scoped lang="scss">
.not-found {
	min-height: calc(100vh - var(--app-header-height) - 80px);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	text-align: center;
	padding: 40px var(--page-gutter);
}

.status-code {
	font-family: var(--cpl-font-display);
	font-size: clamp(80px, 20vw, 140px);
	font-weight: 800;
	line-height: 1;
	color: var(--cpl-navy-900);
}

.status-title {
	font-size: clamp(22px, 4vw, 30px);
	font-weight: 600;
	margin: 8px 0;
}

.status-msg {
	color: var(--cpl-ink-600);
	margin-bottom: 20px;
}

.home-link {
	padding: 10px 22px;
	border-radius: 999px;
	font-weight: 600;
	text-decoration: none;
	color: var(--cpl-navy-900);
	background: linear-gradient(135deg, var(--cpl-gold-400), var(--cpl-gold-500));
}
</style>
