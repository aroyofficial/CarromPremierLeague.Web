<template>
	<div class="overview" v-loading="loading && !loaded">
		<div class="admin-page-head">
			<div>
				<h1>{{ greeting }}</h1>
				<p>{{ todayLabel }}</p>
			</div>
			<el-button :loading="loading" @click="load">
				<el-icon class="me-1"><Refresh /></el-icon>Refresh
			</el-button>
		</div>

		<section class="admin-card season-card" :class="`is-${phase.key}`">
			<div class="season-main">
				<span class="season-chip">{{ phase.label }}</span>
				<h2>{{ season ? season.name : "No season yet" }}</h2>
				<p v-if="season" class="season-dates">
					{{ dateLabel(season.start_date) }} to {{ dateLabel(season.end_date) }}
					<template v-if="phase.detail"> · {{ phase.detail }}</template>
				</p>
				<p v-else class="season-dates">Create a season to start the league.</p>
			</div>
			<div v-if="season && summary.total" class="season-progress">
				<div class="progress-figures">
					<strong>{{ summary.played }}</strong>
					<span>of {{ summary.total }} matches played</span>
				</div>
				<div class="progress-track" role="progressbar" :aria-valuenow="summary.played" aria-valuemin="0" :aria-valuemax="summary.total">
					<span :style="{ width: `${Math.round((summary.played / summary.total) * 100)}%` }" />
				</div>
			</div>
		</section>

		<div class="overview-grid">
			<section v-if="season && summary.total" class="admin-card panel">
				<header class="panel-head">
					<h3>Match day</h3>
					<router-link v-if="canOpen('admin-matches')" :to="{ name: 'admin-matches' }" class="panel-link">All matches</router-link>
				</header>
				<ul v-if="summary.today.length || summary.live.length" class="match-list">
					<li v-for="match in dayMatches" :key="match.id">
						<span class="match-order">#{{ match.order }}</span>
						<span class="match-teams">{{ teamName(match.team1) }} <em>vs</em> {{ teamName(match.team2) }}</span>
						<span class="match-state" :class="{ 'is-live': match.status === 2 }">{{ match.status === 2 ? "Live" : "Today" }}</span>
					</li>
				</ul>
				<p v-else-if="summary.nextDate" class="panel-empty">
					No matches today. Next: {{ plural(summary.nextCount, "match", "matches") }} on {{ dateLabel(summary.nextDate) }}.
				</p>
				<p v-else class="panel-empty">No more matches are scheduled this season.</p>
			</section>

			<section v-if="hasTools" class="admin-card panel">
				<header class="panel-head">
					<h3>Needs your attention</h3>
					<span v-if="tasks.length" class="panel-count">{{ tasks.length }}</span>
				</header>
				<ul v-if="tasks.length" class="task-list">
					<li v-for="task in tasks" :key="task.id" class="task" :class="`tone-${task.tone}`">
						<div>
							<strong>{{ task.title }}</strong>
							<p>{{ task.detail }}</p>
						</div>
						<router-link v-if="canOpen(task.to)" :to="{ name: task.to }" class="task-action">{{ task.action }}</router-link>
					</li>
				</ul>
				<p v-else-if="loaded" class="panel-empty all-clear">
					<el-icon><CircleCheckFilled /></el-icon>Nothing is waiting on you right now.
				</p>
			</section>
		</div>

		<section v-if="tools.length" class="tools">
			<h3>Your tools</h3>
			<div class="tool-grid">
				<router-link v-for="tool in tools" :key="tool.name" :to="{ name: tool.name }" class="tool">
					<el-icon class="tool-icon"><component :is="icons[tool.icon]" /></el-icon>
					<span class="tool-text">
						<strong>{{ tool.label }}</strong>
						<span>{{ toolHints[tool.name] }}</span>
					</span>
				</router-link>
			</div>
		</section>

		<div v-else-if="authStore.profileLoaded" class="admin-card no-access">
			<h2>No league tools yet</h2>
			<p>Your account has no permissions for the league tools. Ask a league admin for access. You can still update your own profile.</p>
			<router-link :to="{ name: 'admin-profile' }" class="profile-link">Open your profile</router-link>
		</div>
	</div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import {
	Calendar,
	CircleCheckFilled,
	Connection,
	Flag,
	Lock,
	Picture,
	Refresh,
	Setting,
	Trophy,
	User,
	UserFilled,
} from "@element-plus/icons-vue";
import dayjs from "@/plugins/dayjs";
import { adminApi } from "@/services/adminService";
import { defaultSeasonId, unwrap } from "@/utils/adminHelpers";
import { AdminSections, Permission } from "@/utils/constants";
import { matchSummary, overviewTasks, seasonPhase } from "@/utils/overview";
import { useAuthStore } from "@/store/authStore";
import { areas } from "@/utils/realtimeRules";
import { settlePageLoader } from "@/utils/common";
import { useAdminLive } from "@/utils/useLive";

const authStore = useAuthStore();
const icons = { Calendar, Connection, Flag, Lock, Picture, Setting, Trophy, User, UserFilled };

