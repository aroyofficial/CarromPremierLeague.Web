<template>
	<LegalDocument title="Privacy Policy" updated="19 November 2026">
		<p>
			This policy explains what the Carrom Premier League website and its admin tools do with information.
			The public site is <a href="https://cpltournament.com/">https://cpltournament.com</a>.
			<a href="https://www.cpltournament.com/">https://www.cpltournament.com</a> opens the same site.
			Admin accounts are only for people who run the league. There is no public sign-up.
		</p>

		<OrganizerContact
			note="Email this address for a privacy question, or to ask for an admin account, a player record, or a photograph to be corrected or removed."
		/>

		<h2>Information on the public site</h2>
		<p>
			Organizers publish season, team, player, roster, match, result, and gallery information so visitors
			can follow the league. That includes player names, photographs, countries, and statistics. Publishing
			a player or a photograph is a choice the organizers make in the admin tools.
		</p>

		<h2>Visitors</h2>
		<p>Looking at the site does not create an account. The browser on your device may keep:</p>
		<ul>
			<li>your light or dark theme choice</li>
			<li>a random device id used to tell this browser apart from another</li>
			<li>a calendar-feed link, if you create one</li>
			<li>the push-alert subscription, if you turn alerts on</li>
		</ul>
		<p>The site does not use advertising trackers or an analytics product.</p>

		<h2>Match alerts</h2>
		<p>
			If you turn on match alerts, the browser gives this site a push address on that browser's own push
			service. The API stores that address so it can send a notification when a match is created, moved,
			cancelled, started, finished, or has its result changed, and on the morning of a scheduled match.
			The address is not tied to your name. Turn alerts off in the alerts menu on this site, or in the
			browser's site settings, and the API stops using that address.
		</p>

		<h2>Calendar subscription links</h2>
		<p>
			A calendar feed is a private link for one season. Apple Calendar, Google Calendar, or Outlook can
			subscribe to it and pick up later changes. Anyone who has the link can read that season's matches.
			Treat the link like a password and create a new one if you shared it by mistake.
		</p>

		<h2>Admin accounts</h2>
		<p>
			An organizer's account stores a username, name, email address, and, if they add one, a phone number.
			The password is stored only as a hash. Sign-in can also use an email code, an authenticator app, or
			a passkey. The API keeps the signed-in session in this browser until you log out.
		</p>

		<h2>Google Calendar</h2>
		<p>
			Connecting Google Calendar is optional and only an admin can do it. The app asks Google for the
			<code>https://www.googleapis.com/auth/calendar.events</code> permission. That permission can cover
			events on the admin's calendars. This app uses it only to create and update all-day match events on
			the admin's primary calendar.
		</p>
		<p>Each event can include:</p>
		<ul>
			<li>the two team names, the season, and the category</li>
			<li>the result, once the match has been played</li>
			<li>the players listed on each team's roster for that season</li>
			<li>a link back to the match on this site</li>
		</ul>
		<p>
			Google gives the API a refresh token so later match changes can be written without asking the admin
			to sign in every time. The token is encrypted before it is stored. The API does not read other
			calendars, email, or files. Disconnecting the calendar in Admin settings stops further writes. Google
			is the provider of the calendar the admin connects.
		</p>

		<h2>Microsoft 365 and Outlook</h2>
		<p>
			Connecting Outlook is also optional and only an admin can do it. The app asks Microsoft for
			<code>Calendars.ReadWrite</code> and <code>offline_access</code>. It uses those permissions only to
			create and update match events through Microsoft Graph at <code>/me/events</code>. The refresh token
			is encrypted before it is stored. Disconnecting in Admin settings stops further writes.
		</p>

		<h2>Striker, the match assistant</h2>
		<p>
			If you type a question into Striker, that message is sent to the API and then to an AI provider
			(Gemini, Groq, OpenRouter, or Cursor, in that order when a key is configured) so it can answer from
			league information. On the public site the assistant can see only what the public site shows. Do not
			type passwords or other secrets into the chat.
		</p>

		<h2>Photographs</h2>
		<p>
			Pictures uploaded for players, teams, or the gallery are stored with Cloudinary so the site can
			display them. They are visible to anyone who can open the page they are published on.
		</p>

		<h2>Who else receives information</h2>
		<p>
			The public site is hosted on GitHub Pages and published at
			<a href="https://cpltournament.com/">https://cpltournament.com</a> and
			<a href="https://www.cpltournament.com/">https://www.cpltournament.com</a>. The API runs on Render.
			Information is also sent to:
		</p>
		<ul>
			<li>Google or Microsoft, only after an admin connects that calendar</li>
			<li>the browser's push service, only after a visitor turns alerts on</li>
			<li>the email or SMS provider the league uses to send an admin a sign-in code</li>
			<li>Cloudinary, when a photograph is uploaded</li>
			<li>the AI provider answering a Striker question</li>
		</ul>
		<p>The league does not sell personal information.</p>

		<h2>How long it is kept</h2>
		<p>
			A calendar token is kept until that admin disconnects the calendar or an organizer removes the
			account. A push address is kept until alerts are turned off or the browser replaces the
			subscription. Published league records stay for as long as the organizers leave them on the site.
			An admin account stays until an organizer deletes it.
		</p>

		<h2>Your choices</h2>
		<ul>
			<li>Leave alerts off, or turn them off later.</li>
			<li>Do not create a calendar-feed link, and do not share one you already have.</li>
			<li>Disconnect Google or Outlook in Admin settings. That stops new writes to that calendar.</li>
			<li>Email {{ Organizer.name }} at {{ Organizer.email }} to correct or delete an admin account or a published player record.</li>
		</ul>

		<h2>Changes</h2>
		<p>
			If this policy changes, the date at the top of this page changes with it. Continuing to use the site
			after that date means the new policy applies.
		</p>

		<p>
			The same contact details are at the top of this page. The
			<router-link :to="Routes.TERMS">terms and conditions</router-link>
			explain the rules for using the site.
		</p>
	</LegalDocument>
</template>

<script setup>
import LegalDocument from "@/components/LegalDocument.vue";
import OrganizerContact from "@/components/OrganizerContact.vue";
import { Organizer, Routes } from "@/utils/constants";
</script>
