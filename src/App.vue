<template>
	<Navbar />
	<router-view v-if="parentRendered" />
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import Navbar from "./components/Navbar.vue";
import { useSeasonStore } from "./store/seasonStore";
import { useRoute } from "vue-router";
import { Routes } from "./utils/constants";

const route = useRoute();
const seasonStore = useSeasonStore();
const parentRendered = ref(false);

onMounted(async () => {
	switch (window.location.pathname) {
		case Routes.POINTS_TABLE:
			seasonStore.seasons.length === 0 && (await seasonStore.fetchSeasons());
			break;
		default:
			seasonStore.seasons.length === 0 && (await seasonStore.fetchSeasons());
			break;
	}
	parentRendered.value = true;
});
</script>
