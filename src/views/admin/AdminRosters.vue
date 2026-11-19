<template>
	<div>
		<div class="admin-page-head">
			<div>
				<h1>Rosters</h1>
				<p>Each team has two places. Assigning a player who is already on a team moves them.</p>
			</div>
			<div class="admin-toolbar">
				<el-select v-model="seasonId" placeholder="Choose a season" style="width: 240px" @change="loadSeason">
					<el-option v-for="season in seasons" :key="season.id" :label="season.name" :value="season.id" />
				</el-select>
			</div>
		</div>

		<el-empty v-if="!seasonId" description="Choose a season to manage its rosters" />

		<template v-else>
			<div v-if="canManage" class="admin-card">
				<h2 class="admin-card-title">Assign a player</h2>
				<el-alert
					v-if="!seasonTeams.length && !loading"
					type="warning"
					:closable="false"
					show-icon
					title="This season has no teams yet. Add teams from the Seasons page first."
					class="mb-3"
				/>
				<div class="admin-toolbar">
					<el-select v-model="assignForm.player_id" filterable placeholder="Player" style="width: 300px">
						<template v-if="selectedPlayer" #label>
							<span class="pick">
								<EntityImage :src="selectedPlayer.avatar_url || ''" :name="playerName(selectedPlayer)" kind="player" class="pick-photo" />
								<span>{{ playerLabel(selectedPlayer) }}</span>
							</span>
						</template>
						<el-option
							v-for="player in players"
							:key="player.id"
							class="pick-option"
							:label="playerLabel(player)"
							:value="player.id"
						>
							<span class="pick">
								<EntityImage :src="player.avatar_url || ''" :name="playerName(player)" kind="player" class="pick-photo" />
								<span>{{ playerLabel(player) }}</span>
							</span>
						</el-option>
					</el-select>
					<el-select v-model="assignForm.team_id" placeholder="Team" style="width: 280px">
						<template v-if="selectedTeam" #label>
							<span class="pick">
								<EntityImage :src="selectedTeam.logo_url || ''" :name="selectedTeam.team_name" kind="team" class="pick-photo" />
								<span>{{ selectedTeam.team_name }}</span>
							</span>
						</template>
						<el-option
							v-for="team in openTeams"
							:key="team.team_id"
							class="pick-option"
							:label="team.team_name"
							:value="team.team_id"
						>
							<span class="pick">
								<EntityImage :src="team.logo_url || ''" :name="team.team_name" kind="team" class="pick-photo" />
								<span>{{ team.team_name }}</span>
							</span>
						</el-option>
					</el-select>
					<el-button
						type="primary"
						:disabled="!assignForm.player_id || !assignForm.team_id"
						:loading="saving"
						@click="assign"
					>
						<el-icon class="me-1"><Plus /></el-icon>Assign
					</el-button>
				</div>
			</div>

			<div class="roster-grid" v-loading="loading">
				<div v-for="team in rosterByTeam" :key="team.team_id" class="admin-card roster-card">
					<h2 class="admin-card-title">
						<span class="roster-team">
							<EntityImage :src="team.logo_url || ''" :name="team.team_name" kind="team" class="roster-logo" />
							<span>{{ team.team_name }}</span>
						</span>
					</h2>
					<ul class="roster-list">
						<li v-for="(player, index) in slotsFor(team)" :key="player ? player.player_id : `tbd-${team.team_id}-${index}`">
							<span class="roster-player" :class="{ 'is-open': !player }">
								<EntityImage
									v-if="player"
									:src="avatarFor(player)"
									:name="playerName(player)"
									kind="player"
									class="roster-avatar"
								/>
								<span v-else class="roster-avatar is-open" aria-hidden="true"></span>
								<span>{{ player ? playerName(player) : "TBD" }}</span>
							</span>
							<el-button v-if="player && canManage" size="small" type="danger" link @click="removePlayer(player, team)">
								Remove
							</el-button>
						</li>
					</ul>
				</div>
			</div>
		</template>
	</div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { Plus } from "@element-plus/icons-vue";
import EntityImage from "@/components/EntityImage.vue";
import { adminApi } from "@/services/adminService";
import { confirmDelete, defaultSeasonId, runAction, unwrap } from "@/utils/adminHelpers";
import { playerName } from "@/utils/media";
import { usePermissions } from "@/utils/permissions";
import { areas } from "@/utils/realtimeRules";
import { useAdminLive } from "@/utils/useLive";

const { Permission, can } = usePermissions();
const canManage = computed(() => can(Permission.ROSTERS_MANAGE));

const seasons = ref([]);
const players = ref([]);
const seasonId = ref(null);
const seasonTeams = ref([]);
const rosters = ref([]);
const loading = ref(false);
const saving = ref(false);
const assignForm = reactive({ player_id: null, team_id: null });

const assignedTeam = computed(() => new Map(rosters.value.map((item) => [item.player_id, item.team_name])));
const playerById = computed(() => new Map(players.value.map((player) => [player.id, player])));
const selectedPlayer = computed(() => playerById.value.get(assignForm.player_id) || null);
const selectedTeam = computed(() => seasonTeams.value.find((team) => team.team_id === assignForm.team_id) || null);

