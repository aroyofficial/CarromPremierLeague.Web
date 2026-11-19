<template>
	<LegalDocument title="Terms and Conditions" updated="19 November 2026">
		<p>
			These terms cover use of the Carrom Premier League website at
			<a href="https://cpltournament.com/">https://cpltournament.com</a> and
			<a href="https://www.cpltournament.com/">https://www.cpltournament.com</a>, and its admin tools. How a match is
			played is on the <router-link :to="Routes.RULES">tournament rules</router-link> page. If those two
			disagree about a match, the tournament rules decide the match. These terms decide use of the site.
		</p>

		<OrganizerContact
			note="Email this address with a question about these terms, or to ask for a name or a photograph to be taken down."
		/>

		<h2>The public site</h2>
		<p>
			Anyone may read the public pages: fixtures, the points table, teams, players, the gallery, and
			statistics. Schedules, scores, and names can change. A page can be wrong until an organizer
			corrects it. The site is offered as it is, and it can be unavailable while it is being updated.
		</p>

		<h2>Admin accounts</h2>
		<p>
			Admin accounts are issued to people who run the league. Do not share the password, an email code,
			an authenticator code, or a passkey. You are responsible for what happens while your account is
			signed in. An organizer can remove an account.
		</p>

		<h2>Alerts and calendars</h2>
		<p>
			Match alerts and calendar links are optional. Connecting Google Calendar or Outlook lets this site
			write and update all-day match events on the calendar you connect. You can disconnect that calendar
			in Admin settings. A calendar-feed link is private: anyone who has it can subscribe to that season.
		</p>

		<h2>What you may not do</h2>
		<ul>
			<li>Sign in as someone else, or try to reach another admin's account.</li>
			<li>Interfere with the site, the API, or another visitor's alerts.</li>
			<li>Use the site to publish something you do not have the right to publish.</li>
			<li>Present a scraped copy of the league as if it were the official site.</li>
		</ul>

		<h2>Names and photographs</h2>
		<p>
			Organizers decide which player names and photographs are published. If you appear on the site and
			want a name or a photograph taken down, email {{ Organizer.name }} at {{ Organizer.email }}.
		</p>

		<h2>Changes</h2>
		<p>
			The league can change the site, the tournament rules, and these terms. The date at the top of this
			page changes when these terms change. Continuing to use the site after that date means the new
			terms apply.
		</p>

		<p>
			The same contact details are at the top of this page. How the site handles information is in the
			<router-link :to="Routes.PRIVACY">privacy policy</router-link>.
		</p>
	</LegalDocument>
</template>

<script setup>
import LegalDocument from "@/components/LegalDocument.vue";
import OrganizerContact from "@/components/OrganizerContact.vue";
import { Organizer, Routes } from "@/utils/constants";
</script>