const toolHints = {
	"admin-seasons": "Dates, teams and schedule",
	"admin-teams": "Names, slogans and logos",
	"admin-players": "Player profiles",
	"admin-gallery": "Photos and season covers",
	"admin-rosters": "Players for each team",
	"admin-matches": "Results and scorecards",
	"admin-users": "Who can sign in",
	"admin-permissions": "What each admin can do",
	"admin-settings": "Rules, webhooks and API keys",
};

const loading = ref(false);
const loaded = ref(false);
const season = ref(null);
const seasonTeams = ref([]);
const rosters = ref([]);
const matches = ref([]);
const drafts = ref({ count: 0, more: false });
const admins = ref([]);
const today = ref(dayjs.tz().format("YYYY-MM-DD"));

const canOpen = (name) => {
	const section = AdminSections.find((item) => item.name === name);
	return Boolean(section) && (!section.permissions.length || authStore.canAny(section.permissions));
};

const can = computed(() => ({
	seasonTeams: authStore.canAny([Permission.SEASONS_TEAMS]),
	schedule: authStore.canAny([Permission.MATCHES_CREATE]),
	rosters: authStore.canAny([Permission.ROSTERS_MANAGE]),
	runMatches: authStore.canAny([Permission.MATCHES_UPDATE, Permission.MATCHES_SCORECARD]),
	publishGallery: authStore.canAny([Permission.GALLERY_PUBLISH]),
	viewAdmins: authStore.canAny([Permission.ADMINS_VIEW]),
}));

const tools = computed(() => AdminSections.filter((section) => section.name in toolHints && canOpen(section.name)));
const hasTools = computed(() => tools.value.length > 0);

const phase = computed(() => seasonPhase(season.value, today.value));
const summary = computed(() => matchSummary(matches.value, today.value));
const dayMatches = computed(() => {
	const seen = new Set(summary.value.live.map((match) => match.id));
	return [...summary.value.live, ...summary.value.today.filter((match) => !seen.has(match.id))];
});
const tasks = computed(() =>
	overviewTasks({
		season: season.value,
		phase: phase.value,
		seasonTeams: seasonTeams.value,
		rosters: rosters.value,
		matches: matches.value,
		drafts: drafts.value,
		admins: admins.value,
		today: today.value,
		can: can.value,
	}),
);

const greeting = computed(() => {
	const hour = dayjs.tz().hour();
	const part = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
	return authStore.firstName ? `${part}, ${authStore.firstName}` : part;
});
const todayLabel = computed(() => dayjs.tz(today.value).format("dddd, D MMMM YYYY"));

const dateLabel = (value) => (value ? dayjs(String(value).slice(0, 10)).format("D MMM YYYY") : "");
const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;
const teamNames = computed(() => new Map(seasonTeams.value.map((team) => [team.team_id, team.team_name])));
const teamName = (id) => (id ? teamNames.value.get(id) || "Team" : "TBD");

const valueOf = (outcome, fallback) => (outcome.status === "fulfilled" ? unwrap(outcome.value) ?? fallback : fallback);

const load = async (options) => {
	const quiet = Boolean(options && options.quiet);
	if (quiet && loading.value) return;
	if (!quiet) loading.value = true;
	today.value = dayjs.tz().format("YYYY-MM-DD");
	const [seasonList, adminList, galleryPage] = await Promise.allSettled([
		adminApi.seasons.list(),
		can.value.viewAdmins ? adminApi.admins.list() : Promise.resolve(null),
		can.value.publishGallery ? adminApi.gallery.adminList({ status: "draft", limit: 48 }) : Promise.resolve(null),
	]);
	const seasons = valueOf(seasonList, []) || [];
	const seasonId = defaultSeasonId(seasons);
	season.value = seasons.find((item) => item.id === seasonId) || null;
	admins.value = valueOf(adminList, []) || [];
	const page = galleryPage.status === "fulfilled" ? galleryPage.value?.data : null;
	drafts.value = { count: page?.items?.length || 0, more: Boolean(page?.next_cursor) };

	if (seasonId) {
		const [teamList, rosterList, matchList] = await Promise.allSettled([
			adminApi.seasons.teams(seasonId),
			adminApi.rosters.season(seasonId),
			adminApi.matches.list(seasonId),
		]);
		seasonTeams.value = valueOf(teamList, []) || [];
		rosters.value = valueOf(rosterList, {})?.rosters || [];
		matches.value = valueOf(matchList, []) || [];
	} else {
		seasonTeams.value = [];
		rosters.value = [];
		matches.value = [];
	}
	loaded.value = true;
	if (!quiet) loading.value = false;
};

useAdminLive(() => load({ quiet: true }), { areas: areas.adminDashboard });

onMounted(() =>
	settlePageLoader(async () => {
		await authStore.loadProfile().catch(() => undefined);
		await load();
	}),
);
</script>

<style scoped lang="scss">
.overview {
	display: flex;
	flex-direction: column;
	gap: 18px;
	min-height: 200px;
}

.admin-page-head {
	margin-bottom: 0;
}

