<template>
	<div class="page-container legal-page">
		<header class="page-heading">
			<div>
				<span class="page-eyebrow">Carrom Premier League</span>
				<h1 class="page-title">{{ title }}</h1>
				<p class="page-subtitle">Last updated {{ updated }}</p>
			</div>
		</header>
		<article class="legal-body">
			<slot />
		</article>
	</div>
</template>

<script setup>
defineProps({
	title: { type: String, required: true },
	updated: { type: String, required: true },
});
</script>

<style scoped lang="scss">
.legal-body {
	max-width: 760px;
	background: var(--cpl-paper);
	border: 1px solid var(--cpl-paper-line);
	border-radius: var(--cpl-radius-lg);
	padding: clamp(18px, 3vw, 32px);
	color: var(--cpl-ink-600);
	font-size: 15px;
	line-height: 1.65;

	:deep(h2) {
		font-family: var(--cpl-font-display);
		font-size: 20px;
		font-weight: 650;
		line-height: 1.3;
		color: var(--cpl-ink-900);
		margin: 28px 0 8px;
	}

	:deep(h2:first-child) {
		margin-top: 0;
	}

	:deep(p),
	:deep(ul) {
		margin: 0 0 12px;
	}

	:deep(ul) {
		padding-left: 1.2em;
	}

	:deep(li + li) {
		margin-top: 6px;
	}

	:deep(a) {
		color: var(--cpl-gold-text);
	}
}
</style>
