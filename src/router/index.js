import { createRouter, createWebHistory } from "vue-router";
import { ElMessage } from "element-plus";
import { AdminSections, Routes } from "../utils/constants";
import { authToken } from "../utils/authToken";
import { useSeasonStore } from "@/store/seasonStore";
import { useTeamStore } from "@/store/teamStore";
import { useMatchStore } from "@/store/matchStore";
import { useRosterStore } from "@/store/rosterStore";
import { startLoader, pauseLoader } from "../utils/common";

const adminViews = {
	"admin-dashboard": () => import("@/views/admin/AdminDashboard.vue"),
	"admin-seasons": () => import("@/views/admin/AdminSeasons.vue"),
	"admin-teams": () => import("@/views/admin/AdminTeams.vue"),
	"admin-players": () => import("@/views/admin/AdminPlayers.vue"),
	"admin-rosters": () => import("@/views/admin/AdminRosters.vue"),
	"admin-matches": () => import("@/views/admin/AdminMatches.vue"),
	"admin-countries": () => import("@/views/admin/AdminCountries.vue"),
	"admin-users": () => import("@/views/admin/AdminUsers.vue"),
};

const routes = [
	{
		path: Routes.HOME,
		name: "home",
		component: () => import("@/views/Home.vue"),
		meta: { title: "Home" },
	},
	{
		path: Routes.POINTS_TABLE,
		name: "points-table",
		component: () => import("@/views/PointsTable.vue"),
		meta: { title: "Points Table" },
	},
	{
		path: Routes.RULES,
		name: "rules",
		component: () => import("@/views/Rules.vue"),
		meta: { title: "Rules", skipPreload: true },
	},
	{
		path: Routes.TEAMS,
		name: "teams",
		component: () => import("@/views/Teams.vue"),
		meta: { title: "Teams" },
	},
	{
		path: Routes.PLAYERS,
		name: "players",
		component: () => import("@/views/Players.vue"),
		meta: { title: "Players" },
	},
	{
		path: Routes.STATS,
		name: "stats",
		component: () => import("@/views/Stats.vue"),
		meta: { title: "Golden Striker" },
	},
	{
		path: Routes.PLAYER_STATS,
		name: "player-stats",
		component: () => import("@/views/PlayerStats.vue"),
		meta: { title: "Player Stats" },
	},
	{
		path: Routes.SCHEDULE,
		name: "schedule",
		component: () => import("@/views/Schedule.vue"),
		meta: { title: "Schedule" },
	},
	{
		path: Routes.FIXTURES,
		name: "fixtures",
		component: () => import("@/views/Fixtures.vue"),
		meta: { title: "Fixtures" },
	},
	{
		path: Routes.LOGIN,
		name: "login",
		component: () => import("@/views/Login.vue"),
		meta: { title: "Admin Login", skipPreload: true },
	},
	{
		path: Routes.ADMIN,
		component: () => import("@/views/admin/AdminLayout.vue"),
		meta: { requiresAuth: true, skipPreload: true },
		children: AdminSections.map((section) => ({
			path: section.path,
			name: section.name,
			component: adminViews[section.name],
			meta: { title: `Admin · ${section.label}`, requiresAuth: true, skipPreload: true },
		})),
	},
	{
		path: Routes.NOT_FOUND,
		name: "not-found",
		component: () => import("@/views/NotFound.vue"),
		meta: { title: "Not Found", skipPreload: true },
	},
	{
		path: "/:pathMatch(.*)*",
		redirect: { name: "not-found" },
	},
];

const router = createRouter({
	history: createWebHistory(),
	routes,
	scrollBehavior(to, from, savedPosition) {
		return savedPosition || { top: 0 };
	},
});

router.beforeEach(async (to) => {
	if (to.matched.some((record) => record.meta.requiresAuth) && !authToken.get()) {
		return { path: Routes.LOGIN, query: { redirect: to.fullPath } };
	}
	if (to.meta.skipPreload) return true;

	startLoader();
	try {
		const seasonStore = useSeasonStore();
		const teamStore = useTeamStore();

		await Promise.all([
			seasonStore.seasons.length === 0 && seasonStore.fetchSeasons(),
			teamStore.teams.length === 0 && teamStore.fetchTeams(),
		]);

		if (to.path === Routes.FIXTURES && seasonStore.selectedSeason) {
			const matchStore = useMatchStore();
			const rosterStore = useRosterStore();
			await Promise.all([
				matchStore.fetchMatches(seasonStore.selectedSeason),
				matchStore.fetchNextMatchOrder(seasonStore.selectedSeason),
				rosterStore.fetchTeamDetails(seasonStore.selectedSeason),
			]);
		}
	} catch (error) {
		console.error("Failed to preload route data", error);
		ElMessage.error("Some league data could not be loaded. Please try again shortly.");
	} finally {
		pauseLoader();
	}
	return true;
});

router.afterEach((to) => {
	document.title = to.meta.title ? `CPL | ${to.meta.title}` : "CPL";
});

export default router;