.season-card {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 20px 32px;
	border-left: 4px solid var(--cpl-ink-400);

	&.is-running {
		border-left-color: var(--cpl-success-text);
	}

	&.is-upcoming {
		border-left-color: var(--cpl-gold-500);
	}

	h2 {
		margin: 8px 0 4px;
		font-family: var(--cpl-font-display);
		font-size: 26px;
		font-weight: 800;
		color: var(--cpl-heading);
	}
}

.season-chip {
	display: inline-block;
	padding: 3px 10px;
	border-radius: 999px;
	font-size: 12px;
	font-weight: 700;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	background: var(--cpl-surface-sunken);
	color: var(--cpl-ink-600);

	.is-running & {
		background: var(--cpl-success-soft);
		color: var(--cpl-success-text);
	}

	.is-upcoming & {
		background: var(--cpl-gold-wash);
		color: var(--cpl-gold-text);
	}
}

.season-dates {
	margin: 0;
	color: var(--cpl-ink-600);
}

.season-progress {
	flex: 0 1 280px;
	min-width: 220px;
}

.progress-figures {
	display: flex;
	align-items: baseline;
	gap: 8px;
	margin-bottom: 8px;
	color: var(--cpl-ink-600);

	strong {
		font-family: var(--cpl-font-display);
		font-size: 28px;
		font-weight: 800;
		color: var(--cpl-ink-900);
	}
}

.progress-track {
	height: 8px;
	border-radius: 999px;
	background: var(--cpl-track);
	overflow: hidden;

	span {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, var(--cpl-gold-500), var(--cpl-gold-400));
	}
}

.overview-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
	gap: 18px;
	align-items: start;
}

.panel {
	margin: 0;
}

.panel-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 12px;

	h3 {
		margin: 0;
		font-size: 16px;
		font-weight: 700;
		color: var(--cpl-heading);
	}
}

.panel-link {
	font-size: 13px;
	font-weight: 700;
	color: var(--cpl-heading-soft);
}

.panel-count {
	min-width: 24px;
	padding: 2px 8px;
	border-radius: 999px;
	text-align: center;
	font-size: 12px;
	font-weight: 700;
	background: var(--cpl-warn-soft);
	color: var(--cpl-warn-text);
}

.panel-empty {
	margin: 0;
	color: var(--cpl-ink-600);
}

.all-clear {
	display: flex;
	align-items: center;
	gap: 8px;
	color: var(--cpl-success-text);
	font-weight: 600;
}

.match-list,
.task-list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.match-list li {
	display: grid;
	grid-template-columns: auto 1fr auto;
	align-items: center;
	gap: 12px;
	padding: 10px 12px;
	border-radius: var(--cpl-radius-md);
	background: var(--cpl-surface-muted);
}

.match-order {
	font-size: 12px;
	font-weight: 700;
	color: var(--cpl-ink-400);
}

.match-teams {
	font-weight: 600;
	color: var(--cpl-ink-900);

	em {
		font-style: normal;
		font-weight: 500;
		color: var(--cpl-ink-400);
		margin: 0 4px;
	}
}

.match-state {
	font-size: 12px;
	font-weight: 700;
	color: var(--cpl-info-text);

	&.is-live {
		color: var(--cpl-red-500);
	}
}

.task {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 12px 14px;
	border-radius: var(--cpl-radius-md);
	border-left: 3px solid var(--cpl-info-text);
	background: var(--cpl-info-soft);

	&.tone-warning {
		border-left-color: var(--cpl-warn-text);
		background: var(--cpl-warn-soft);
	}

	&.tone-live {
		border-left-color: var(--cpl-red-500);
		background: var(--cpl-danger-soft);
	}

	strong {
		display: block;
		font-size: 14px;
		color: var(--cpl-ink-900);
	}

	p {
		margin: 2px 0 0;
		font-size: 13px;
		color: var(--cpl-ink-600);
	}
}

.task-action {
	flex-shrink: 0;
	font-size: 13px;
	font-weight: 700;
	color: var(--cpl-heading-soft);
	white-space: nowrap;
}

.tools h3 {
	margin: 0 0 10px;
	font-size: 16px;
	font-weight: 700;
	color: var(--cpl-heading);
}

.tool-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
	gap: 10px;
}

.tool {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px 14px;
	border-radius: var(--cpl-radius-md);
	border: 1px solid var(--cpl-line);
	background: var(--cpl-surface);
	text-decoration: none;
	color: var(--cpl-ink-900);
	transition: border-color 0.2s ease, background 0.2s ease;

	&:hover,
	&:focus-visible {
		border-color: var(--cpl-gold-500);
		background: var(--cpl-surface-hover);
	}
}

.tool-icon {
	flex-shrink: 0;
	width: 36px;
	height: 36px;
	border-radius: 10px;
	font-size: 18px;
	background: var(--cpl-gold-wash);
	color: var(--cpl-gold-text);
}

.tool-text {
	display: flex;
	flex-direction: column;
	min-width: 0;

	strong {
		font-size: 14px;
	}

	span {
		font-size: 12px;
		color: var(--cpl-ink-400);
	}
}

.no-access {
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

.profile-link {
	display: inline-block;
	margin-top: 12px;
	font-weight: 700;
	color: var(--cpl-heading-soft);
}
</style>
