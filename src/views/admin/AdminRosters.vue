<template>
	<div>
		<div class="admin-page-head">
			<div>
				<h1>Rosters</h1>
				<p>Assign players to a team for a season. Assigning a player who is already on a team moves them.</p>
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
					<el-select v-model="assignForm.player_id" filterable placeholder="Player" style="width: 260px">
						<el-option
							v-for="player in players"
							:key="player.id"
							:label="playerLabel(player)"
							:value="player.id"
						/>
					</el-select>
					<el-select v-model="assignForm.team_id" placeholder="Team" style="width: 240px">
						<el-option v-for="team in seasonTeams" :key="team.team_id" :label="team.team_name" :value="team.team_id" />
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
						<span>{{ team.team_name }}</span>
						<el-tag size="small">{{ team.players.length }} players</el-tag>
					</h2>
					<el-empty v-if="!team.players.length" :image-size="60" description="No players assigned" />
					<ul v-else class="roster-list">
						<li v-for="player in team.players" :key="player.player_id">
							<span>{{ player.first_name }} {{ player.last_name }}</span>
							<el-button v-if="canManage" size="small" type="danger" link @click="removePlayer(player, team)">
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
import { computed, onMounted, reactive, ref } from "vue";
import { Plus } from "@element-plus/icons-vue";
import { adminApi } from "@/services/adminService";
import { confirmDelete, defaultSeasonId, runAction, unwrap } from "@/utils/adminHelpers";
import { usePermissions } from "@/utils/permissions";

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
}
</style>