const avatarFor = (member) => playerById.value.get(member.player_id)?.avatar_url || "";

const playerLabel = (player) => {
	const name = `${player.first_name} ${player.last_name}`;
	const team = assignedTeam.value.get(player.id);
	return team ? `${name} (currently ${team})` : name;
};

const rosterByTeam = computed(() => {
	const groups = new Map(seasonTeams.value.map((team) => [team.team_id, { ...team, players: [] }]));
	rosters.value.forEach((item) => {
		if (!groups.has(item.team_id)) groups.set(item.team_id, { team_id: item.team_id, team_name: item.team_name, players: [] });
		groups.get(item.team_id).players.push(item);
	});
	return [...groups.values()];
});

const TEAM_PLACES = 2;

const slotsFor = (team) => {
	const slots = [...team.players];
	while (slots.length < TEAM_PLACES) slots.push(null);
	return slots;
};

const teamHasRoom = (teamId, playerId) => {
	const team = rosterByTeam.value.find((item) => item.team_id === teamId);
	const members = team?.players || [];
	if (members.length < TEAM_PLACES) return true;
	return Boolean(playerId) && members.some((member) => member.player_id === playerId);
};

const openTeams = computed(() => seasonTeams.value.filter((team) => teamHasRoom(team.team_id, assignForm.player_id)));

watch(
	() => openTeams.value.map((team) => team.team_id).join(","),
	() => {
		if (assignForm.team_id && !openTeams.value.some((team) => team.team_id === assignForm.team_id)) {
			assignForm.team_id = null;
		}
	},
);

const loadSeason = async () => {
	if (!seasonId.value) return;
	loading.value = true;
	assignForm.team_id = null;
	const { ok, result } = await runAction(() =>
		Promise.all([adminApi.seasons.teams(seasonId.value), adminApi.rosters.season(seasonId.value)]),
	);
	if (ok) {
		seasonTeams.value = unwrap(result[0]) || [];
		rosters.value = unwrap(result[1])?.rosters || [];
	}
	loading.value = false;
};

const assign = async () => {
	saving.value = true;
	const { ok } = await runAction(
		() => adminApi.rosters.assign({ season_id: seasonId.value, ...assignForm }),
		"Player assigned",
	);
	saving.value = false;
	if (ok) {
		assignForm.player_id = null;
		await loadSeason();
	}
};

const removePlayer = async (player, team) => {
	if (!(await confirmDelete(`${player.first_name} ${player.last_name} from ${team.team_name}`))) return;
	const { ok } = await runAction(
		() => adminApi.rosters.remove({ season_id: seasonId.value, player_id: player.player_id }),
		"Player removed from roster",
	);
	if (ok) await loadSeason();
};

useAdminLive(
	async () => {
		if (loading.value || saving.value) return;
		try {
			const [seasonList, playerList] = await Promise.all([adminApi.seasons.list(), adminApi.players.list()]);
			seasons.value = unwrap(seasonList) || [];
			players.value = unwrap(playerList) || [];
			const shown = seasonId.value;
			if (!shown) return;
			const [teamList, rosterList] = await Promise.all([adminApi.seasons.teams(shown), adminApi.rosters.season(shown)]);
			if (shown !== seasonId.value) return;
			seasonTeams.value = unwrap(teamList) || [];
			rosters.value = unwrap(rosterList)?.rosters || [];
		} catch (error) {
			console.error("Failed to refresh rosters", error);
		}
	},
	{ areas: areas.adminRosters },
);

onMounted(async () => {
	const { ok, result } = await runAction(() => Promise.all([adminApi.seasons.list(), adminApi.players.list()]));
	if (!ok) return;
	seasons.value = unwrap(result[0]) || [];
	players.value = unwrap(result[1]) || [];
	if (seasons.value.length) {
		seasonId.value = defaultSeasonId(seasons.value);
		await loadSeason();
	}
});
</script>

<style scoped lang="scss">
.roster-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
	gap: 16px;
	margin-top: 16px;
}

.roster-card {
	margin-top: 0 !important;
}

.roster-team,
.roster-player,
.pick {
	display: flex;
	align-items: center;
	gap: 8px;
	min-width: 0;
}

.pick {
	display: inline-flex;
	max-width: 100%;

	span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
}

.roster-logo,
.roster-avatar,
.pick-photo {
	width: 28px;
	height: 28px;
	border-radius: 50%;
	flex: 0 0 auto;
}

.roster-logo {
	width: 40px;
	height: 40px;
}

.roster-avatar.is-open {
	display: inline-block;
	box-sizing: border-box;
	border: 1px dashed var(--cpl-line);
	background: transparent;
}

.pick-option {
	height: auto;
	min-height: 40px;
	line-height: 1.2;
	padding-top: 6px;
	padding-bottom: 6px;
}

.roster-list {
	list-style: none;
	margin: 0;
	padding: 0;

	li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 0;
		border-bottom: 1px solid var(--cpl-line);
		font-size: 14px;

		&:last-child {
			border-bottom: none;
		}
	}

	.is-open {
		color: var(--cpl-ink-600);
	}
}
</style>
