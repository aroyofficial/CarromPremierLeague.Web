<template>
	<Navbar />
	<router-view v-if="parentRendered" />
	<Footer />
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import Navbar from "./components/Navbar.vue";
import Footer from "./components/Footer.vue";
import { useSeasonStore } from "./store/seasonStore";
import { useTeamStore } from "./store/teamStore";
import { useRoute } from "vue-router";
import { Routes } from "./utils/constants";

const route = useRoute();
const seasonStore = useSeasonStore();
const teamStore = useTeamStore();
const parentRendered = ref(false);
let loadingInstance = null;

const startLoader = () => {
	loadingInstance = ElLoading.service({
		lock: true,
		text: "Loading...",
		background: "rgba(0, 0, 0, 0.7)",
	});
};

const stopLoader = () => {
	if (loadingInstance) {
		loadingInstance.close();
	}
};

const playAudio = () => {
	const audioPlayer = document.getElementById("audio-player");
	// audioPlayer.play();
};

const pauseAudio = () => {
	const audioPlayer = document.getElementById("audio-player");
	audioPlayer.pause();
};

onMounted(async () => {
	startLoader();
	switch (window.location.pathname) {
		case Routes.POINTS_TABLE:
			document.addEventListener("click", playAudio, { once: true });
			teamStore.teams.length === 0 && (await teamStore.fetchTeams());
			seasonStore.seasons.length === 0 && (await seasonStore.fetchSeasons());
			break;
		default:
			pauseAudio();
			seasonStore.seasons.length === 0 && (await seasonStore.fetchSeasons());
			break;
	}
	stopLoader();
	parentRendered.value = true;
});
</script>
