<template>
	<section class="organizer" aria-label="Organizer">
		<h2>Organizer</h2>
		<p>This website is run by:</p>
		<ul>
			<li><b>Name:</b> {{ Organizer.name }}</li>
			<li>
				<b>Email:</b>
				<a :href="`mailto:${Organizer.email}`">{{ Organizer.email }}</a>
			</li>
			<li><b>Place:</b> {{ Organizer.place }}</li>
			<li>
				<b>Website:</b>
				<a :href="Organizer.website">{{ Organizer.website }}</a>
			</li>
		</ul>
		<p>{{ note }}</p>
	</section>
</template>

<script setup>
import { Organizer } from "@/utils/constants";

defineProps({
	note: { type: String, required: true },
});
</script>
