<template>
	<LegalDocument title="About" updated="20 November 2026">
		<p>
			The Carrom Premier League (CPL) is a competitive carrom tournament. Teams play a season of
			matches. Points and the published tie-breakers decide the table.
		</p>

		<OrganizerContact note="Email this address with a question about the league or this website." />

		<h2>This website</h2>
		<p>
			The public site is <a href="https://cpltournament.com/">https://cpltournament.com</a>.
			<a href="https://www.cpltournament.com/">https://www.cpltournament.com</a> opens the same site.
			Anyone can read the schedule, the points table, teams, players, the gallery, and statistics.
			There is no public sign-up. Admin accounts are only for people who run the league.
		</p>

		<h2>Matches</h2>
		<p>
			How long a match lasts, how the queen is scored, and when Golden Strike is used are on the
			<router-link :to="Routes.RULES">tournament rules</router-link> page. Those rules decide a match.
			The <router-link :to="Routes.TERMS">terms and conditions</router-link> decide use of the site. The
			<router-link :to="Routes.PRIVACY">privacy policy</router-link> explains what the site does with
			information.
		</p>
	</LegalDocument>
</template>

<script setup>
import LegalDocument from "@/components/LegalDocument.vue";
import OrganizerContact from "@/components/OrganizerContact.vue";
import { Routes } from "@/utils/constants";
</script>
