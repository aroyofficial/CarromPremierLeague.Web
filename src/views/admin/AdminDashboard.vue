<template>
	<div>
		<div class="admin-page-head">
			<div>
				<h1>Admin Overview</h1>
				<p>
					Manage every part of the league from one place.
					<template v-if="currentSeason">Season figures are for {{ currentSeason.name }}.</template>
				</p>
			</div>
			<el-button :loading="loading" @click="load">
				<el-icon class="me-1"><Refresh /></el-icon>Refresh
			</el-button>
		</div>

		<div v-if="authStore.profileLoaded && !cards.length" class="admin-card no-access">
			<h2>No sections yet</h2>
			<p>Your account has no permissions. Ask an admin who can manage permissions to give you access.</p>
		</div>

		<div class="dash-grid" v-loading="loading">
			<router-link v-for="card in cards" :key="card.name" :to="{ name: card.name }" class="dash-card">
				<span class="dash-label">{{ card.label }}</span>
				<span class="dash-value">{{ card.value ?? "–" }}</span>
				<span class="dash-hint">{{ card.hint }}</span>
			</router-link>
		</div>
	</div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { Refresh } from "@element-plus/icons-vue";
import { adminApi } from "@/services/adminService";
import { defaultSeasonId, unwrap } from "@/utils/adminHelpers";
import { AdminSections, Permission } from "@/utils/constants";
import { useAuthStore } from "@/store/authStore";

const authStore = useAuthStore();

const loading = ref(false);
const currentSeason = ref(null);
const counts = reactive({
	seasons: null,
	teams: null,
	players: null,
	countries: null,
	admins: null,
	rostered: null,
	matches: null,
});

const sectionAllowed = (name) => {
	const section = AdminSections.find((item) => item.name === name);
	return Boolean(section) && (!section.permissions.length || authStore.canAny(section.permissions));
};

const cards = computed(() =>
	[
		{ name: "admin-seasons", label: "Seasons", value: counts.seasons, hint: "Create seasons and pick participating teams" },
		{ name: "admin-teams", label: "Teams", value: counts.teams, hint: "Names, slogans and logos" },
		{ name: "admin-players", label: "Players", value: counts.players, hint: "Player profiles and nationality" },
		{ name: "admin-rosters", label: "Rostered players", value: counts.rostered, hint: "Assign players to teams per season" },
		{ name: "admin-matches", label: "Matches", value: counts.matches, hint: "Fixtures, results and scorecards" },
		{ name: "admin-countries", label: "Countries", value: counts.countries, hint: "Nationality reference data" },
		{ name: "admin-users", label: "Users", value: counts.admins, hint: "Who can sign in to this console" },
		{ name: "admin-permissions", label: "Permissions", value: null, hint: "What each admin user can do" },
		{ name: "admin-settings", label: "Settings", value: null, hint: "Match clock and Queen rules" },
	].filter((card) => sectionAllowed(card.name)),
);

const lengthOf = (outcome) => (outcome.status === "fulfilled" ? (unwrap(outcome.value) || []).length : null);

const load = async () => {
	loading.value = true;
	const settled = await Promise.allSettled([
		adminApi.seasons.list(),
		adminApi.teams.list(),
		adminApi.players.list(),
		adminApi.countries.list(),
		authStore.canAny([Permission.ADMINS_VIEW, Permission.PERMISSIONS_MANAGE])
			? adminApi.admins.list()
			: Promise.reject(new Error("not permitted")),
	]);
	["seasons", "teams", "players", "countries", "admins"].forEach((key, index) => {
		counts[key] = lengthOf(settled[index]);
	});

	const seasons = settled[0].status === "fulfilled" ? unwrap(settled[0].value) || [] : [];
	const seasonId = defaultSeasonId(seasons);
	currentSeason.value = seasons.find((season) => season.id === seasonId) || null;
	if (seasonId) {
		const [roster, matches] = await Promise.allSettled([
			adminApi.rosters.season(seasonId),
			adminApi.matches.list(seasonId),
		]);
		counts.rostered = roster.status === "fulfilled" ? (unwrap(roster.value)?.rosters || []).length : null;
		counts.matches = lengthOf(matches);
	} else {
		counts.rostered = null;
		counts.matches = null;
	}
	loading.value = false;
};

onMounted(async () => {
	await authStore.loadProfile().catch(() => undefined);
	load();
});
</script>

<style scoped lang="scss">
.dash-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
	gap: 16px;
}

.dash-card {
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 18px;
	border-radius: var(--cpl-radius-md);
	background: #fff;
	border: 1px solid var(--cpl-line);
	box-shadow: var(--cpl-shadow-card);
	text-decoration: none;
	color: var(--cpl-ink-900);
	transition: transform 0.2s ease, border-color 0.2s ease;

	&:hover {
		transform: translateY(-2px);
		border-color: var(--cpl-gold-500);
	}
}

.dash-label {
	font-size: 13px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color: var(--cpl-ink-600);
}

.dash-value {
	font-family: var(--cpl-font-display);
	font-size: 32px;
	font-weight: 800;
}

.dash-hint {
	font-size: 13px;
	color: var(--cpl-ink-400);
}

.no-access {
	margin-bottom: 16px;

	h2 {
		margin: 0 0 4px;
		font-size: 17px;
		font-weight: 700;
	}

	p {
		margin: 0;
		color: var(--cpl-ink-600);
	}
}
</style>
