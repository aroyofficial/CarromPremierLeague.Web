import { createRouter, createWebHistory } from "vue-router";
import Home from "@/views/Home.vue";
import Fixtures from "@/views/Fixtures.vue";
import Teams from "@/views/Teams.vue";
import PointsTable from "@/views/PointsTable.vue";
import Players from "@/views/Players.vue";
import NotFound from "@/views/NotFound.vue";
import { Routes } from "../utils/constants";

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

router.afterEach((to) => {
	document.title = to.meta.title ? `CPL | ${to.meta.title}` : "CPL";
});

export default router;
