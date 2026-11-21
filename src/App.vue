<template>
	<Navbar v-if="!isWidgetRoute" />
	<main id="app-content">
		<router-view />
	</main>
	<template v-if="!isWidgetRoute">
		<Footer v-if="!isAdminRoute" />
		<StrikerChat v-if="showPublicAssistant" mode="public" />
		<SessionHandoff v-if="authStore.isAuthenticated" />
		<NotifyHost />
	</template>
</template>

<script setup>
import { computed, onMounted, onUnmounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { notify } from "@/utils/notify";
import { listenForForegroundPush } from "@/utils/foregroundPush";
import { authService } from "@/services/authService";
import { hub, watchLive } from "@/utils/realtime";
import { areaOf, areas } from "@/utils/realtimeRules";
import { useSeasonStore } from "@/store/seasonStore";
import { useTeamStore } from "@/store/teamStore";
import Navbar from "./components/Navbar.vue";
import Footer from "./components/Footer.vue";
import StrikerChat from "./components/striker/StrikerChat.vue";
import SessionHandoff from "./components/admin/SessionHandoff.vue";
import NotifyHost from "./components/NotifyHost.vue";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/settingsStore";
import { assistantIsVisible } from "@/utils/assistantVisibility";
import { Routes } from "@/utils/constants";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const settingsStore = useSettingsStore();
const seasonStore = useSeasonStore();
const teamStore = useTeamStore();

const adminTicket = async () => {
	if (!authStore.isAuthenticated) return null;
	try {
		const response = await authService.realtimeTicket();
		return response?.ticket || null;
	} catch {
		return null;
	}
};

watch(
	() => authStore.isAuthenticated,
	(signedIn) => hub.setTicketSource(signedIn ? adminTicket : null),
	{ immediate: true },
);

const quietly = (promise) => Promise.resolve(promise).catch(() => undefined);

// Shared data the navbar, countdown, home page, and admin sidebar read without fetching themselves.
const refreshStores = (area) => {
	if (!area || area === "seasons") quietly(seasonStore.fetchSeasons());
	if (!area || area === "teams") quietly(teamStore.fetchTeams());
	if (!area || area === "settings") quietly(settingsStore.fetchSettings());
	if ((!area || area === "me") && authStore.isAuthenticated) quietly(authStore.loadProfile({ force: true }));
};

let streamOpened = false;
let streamWasOpen = false;
const stopStoreSync = watchLive({
	areas: areas.stores,
	onEvent: (body) => refreshStores(areaOf(body)),
	onState: (state) => {
		const reopened = state === "open" && !streamWasOpen && streamOpened;
		if (state === "open") streamOpened = true;
		streamWasOpen = state === "open";
		if (reopened) refreshStores(null);
	},
});

const isAdminRoute = computed(() => route.path.startsWith(Routes.ADMIN));
// The widget page is an overlay for a streaming tool: no site chrome, no toasts, no assistant.
const isWidgetRoute = computed(() => route.path.startsWith(`${Routes.WIDGET}/`));
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
	notify.warning("Your admin session has expired. Please sign in again.", { critical: true });
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

let stopForegroundPush = () => undefined;

onMounted(() => {
	window.addEventListener("cpl:session-expired", onSessionExpired);
	window.addEventListener("cpl:permission-denied", onPermissionDenied);
	window.addEventListener("storage", onStorage);
	stopForegroundPush = listenForForegroundPush(navigator.serviceWorker, (message) => notify.info(message));
	if (authStore.isAuthenticated) authStore.loadProfile().catch(() => undefined);
	if (!settingsStore.loaded) settingsStore.fetchSettings().catch(() => undefined);
});
onUnmounted(() => {
	stopStoreSync();
	stopForegroundPush();
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
