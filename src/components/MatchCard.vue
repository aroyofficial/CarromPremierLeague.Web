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
			<div class="dialog-body match-manager my-4">
				<div class="row d-flex">
					<div class="col-4 d-flex justify-content-center">
						<img :src="getTeam(match.team1).logo_url" class="team-logo" />
					</div>
					<div
						class="col-4 d-flex flex-column justify-content-center align-items-center"
					>
						<div>Head To Head</div>
						<div class="mb-2"><b>12 - 8</b></div>
						<div>Total Potted Coins</div>
						<div class="mb-2"><b>8 - 9</b></div>
						<div>{{ getStatusText() }}</div>
					</div>
					<div class="col-4 d-flex justify-content-center">
						<img :src="getTeam(match.team2).logo_url" class="team-logo" />
					</div>
				</div>
			</div>
			<template #footer>
				<div class="dialog-footer">
					<el-button @click="hideMatchManagementDialog()">Cancel</el-button>
					<el-button v-if="showStartBtn()" type="primary">
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
import { ref, onMounted } from "vue";
import { useTeamStore } from "@/store/teamStore";
import { MatchStatus, MatchOutcome, MatchCategory } from "../utils/constants";
import dayjs from "@/plugins/dayjs";
import { ArrowRight } from "@element-plus/icons-vue";
import { playBgm, pauseBgm } from "@/utils/common";

const props = defineProps({
	match: Object,
});

const teamStore = useTeamStore();
const showMatchManagementDialog = ref(false);

const getTeam = (teamId) => {
	return teamStore.teams.find((team) => team.id === teamId);
};
const matchOutcome = ref(MatchOutcome);

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

const openMatchManagementDialog = () => {
	showMatchManagementDialog.value = true;
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

onMounted(async () => {});
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
</style>
