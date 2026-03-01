<template>
	<div id="footer-wrapper">
		&copy; 2026 Carrom Premier League (CPL). All Rights Reserved.
	</div>
</template>

<script setup></script>

<style scoped lang="scss">
#footer-wrapper {
	position: fixed;
	left: 0;
	bottom: 0;
	height: var(--app-footer-height);
	width: 100%;
	background: rgba(255, 255, 255, 0.92);
	border-top: 1px solid #e2e8f0;
	display: flex;
	justify-content: center;
	align-items: center;
	z-index: 1050;
	backdrop-filter: blur(6px);
}
</style>
