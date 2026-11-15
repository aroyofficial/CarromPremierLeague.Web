<template>
	<Navbar />
	<main id="app-content">
		<router-view />
	</main>
	<Footer v-if="!isAdminRoute" />
	<StrikerChat v-if="showPublicAssistant" mode="public" />
	<SessionHandoff v-if="authStore.isAuthenticated" />
</template>

<script setup>
import { computed, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import Navbar from "./components/Navbar.vue";
import Footer from "./components/Footer.vue";
import StrikerChat from "./components/striker/StrikerChat.vue";
import SessionHandoff from "./components/admin/SessionHandoff.vue";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/settingsStore";
import { assistantIsVisible } from "@/utils/assistantVisibility";
import { Routes } from "@/utils/constants";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const settingsStore = useSettingsStore();

const isAdminRoute = computed(() => route.path.startsWith(Routes.ADMIN));
const showPublicAssistant = computed(
	() =>
		!isAdminRoute.value &&
		route.path !== Routes.LOGIN &&
		settingsStore.loaded &&
		assistantIsVisible({
			enabled: settingsStore.assistant_public_enabled,
			checked: settingsStore.assistantChecked,
			available: settingsStore.assistantAvailable,
		}),
);

const onSessionExpired = () => {
	authStore.dropLocal();
	ElMessage.warning("Your admin session has expired. Please sign in again.");
	// The login page stays put, so "You're already signed in" is not replaced by the public site.
	if (route.path === Routes.LOGIN || route.path === Routes.HOME) return;
	router.push(Routes.HOME);
};

const onStorage = (event) => {
	if (event.key !== "cpl_admin_token") return;
	if (!event.newValue) {
		authStore.token = null;
		authStore.username = null;
		authStore.firstName = "";
		authStore.lastName = "";
		authStore.adminId = null;
		authStore.permissions = [];
		authStore.mustChangePassword = false;
		authStore.profileLoaded = false;
		return;
	}
	authStore.token = event.newValue;
	authStore.profileLoaded = false;
	authStore.loadProfile({ force: true }).catch(() => undefined);
};

const onPermissionDenied = () => {
	authStore.loadProfile({ force: true }).catch(() => undefined);
};

onMounted(() => {
	window.addEventListener("cpl:session-expired", onSessionExpired);
	window.addEventListener("cpl:permission-denied", onPermissionDenied);
	window.addEventListener("storage", onStorage);
	if (authStore.isAuthenticated) authStore.loadProfile().catch(() => undefined);
	if (!settingsStore.loaded) settingsStore.fetchSettings().catch(() => undefined);
});
onUnmounted(() => {
	window.removeEventListener("cpl:session-expired", onSessionExpired);
	window.removeEventListener("cpl:permission-denied", onPermissionDenied);
	window.removeEventListener("storage", onStorage);
});
</script>

<style lang="scss">
#app-content {
	flex: 1 0 auto;
	width: 100%;
}
</style>
