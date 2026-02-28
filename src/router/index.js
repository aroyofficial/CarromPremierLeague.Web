import { createRouter, createWebHistory } from "vue-router";
import Home from "@/views/Home.vue";
import Fixtures from "@/views/Fixtures.vue";
import Teams from "@/views/Teams.vue";
import PointsTable from "@/views/PointsTable.vue";
import Players from "@/views/Players.vue";
import Stats from "@/views/Stats.vue";
import NotFound from "@/views/NotFound.vue";
import { Routes } from "../utils/constants";
import { useSeasonStore } from "@/store/seasonStore";
import { useTeamStore } from "@/store/teamStore";
import { useMatchStore } from "@/store/matchStore";
import { useRosterStore } from "@/store/rosterStore";
import { startLoader, pauseLoader } from "../utils/common";

const routes = [
	{
		path: Routes.HOME,
		name: "home",
		component: Home,
		meta: { title: "Home" },
	},
	{
		path: Routes.POINTS_TABLE,
		name: "points-table",
		component: PointsTable,
		meta: { title: "Points Table" },
	},
	{
		path: Routes.TEAMS,
		name: "teams",
		component: Teams,
		meta: { title: "Teams" },
	},
	{
		path: Routes.PLAYERS,
		name: "players",
		component: Players,
		meta: { title: "Players" },
	},
	{
		path: Routes.STATS,
		name: "stats",
		component: Stats,
		meta: { title: "Stats" },
	},
	{
		path: Routes.FIXTURES,
		name: "fixtures",
		component: Fixtures,
		meta: { title: "Fixtures" },
	},
	{
		path: Routes.NOT_FOUND,
		name: "not-found",
		component: NotFound,
	},
];

const router = createRouter({
	history: createWebHistory(),
	routes,
	scrollBehavior() {
		return { top: 0 };
	},
});

router.beforeEach(async (to, from, next) => {
	if (to.matched.length === 0) {
		next({ name: "not-found" });
	} else {
		startLoader();
		const seasonStore = useSeasonStore();
		const teamStore = useTeamStore();
		const matchStore = useMatchStore();
		const rosterStore = useRosterStore();

		seasonStore.seasons.length === 0 && (await seasonStore.fetchSeasons());
		teamStore.teams.length === 0 && (await teamStore.fetchTeams());

		if (to.path === Routes.FIXTURES) {
			await matchStore.fetchMatches(seasonStore.selectedSeason);
			await matchStore.fetchNextMatchOrder(seasonStore.selectedSeason);
			await rosterStore.fetchTeamDetails(seasonStore.selectedSeason);
		}

		pauseLoader();
		next();
	}
});

router.afterEach((to) => {
	document.title = to.meta.title ? `CPL | ${to.meta.title}` : "CPL";
});

export default router;
