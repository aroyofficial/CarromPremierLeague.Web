<template>
	<FramedPicture
		v-if="usable"
		:src="src"
		:alt="name"
		class="bc-pic"
		:class="shape === 'avatar' ? 'is-cover' : 'is-contain'"
		@error="failed = true"
	/>
	<span v-else class="bc-initials">{{ initials }}</span>
</template>

<script setup>
// One picture for every broadcast graphic: a team logo or a player photo that honours the saved frame
// (the `#cplcrop=` crop picked in the admin), and falls back to initials when there is no picture.
import { computed, ref, watch } from "vue";
import FramedPicture from "@/components/FramedPicture.vue";
import { teamInitials } from "@/utils/widgetScore";

const props = defineProps({
	src: { type: String, default: "" },
	name: { type: String, default: "" },
	shape: { type: String, default: "crest", validator: (value) => ["crest", "avatar"].includes(value) },
});

const failed = ref(false);
watch(
	() => props.src,
	() => {
		failed.value = false;
	},
);

const usable = computed(() => Boolean(props.src) && !failed.value);
const initials = computed(() => teamInitials(props.name));
</script>
