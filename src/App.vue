<template>
	<Navbar />
	<main id="app-content">
		<router-view />
	</main>
	<Footer v-if="!isAdminRoute" />
</template>

<script setup>
import { computed, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import Navbar from "./components/Navbar.vue";
import Footer from "./components/Footer.vue";
import { useAuthStore } from "@/store/authStore";
import { Routes } from "@/utils/constants";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const isAdminRoute = computed(() => route.path.startsWith(Routes.ADMIN));

const onSessionExpired = () => {
	authStore.logout();
	ElMessage.warning("Your admin session has expired. Please sign in again.");
	if (route.path !== Routes.HOME) router.push(Routes.HOME);
};

const onPermissionDenied = () => {
	authStore.loadProfile({ force: true }).catch(() => undefined);
};

onMounted(() => {
	window.addEventListener("cpl:session-expired", onSessionExpired);
	window.addEventListener("cpl:permission-denied", onPermissionDenied);
	if (authStore.isAuthenticated) authStore.loadProfile().catch(() => undefined);
});
onUnmounted(() => {
	window.removeEventListener("cpl:session-expired", onSessionExpired);
	window.removeEventListener("cpl:permission-denied", onPermissionDenied);
});
</script>

<style lang="scss">
#app-content {
	flex: 1 0 auto;
	width: 100%;
}
</style>
