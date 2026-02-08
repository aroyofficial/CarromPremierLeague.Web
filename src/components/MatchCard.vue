<template>
	<div>
		<div
			class="row align-items-center border p-4 match-card"
			:class="{
				'golden-glow':
					match.category === MatchCategory.find((mc) => mc.name === 'Final').id,
			}"
			@click="openMatchManagementDialog()"
		>
			<div class="col-1">
				<img :src="getTeam(match.team1).logo_url" class="fixtures-team-logo" />
			</div>
			<div class="col-3-5 fixture-team-name ps-4">
				{{ getTeam(match.team1).name }}
			</div>
			<div
				class="col-3 d-flex justify-content-center align-items-center flex-column"
			>
				<div class="versus-text">Match {{ match.order }}</div>
				<div
					class="toss-text"
					v-if="match.toss_outcome !== TossOutcome.NotDecided"
				>
					{{
						getTeam(
							match.toss_outcome === TossOutcome.Team1Won
								? match.team1
								: match.team2,
						).name
					}}
					won the toss
				</div>
				<div class="match-status-text text-center">
					{{ getStatusText() }}
				</div>
			</div>
			<div class="col-3-5 d-flex justify-content-end fixture-team-name pe-4">
				{{ getTeam(match.team2).name }}
			</div>
			<div class="col-1 d-flex justify-content-end">
				<img :src="getTeam(match.team2).logo_url" class="fixtures-team-logo" />
			</div>
		</div>
		<el-dialog
			title="Match Info"
			v-model="showMatchManagementDialog"
			:close-on-click-modal="false"
			:close-on-press-escape="false"
			:show-close="false"
			align-center
		>
			<div
				class="dialog-body match-manager my-4"
				:class="{
					'golden-glow':
						match.category ===
						MatchCategory.find((mc) => mc.name === 'Final').id,
				}"
			>
				<div class="row d-flex">
					<div class="col-4 d-flex align-items-center flex-column">
						<div class="mb-2">
							<img :src="getTeam(match.team1).logo_url" class="team-logo" />
						</div>
						<div
							class="team-members d-flex flex-column gap-2 border p-3 rounded"
						>
							<div
								class="d-flex align-items-center"
								v-for="item in getTeamMembers(match.team1)"
								:key="item.player_id"
							>
								<div>
									<img :src="item.avatar_url" class="player-avatar border" />
								</div>
								<div>{{ item.first_name }} {{ item.last_name }}</div>
							</div>
						</div>
					</div>
					<div
						class="col-4 d-flex flex-column justify-content-center align-items-center"
					>
						<div>Head To Head Wins</div>
						<div class="mb-2">
							<b>{{ stats.team1_wins }} - {{ stats.team2_wins }}</b>
						</div>
						<div>Net Points Difference</div>
						<div class="mb-2">
							<b>{{ stats.team1_net_points }} - {{ stats.team2_net_points }}</b>
						</div>
						<div>Match {{ match.order }}</div>
						<div
							class="border-bottom"
							v-if="match.toss_outcome !== TossOutcome.NotDecided"
						>
							{{
								getTeam(
									match.toss_outcome === TossOutcome.Team1Won
										? match.team1
										: match.team2,
								).name
							}}
							won the toss
						</div>
						<div>{{ getStatusText() }}</div>
					</div>
					<div class="col-4 d-flex align-items-center flex-column">
						<div class="mb-2">
							<img :src="getTeam(match.team2).logo_url" class="team-logo" />
						</div>
						<div
							class="team-members d-flex flex-column gap-2 border p-3 rounded"
						>
							<div
								class="d-flex align-items-center"
								v-for="item in getTeamMembers(match.team2)"
								:key="item.player_id"
							>
								<div>
									<img :src="item.avatar_url" class="player-avatar border" />
								</div>
								<div>{{ item.first_name }} {{ item.last_name }}</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			<template #footer>
				<div class="dialog-footer">
					<el-button @click="hideMatchManagementDialog()">Cancel</el-button>
					<el-button
						v-if="showStartBtn()"
						type="primary"
						:disabled="!dayjs(match.scheduled_date).isSame(dayjs(), 'day')"
					>
						Start
						<el-icon>
							<ArrowRight />
						</el-icon>
					</el-button>
				</div>
			</template>
		</el-dialog>
	</div>
