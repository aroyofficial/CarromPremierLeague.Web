<template>
	<footer id="footer-wrapper">
		<div class="footer-inner">
			<span>
				&copy; {{ year }} Carrom Premier League (CPL). All Rights Reserved.
				<a class="footer-mail" :href="`mailto:${Organizer.email}`">{{ Organizer.name }} · {{ Organizer.email }}</a>
			</span>
			<nav class="footer-social" aria-label="Social media">
				<a v-for="link in SocialLinks" :key="link.href" :href="link.href" target="_blank" rel="noopener noreferrer">
					{{ link.label }}
				</a>
			</nav>
			<nav class="footer-links" aria-label="Footer navigation">
				<router-link v-for="item in NavItems" :key="item.path" :to="item.path">
					{{ item.label }}
				</router-link>
				<router-link :to="Routes.ABOUT">About</router-link>
				<router-link :to="Routes.PRIVACY">Privacy</router-link>
				<router-link :to="Routes.TERMS">Terms</router-link>
			</nav>
		</div>
	</footer>
</template>

<script setup>
import { NavItems, Organizer, Routes, SocialLinks } from "@/utils/constants";

const year = new Date().getFullYear();
</script>

<style scoped lang="scss">
#footer-wrapper {
	flex-shrink: 0;
	background: var(--cpl-navy-900);
	color: rgba(255, 255, 255, 0.7);
	font-size: 13px;
}

.footer-inner {
	max-width: 1280px;
	margin: 0 auto;
	padding: 18px var(--page-gutter);
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	align-items: center;
	gap: 12px;
}

.footer-social,
.footer-links {
	display: flex;
	flex-wrap: wrap;
	gap: 6px 18px;

	a {
		color: rgba(255, 255, 255, 0.7);
		text-decoration: none;

		&:hover {
			color: var(--cpl-gold-400);
		}
	}
}

.footer-mail {
	display: inline-block;
	margin-left: 10px;
	color: rgba(255, 255, 255, 0.7);
	text-decoration: none;

	&:hover {
		color: var(--cpl-gold-400);
	}
}

@media (max-width: 575.98px) {
	.footer-inner {
		flex-direction: column;
		text-align: center;
	}
	.footer-social,
	.footer-links {
		justify-content: center;
	}
	.footer-mail {
		display: block;
		margin: 6px 0 0;
	}
}
</style>