</template>

<script setup>
import { ref, onUpdated, onMounted } from "vue";
import { useTeamStore } from "@/store/teamStore";
import { useStatsStore } from "../store/statsStore";
import { useRosterStore } from "../store/rosterStore";
import {
	MatchStatus,
	MatchOutcome,
	MatchCategory,
	TossOutcome,
} from "../utils/constants";
import dayjs from "@/plugins/dayjs";
import { ArrowRight } from "@element-plus/icons-vue";
import { playBgm, pauseBgm } from "@/utils/common";
import { startLoader, pauseLoader } from "../utils/common";

const props = defineProps({
	match: Object,
});

const teamStore = useTeamStore();
const statsStore = useStatsStore();
const rosterStore = useRosterStore();
const showMatchManagementDialog = ref(false);
const stats = ref({});
const teamDetails = ref([]);

const getTeam = (teamId) => {
	return teamStore.teams.find((team) => team.id === teamId);
};

const getStatusText = () => {
	const status = MatchStatus.find((status) => status.id === props.match.status);
	switch (status.id) {
		case 1:
			return `${dayjs(props.match.scheduled_date).format("ddd MMM DD YYYY")}`;
		case 2:
			return `Ongoing`;
		case 3:
			let winnerTeamId = null;
			let winningFactor = null;
			if (props.match.golden_strike) {
				winningFactor = "Golden Strike";
			} else {
				winningFactor = `${props.match.net_points} pts`;
			}
			switch (props.match.outcome) {
				case MatchOutcome.Team1Won:
					winnerTeamId = props.match.team1;
					break;
				case MatchOutcome.Team2Won:
					winnerTeamId = props.match.team2;
					break;
			}
			getTeam(winnerTeamId).name;
			return `${getTeam(winnerTeamId).name} won by ${winningFactor}`;
	}
};

const openMatchManagementDialog = async () => {
	startLoader();
	await statsStore.fetchHeadToHead(props.match.team1, props.match.team2);
	const key =
		props.match.team1 < props.match.team2
			? `${props.match.team1}-${props.match.team2}`
			: `${props.match.team2}-${props.match.team1}`;
	stats.value = statsStore.stats.get(key);
	showMatchManagementDialog.value = true;
	pauseLoader();
	playBgm();
};

const hideMatchManagementDialog = () => {
	showMatchManagementDialog.value = false;
	pauseBgm();
};

const showStartBtn = () => {
	let isScheduled =
		props.match.status ===
		MatchStatus.find((status) => status.name === "Scheduled").id;
	return isScheduled;
};

const getTeamMembers = (teamId) => {
	return teamDetails.value.find((td) => td.team_id === teamId)?.players;
};

onUpdated(async () => {
	teamDetails.value = rosterStore.teams
		.get(props.match.season_id)
		?.filter(
			(t) => t.team_id === props.match.team1 || t.team_id === props.match.team2,
		);
});
</script>

<style scoped lang="scss">
.match-card {
	border-radius: 10px;
	transition: all 0.3s ease;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.match-card:hover {
	cursor: pointer;
	box-shadow: 0 12px 28px rgba(0, 0, 0, 0.15);
}

.fixtures-team-logo {
	width: 60px;
	height: 60px;
	border-radius: 50%;
}

.versus-text,
.toss-text,
.match-status-text {
	font-size: 12px;
}

.fixture-team-name {
	font-size: 15px;
}

.match-manager .team-logo {
	width: 200px;
	height: 200px;
	border-radius: 50%;
}

.golden-glow {
	background: radial-gradient(
		circle at center,
		rgba(255, 223, 0, 0.6) 0%,
		rgba(255, 200, 0, 0.4) 30%,
		rgba(255, 165, 0, 0.2) 60%,
		transparent 100%
	);
}

.player-avatar {
	height: 30px;
	width: 30px;
	border-radius: 50%;
	margin-right: 10px;
}

.team-members {
	box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.1);
	transition: all 0.25s ease;
}

.team-members:hover {
	cursor: pointer;
	box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.2);
}
</style>
