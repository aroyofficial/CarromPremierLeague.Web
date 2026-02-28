<template>
	<div>
		<div
			class="row align-items-center border p-4 match-card"
			:class="{
				'golden-glow':
					match.category === MatchCategory.find((mc) => mc.name === 'Final').id,
			}"
			@click="match.team1 && match.team2 && openMatchManagementDialog()"
		>
			<div class="col-1">
				<img :src="getTeamLogo(match.team1)" class="fixtures-team-logo" />
			</div>
			<div class="col-3-5 fixture-team-name ps-4">
				{{ match.team1 ? getTeam(match.team1).name : "TBD" }}
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
				{{ match.team2 ? getTeam(match.team2).name : "TBD" }}
			</div>
			<div class="col-1 d-flex justify-content-end">
				<img :src="getTeamLogo(match.team2)" class="fixtures-team-logo" />
			</div>
		</div>
		<el-dialog
			title="Match Info"
			v-model="showMatchManagementDialog"
			:close-on-click-modal="false"
			:close-on-press-escape="false"
			:show-close="false"
			:fullscreen="showMatchManager"
			align-center
		>
			<div v-if="showMatchManager" class="match-manager">
				<div id="match-live-info" class="row d-flex p-4">
					<div
						class="team-match-info col d-flex flex-column justify-content-center align-items-center"
					>
						<div>
							<img :src="getTeamLogo(match.team1)" class="match-team-logo" />
						</div>
						<div class="team-scorecard mt-3 p-3 border rounded">
							<div>
								<div
									class="mb-2 d-flex align-items-center justify-content-between"
								>
									<div style="width: 60px"></div>
									<div
										class="d-flex flex-column align-items-center justify-content-center"
										style="width: 120px"
									>
										<div>
											<img
												:src="getTeamMembers(match.team1)[0].avatar_url"
												class="player-avatar border"
											/>
										</div>
										<div>
											{{ getTeamMembers(match.team1)[0].first_name }}
											{{ getTeamMembers(match.team1)[0].last_name[0] }}
										</div>
									</div>
									<div
										class="d-flex flex-column align-items-center justify-content-center"
										style="width: 120px"
									>
										<div>
											<img
												:src="getTeamMembers(match.team1)[1].avatar_url"
												class="player-avatar border"
											/>
										</div>
										<div>
											{{ getTeamMembers(match.team1)[1].first_name }}
											{{ getTeamMembers(match.team1)[1].last_name[0] }}
										</div>
									</div>
								</div>
								<div
									class="mb-2 d-flex align-items-center justify-content-between"
								>
									<div style="width: 60px">Coins</div>
									<div>
										<el-input-number
											v-model="scorecard.team1.players[0].coins"
											size="small"
											:min="0"
											:readonly="!live"
										></el-input-number>
									</div>
									<div>
										<el-input-number
											v-model="scorecard.team1.players[1].coins"
											size="small"
											:min="0"
											:readonly="!live"
										></el-input-number>
									</div>
								</div>
								<div
									class="mb-2 d-flex align-items-center justify-content-between"
								>
									<div style="width: 60px">Fines</div>
									<div>
										<el-input-number
											v-model="scorecard.team1.players[0].fines"
											size="small"
											:min="0"
											:readonly="!live"
										></el-input-number>
									</div>
									<div>
										<el-input-number
											v-model="scorecard.team1.players[1].fines"
											size="small"
											:min="0"
											:readonly="!live"
										></el-input-number>
									</div>
								</div>
								<div
									class="mb-2 d-flex align-items-center justify-content-between"
								>
									<div style="width: 60px">Pockets</div>
									<div>
										<el-input-number
											v-model="scorecard.team1.players[0].pockets"
											size="small"
											:min="0"
											:readonly="!live"
										></el-input-number>
									</div>
									<div>
										<el-input-number
											v-model="scorecard.team1.players[1].pockets"
											size="small"
											:min="0"
											:readonly="!live"
										></el-input-number>
									</div>
								</div>
							</div>
						</div>
					</div>
					<div
						class="col d-flex flex-column gap-0 align-items-center justify-content-center"
					>
						<div class="mb-5 poppins-bold">Match {{ match.order }}</div>
						<div id="stopwatch-head-btn" class="d-flex">
							<div
								v-for="i in [1, 2, 3, 4, 5]"
								:key="i"
								class="stopwatch-head-btn-knurling"
							></div>
						</div>
						<div id="stopwatch-head-pin"></div>
						<div
							id="stopwatch"
							class="d-flex align-items-center justify-content-center"
						>
							<div v-if="timerFrozenAtZero" class="countdown-frozen">
								00:00
							</div>
							<div v-else-if="timerPaused" class="countdown-frozen">
								{{ formatDurationFromSeconds(pausedTimerSeconds) }}
							</div>
							<el-countdown
								v-else
								:key="regulationTimer"
								format="mm:ss"
								:value="regulationTimer"
								@finish="live && onEndingCountdown()"
							/>
						</div>
						<div class="mt-5 live-badge" :class="{ disabled: !live }">
							<span class="live-icon"></span>
							{{ live ? "Live" : "Starting" }}
						</div>
						<div class="mt-2">
							{{ getTossText() }}
						</div>
					</div>
					<div
						class="team-match-info col d-flex flex-column justify-content-center align-items-center"
					>
						<div>
							<img :src="getTeamLogo(match.team2)" class="match-team-logo" />
						</div>
						<div class="team-scorecard mt-3 p-3 border rounded">
							<div>
								<div
									class="mb-2 d-flex align-items-center justify-content-between"
								>
									<div style="width: 60px"></div>
									<div
										class="d-flex flex-column align-items-center justify-content-center"
										style="width: 120px"
									>
										<div>
											<img
												:src="getTeamMembers(match.team2)[0].avatar_url"
												class="player-avatar border"
											/>
										</div>
										<div>
											{{ getTeamMembers(match.team2)[0].first_name }}
											{{ getTeamMembers(match.team2)[0].last_name[0] }}
										</div>
									</div>
									<div
										class="d-flex flex-column align-items-center justify-content-center"
										style="width: 120px"
									>
										<div>
											<img
												:src="getTeamMembers(match.team2)[1].avatar_url"
												class="player-avatar border"
											/>
										</div>
										<div>
											{{ getTeamMembers(match.team2)[1].first_name }}
											{{ getTeamMembers(match.team2)[1].last_name[0] }}
										</div>
									</div>
								</div>
								<div
									class="mb-2 d-flex align-items-center justify-content-between"
								>
									<div style="width: 60px">Coins</div>
									<div>
										<el-input-number
											v-model="scorecard.team2.players[0].coins"
											size="small"
											:min="0"
											:readonly="!live"
										></el-input-number>
									</div>
									<div>
										<el-input-number
											v-model="scorecard.team2.players[1].coins"
											size="small"
											:min="0"
											:readonly="!live"
										></el-input-number>
									</div>
								</div>
								<div
									class="mb-2 d-flex align-items-center justify-content-between"
								>
									<div style="width: 60px">Fines</div>
									<div>
										<el-input-number
											v-model="scorecard.team2.players[0].fines"
											size="small"
											:min="0"
											:readonly="!live"
										></el-input-number>
									</div>
									<div>
										<el-input-number
											v-model="scorecard.team2.players[1].fines"
											size="small"
											:min="0"
											:readonly="!live"
										></el-input-number>
									</div>
								</div>
								<div
									class="mb-2 d-flex align-items-center justify-content-between"
								>
									<div style="width: 60px">Pockets</div>
									<div>
										<el-input-number
											v-model="scorecard.team2.players[0].pockets"
											size="small"
											:min="0"
											:readonly="!live"
										></el-input-number>
									</div>
									<div>
										<el-input-number
											v-model="scorecard.team2.players[1].pockets"
											size="small"
											:min="0"
											:readonly="!live"
										></el-input-number>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div
				v-else
				class="dialog-body match-info my-4"
				:class="{
					'golden-glow':
						match.category ===
						MatchCategory.find((mc) => mc.name === 'Final').id,
				}"
			>
				<div class="row d-flex">
					<div class="col-4 d-flex align-items-center flex-column">
						<div class="mb-2">
							<img :src="getTeamLogo(match.team1)" class="team-logo" />
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
							class="border-bottom text-center"
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
						<div class="text-center">{{ getStatusText() }}</div>
					</div>
					<div class="col-4 d-flex align-items-center flex-column">
						<div class="mb-2">
							<img :src="getTeamLogo(match.team2)" class="team-logo" />
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
				<div
					v-if="showMatchManager"
					class="dialog-footer"
					:class="{ 'match-started': showMatchManager }"
				>
					<el-button v-if="!lock" @click="back()" size="large" type="primary"
						>Back</el-button
					>
					<el-button
						v-if="!lock"
						@click="startMatch()"
						size="large"
						type="success"
						>Proceed</el-button
					>
					<template v-else>
						<el-button
							v-if="showSaveBtn && timerPaused"
							type="warning"
							size="large"
							@click="resumeMatch()"
							>Resume</el-button
						>
						<el-button
							v-if="showSaveBtn"
							type="primary"
							size="large"
							@click="saveMatchResult()"
							:disabled="!enableFinishBtn"
							>Save</el-button
						>
						<el-button
							v-else
							type="primary"
							size="large"
							@click="finishMatch()"
							:disabled="!enableFinishBtn"
							>Finish</el-button
						>
					</template>
				</div>
				<div v-else class="dialog-footer">
					<el-button @click="hideMatchManagementDialog()">Cancel</el-button>
					<el-button
						v-if="showStartBtn()"
						type="primary"
						:disabled="blockMatchManagement()"
						@click="scaleDialog()"
					>
						Start
						<el-icon>
							<ArrowRight />
						</el-icon>
					</el-button>
				</div>
			</template>
			<Countdown :start="showCountdown" />
		</el-dialog>
		<el-dialog
			v-model="showRegulationDecisionDialog"
			:close-on-click-modal="false"
			:close-on-press-escape="false"
			:show-close="false"
			align-center
			width="460"
		>
			<template #header>
				<div class="ms-2">Regulation Time Over</div>
			</template>
			<div class="ms-2">
				Do you want to finish the match now?
			</div>
			<template #footer>
				<el-button type="primary" @click="handleRegulationDecision(true)"
					>Yes</el-button
				>
				<el-button type="warning" @click="handleRegulationDecision(false)"
					>No, Continue Extra Time</el-button
				>
			</template>
		</el-dialog>
		<el-dialog
			v-model="showExtraDecisionDialog"
			:close-on-click-modal="false"
			:close-on-press-escape="false"
			:show-close="false"
			align-center
			width="460"
		>
			<template #header>
				<div class="ms-2">Extra Time Over</div>
			</template>
			<div class="ms-2">
				Do you want to finish the match or go for Golden Strike?
			</div>
			<template #footer>
				<el-button type="primary" @click="handleExtraDecision('finish')"
					>Finish Match</el-button
				>
				<el-button type="warning" @click="handleExtraDecision('golden')"
					>Golden Strike</el-button
				>
			</template>
		</el-dialog>
		<el-dialog
			v-model="showTossDialog"
			:close-on-click-modal="false"
			:close-on-press-escape="false"
			:show-close="false"
			align-center
			width="400"
		>
			<template #header>
				<div class="ms-2">Who won the Toss?</div>
			</template>
			<div>
				<el-radio-group v-model="matchObject.toss_outcome">
					<div class="radio-column ms-2">
						<el-radio :value="TossOutcome.Team1Won">{{
							getTeam(match.team1).name
						}}</el-radio>
						<el-radio :value="TossOutcome.Team2Won">{{
							getTeam(match.team2).name
						}}</el-radio>
					</div>
				</el-radio-group>
			</div>
			<template #footer>
				<el-button type="primary" @click="closeTossDialog()">Back</el-button>
				<el-button
					type="success"
					@click="scaleDialog()"
					:disabled="matchObject.toss_outcome == null"
					class="me-2"
				>
					Proceed
				</el-button>
			</template>
		</el-dialog>
		<el-dialog
			v-model="showGoldenStrikeDialog"
			:close-on-click-modal="false"
			:close-on-press-escape="false"
			:show-close="false"
			align-center
			width="420"
		>
			<template #header>
				<div class="ms-2">Who won the Golden Strike?</div>
			</template>
			<div>
				<el-radio-group v-model="winnerTeamId">
					<div class="radio-column ms-2">
						<el-radio :value="match.team1">{{
							getTeam(match.team1).name
						}}</el-radio>
						<el-radio :value="match.team2">{{
							getTeam(match.team2).name
						}}</el-radio>
					</div>
				</el-radio-group>
			</div>
			<template #footer>
				<el-button
					type="success"
					@click="confirmGoldenStrikeWinner()"
					:disabled="winnerTeamId == null"
					class="me-2"
				>
					Proceed
				</el-button>
			</template>
		</el-dialog>
	</div>
</template>

<script setup>
import { ref, onUpdated, watch } from "vue";
import { useSeasonStore } from "@/store/seasonStore";
import { useTeamStore } from "@/store/teamStore";
import { useMatchStore } from "@/store/matchStore";
import { useStatsStore } from "../store/statsStore";
import { useRosterStore } from "../store/rosterStore";
import {
	MatchStatus,
	MatchOutcome,
	MatchCategory,
	TossOutcome,
	BackgroundMusic,
} from "../utils/constants";
import dayjs from "@/plugins/dayjs";
import { ArrowRight } from "@element-plus/icons-vue";
import {
	startLoader,
	pauseLoader,
	resolveAsset,
	playBgm,
	pauseBgm,
	takeFullScreen,
	exitFullScreen,
} from "../utils/common";
import Countdown from "./Countdown.vue";

const props = defineProps({
	match: Object,
});

const seasonStore = useSeasonStore();
const teamStore = useTeamStore();
const matchStore = useMatchStore();
const statsStore = useStatsStore();
const rosterStore = useRosterStore();
const showMatchManagementDialog = ref(false);
const stats = ref({});
const teamDetails = ref([]);
const showMatchManager = ref(false);
const matchObject = ref({
	toss_outcome: null,
});
const lock = ref(false);
const showCountdown = ref(false);
const matchStarted = ref(false);
const regulationTimer = ref(0);
const regulationTimeExhausted = ref(false);
const extraTimeExhausted = ref(false);
const live = ref(false);
const showTossDialog = ref(false);
const showRegulationDecisionDialog = ref(false);
const showExtraDecisionDialog = ref(false);
const showGoldenStrikeDialog = ref(false);
const enableFinishBtn = ref(false);
const goldenStrikeTaken = ref(false);
const winnerTeamId = ref(null);
const timerFrozenAtZero = ref(false);
const extraTimeStarted = ref(false);
const timerPaused = ref(false);
const pausedTimerSeconds = ref(0);
const showSaveBtn = ref(false);
const startMatchTimeoutId = ref(null);
const hornStopTimeoutId = ref(null);
const regulationDurationSeconds = 15 * 60;
const extraDurationSeconds = 5 * 60;

const createInitialScorecard = () => ({
	team1: {
		netCoins: 0,
		players: [
			{
				id: null,
				coins: 0,
				fines: 0,
				pockets: 0,
			},
			{
				id: null,
				coins: 0,
				fines: 0,
				pockets: 0,
			},
		],
	},
	team2: {
		netCoins: 0,
		players: [
			{
				id: null,
				coins: 0,
				fines: 0,
				pockets: 0,
			},
			{
				id: null,
				coins: 0,
				fines: 0,
				pockets: 0,
			},
		],
	},
});

const scorecard = ref(createInitialScorecard());

watch(showMatchManager, () => {
	document.querySelector("span.el-dialog__title")?.classList.toggle("ms-4");
});

const clearMatchTimeouts = () => {
	if (startMatchTimeoutId.value) {
		clearTimeout(startMatchTimeoutId.value);
		startMatchTimeoutId.value = null;
	}
	if (hornStopTimeoutId.value) {
		clearTimeout(hornStopTimeoutId.value);
		hornStopTimeoutId.value = null;
	}
};

const resetMatchModalState = () => {
	clearMatchTimeouts();
	showMatchManager.value = false;
	showTossDialog.value = false;
	showRegulationDecisionDialog.value = false;
	showExtraDecisionDialog.value = false;
	showGoldenStrikeDialog.value = false;
	matchObject.value = {
		toss_outcome: null,
	};
	lock.value = false;
	showCountdown.value = false;
	matchStarted.value = false;
	regulationTimer.value = 0;
	timerFrozenAtZero.value = false;
	timerPaused.value = false;
	pausedTimerSeconds.value = 0;
	showSaveBtn.value = false;
	regulationTimeExhausted.value = false;
	extraTimeExhausted.value = false;
	extraTimeStarted.value = false;
	live.value = false;
	enableFinishBtn.value = false;
	goldenStrikeTaken.value = false;
	winnerTeamId.value = null;
	scorecard.value = createInitialScorecard();
	exitFullScreen();
};

watch(showMatchManagementDialog, async (open) => {
	if (open) {
		return;
	}
	resetMatchModalState();
	await Promise.all([
		pauseBgm(BackgroundMusic.Match, 300),
		pauseBgm(BackgroundMusic.Countdown, 300),
		pauseBgm(BackgroundMusic.Horn, 300),
	]);
});

const getTeam = (teamId) => {
	return teamStore.teams.find((team) => team.id === teamId);
};

const getTeamLogo = (teamId) => {
	if (
		props.match.category ===
			MatchCategory.find((mc) => mc.name === "Final").id &&
		!teamId
	) {
		return resolveAsset("public/assets/images/teams/tbd.png");
	}
	return getTeam(teamId).logo_url;
};

const blockMatchManagement = () => {
	return false;
	// return !dayjs(props.match.scheduled_date).isSame(dayjs(), 'day');
};

const getTeamNetPoints = () => {
	const team1NetPoints =
		Number(scorecard.value.team1.players[0].coins || 0) +
		Number(scorecard.value.team1.players[1].coins || 0) -
		Number(scorecard.value.team1.players[0].fines || 0) -
		Number(scorecard.value.team1.players[1].fines || 0);
	const team2NetPoints =
		Number(scorecard.value.team2.players[0].coins || 0) +
		Number(scorecard.value.team2.players[1].coins || 0) -
		Number(scorecard.value.team2.players[0].fines || 0) -
		Number(scorecard.value.team2.players[1].fines || 0);
	return {
		team1NetPoints,
		team2NetPoints,
	};
};

const getInvalidTeamNetPoints = () => {
	const { team1NetPoints, team2NetPoints } = getTeamNetPoints();
	if (team1NetPoints < 0 || team1NetPoints > 9) {
		return {
			teamName: getTeam(props.match.team1)?.name || "Team 1",
			netPoints: team1NetPoints,
		};
	}
	if (team2NetPoints < 0 || team2NetPoints > 9) {
		return {
			teamName: getTeam(props.match.team2)?.name || "Team 2",
			netPoints: team2NetPoints,
		};
	}
	return null;
};

const getInvalidGoldenStrikeState = () => {
	const { team1NetPoints, team2NetPoints } = getTeamNetPoints();
	const isTie = team1NetPoints === team2NetPoints;

	if (!goldenStrikeTaken.value && isTie) {
		return "Without Golden Strike, one team must have more net points than the other.";
	}

	if (goldenStrikeTaken.value && !isTie) {
		return "For Golden Strike, both teams must have equal net points.";
	}

	return null;
};

const getFinishedMatchMetadata = () => {
	const { team1NetPoints, team2NetPoints } = getTeamNetPoints();
	let resolvedWinnerTeamId = winnerTeamId.value;

	if (resolvedWinnerTeamId == null && team1NetPoints !== team2NetPoints) {
		resolvedWinnerTeamId =
			team1NetPoints > team2NetPoints ? props.match.team1 : props.match.team2;
	}

	if (resolvedWinnerTeamId == null) {
		return null;
	}

	return {
		winnerTeamId: resolvedWinnerTeamId,
		outcome:
			resolvedWinnerTeamId === props.match.team1
				? MatchOutcome.Team1Won
				: MatchOutcome.Team2Won,
		netPoints: Math.abs(team1NetPoints - team2NetPoints),
	};
};

const getMatchStatsPayload = () => {
	const allPlayers = [
		...scorecard.value.team1.players,
		...scorecard.value.team2.players,
	];

	return allPlayers
		.filter((player) => player.id != null)
		.map((player) => ({
			player_id: player.id,
			coins_pocketed: player.coins,
			strikers_pocketed: player.pockets,
			coins_fined: player.fines,
			shots_taken: 0,
		}));
};

const syncMatchCardFromApi = (updatedMatch) => {
	if (!updatedMatch) {
		return;
	}

	props.match.status = updatedMatch.status;
	props.match.outcome = updatedMatch.outcome;
	props.match.net_points = updatedMatch.net_points;
	props.match.golden_strike = updatedMatch.golden_strike;
	props.match.toss_outcome = updatedMatch.toss_outcome;
};

const playHorn = async () => {
	await playBgm(BackgroundMusic.Horn);
	if (hornStopTimeoutId.value) {
		clearTimeout(hornStopTimeoutId.value);
	}
	hornStopTimeoutId.value = setTimeout(async () => {
		hornStopTimeoutId.value = null;
		await pauseBgm(BackgroundMusic.Horn);
	}, 4000);
};

const formatDurationFromSeconds = (seconds) => {
	const safeSeconds = Math.max(0, Number(seconds || 0));
	const minutes = Math.floor(safeSeconds / 60)
		.toString()
		.padStart(2, "0");
	const secs = Math.floor(safeSeconds % 60)
		.toString()
		.padStart(2, "0");
	return `${minutes}:${secs}`;
};

const getRemainingSeconds = (targetTime) => {
	if (!targetTime) {
		return 0;
	}
	const diffMs = targetTime - dayjs().valueOf();
	return Math.max(0, Math.ceil(diffMs / 1000));
};

const getElapsedMatchTime = () => {
	if (!regulationTimeExhausted.value && !extraTimeStarted.value) {
		const remainingRegulationSeconds = timerFrozenAtZero.value
			? 0
			: timerPaused.value
				? pausedTimerSeconds.value
				: getRemainingSeconds(regulationTimer.value);
		return {
			duration: Math.max(
				0,
				Math.min(
					regulationDurationSeconds,
					regulationDurationSeconds - remainingRegulationSeconds,
				),
			),
			extra: null,
		};
	}

	const duration = regulationDurationSeconds;
	if (!extraTimeStarted.value) {
		return {
			duration,
			extra: null,
		};
	}

	if (extraTimeExhausted.value) {
		return {
			duration,
			extra: extraDurationSeconds,
		};
	}

	const remainingExtraSeconds = timerFrozenAtZero.value
		? 0
		: timerPaused.value
			? pausedTimerSeconds.value
			: getRemainingSeconds(regulationTimer.value);
	return {
		duration,
		extra: Math.max(
			0,
			Math.min(extraDurationSeconds, extraDurationSeconds - remainingExtraSeconds),
		),
	};
};

const startExtraTime = () => {
	showRegulationDecisionDialog.value = false;
	extraTimeStarted.value = true;
	enableFinishBtn.value = true;
	timerFrozenAtZero.value = false;
	timerPaused.value = false;
	pausedTimerSeconds.value = 0;
	showSaveBtn.value = false;
	goldenStrikeTaken.value = false;
	// regulationTimer.value = dayjs().add(5, "minute").valueOf();
	regulationTimer.value = dayjs().add(extraDurationSeconds, "second").valueOf();
};

const handleRegulationDecision = async (finishNow) => {
	if (!finishNow) {
		startExtraTime();
		return;
	}
	showRegulationDecisionDialog.value = false;
	timerPaused.value = false;
	pausedTimerSeconds.value = 0;
	showSaveBtn.value = false;
	enableFinishBtn.value = true;
};

const handleExtraDecision = (decision) => {
	showExtraDecisionDialog.value = false;
	if (decision === "golden") {
		openGoldenStrikeDialog();
		return;
	}
	timerPaused.value = false;
	pausedTimerSeconds.value = 0;
	showSaveBtn.value = false;
	enableFinishBtn.value = true;
};

const onEndingCountdown = async () => {
	if (!regulationTimeExhausted.value) {
		regulationTimeExhausted.value = true;
		timerFrozenAtZero.value = true;
		timerPaused.value = false;
		pausedTimerSeconds.value = 0;
		showSaveBtn.value = false;
		regulationTimer.value = dayjs().valueOf();
		await playHorn();
		showRegulationDecisionDialog.value = true;
		return;
	}

	extraTimeExhausted.value = true;
	timerFrozenAtZero.value = true;
	timerPaused.value = false;
	pausedTimerSeconds.value = 0;
	showSaveBtn.value = false;
	regulationTimer.value = dayjs().valueOf();
	enableFinishBtn.value = false;
	await playHorn();
	showExtraDecisionDialog.value = true;
};

const getTossText = () => {
	return matchObject.value.toss_outcome === TossOutcome.Team1Won
		? `${getTeam(props.match.team1).name} won the Toss`
		: `${getTeam(props.match.team2).name} won the Toss`;
};

const getStatusText = () => {
	const status = MatchStatus.find((status) => status.id === props.match.status);
	if (!status) {
		return "Status unavailable";
	}
	switch (status.id) {
		case 1:
			return `${dayjs(props.match.scheduled_date).format("ddd MMM DD YYYY")}`;
		case 2:
			return `Ongoing`;
		case 3:
			let winnerTeamId = null;
			if (props.match.golden_strike) {
				// no-op; winner decided via golden strike
			}
			switch (props.match.outcome) {
				case MatchOutcome.Team1Won:
					winnerTeamId = props.match.team1;
					break;
				case MatchOutcome.Team2Won:
					winnerTeamId = props.match.team2;
					break;
			}
			if (!winnerTeamId) {
				return "Result pending";
			}
			const winnerTeam = getTeam(winnerTeamId);
			if (!winnerTeam) {
				return "Result pending";
			}
			const winningFactor = props.match.golden_strike
				? "Golden Strike"
				: props.match.net_points != null
					? `${props.match.net_points} pts`
					: "result";
			return `${winnerTeam.name} won by ${winningFactor}`;
		default:
			return "Status unavailable";
	}
};

const scaleDialog = () => {
	if (matchObject.value.toss_outcome === null) {
		showTossDialog.value = true;
		return;
	}
	showTossDialog.value = false;
	showMatchManager.value = true;
	takeFullScreen();
	scorecard.value.team1.players[0].id = getTeamMembers(
		props.match.team1,
	)[0].player_id;
	scorecard.value.team1.players[1].id = getTeamMembers(
		props.match.team1,
	)[1].player_id;
	scorecard.value.team2.players[0].id = getTeamMembers(
		props.match.team2,
	)[0].player_id;
	scorecard.value.team2.players[1].id = getTeamMembers(
		props.match.team2,
	)[1].player_id;
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
	await playBgm(BackgroundMusic.Match, 8000);
};

const hideMatchManagementDialog = () => {
	showMatchManagementDialog.value = false;
};

const back = () => {
	showMatchManager.value = false;
	matchObject.value.toss_outcome = null;
	exitFullScreen();
};

const closeTossDialog = () => {
	showTossDialog.value = false;
	matchObject.value.toss_outcome = null;
};

const confirmGoldenStrikeWinner = async () => {
	if (winnerTeamId.value == null) {
		return;
	}
	showGoldenStrikeDialog.value = false;
	timerPaused.value = false;
	pausedTimerSeconds.value = 0;
	showSaveBtn.value = false;
	enableFinishBtn.value = true;
};

const openGoldenStrikeDialog = () => {
	goldenStrikeTaken.value = true;
	winnerTeamId.value = null;
	showGoldenStrikeDialog.value = true;
};

const startMatch = async () => {
	pauseBgm();
	clearMatchTimeouts();
	lock.value = true;
	showCountdown.value = true;
	startMatchTimeoutId.value = setTimeout(async () => {
		startMatchTimeoutId.value = null;
		await playBgm(BackgroundMusic.Horn);
		await pauseBgm(BackgroundMusic.Countdown);
		matchStarted.value = true;
		live.value = true;
		enableFinishBtn.value = true;
		goldenStrikeTaken.value = false;
		timerFrozenAtZero.value = false;
		timerPaused.value = false;
		pausedTimerSeconds.value = 0;
		showSaveBtn.value = false;
		extraTimeStarted.value = false;
		// regulationTimer.value = dayjs().add(15, "minute").valueOf();
		regulationTimer.value = dayjs()
			.add(regulationDurationSeconds, "second")
			.valueOf();
		hornStopTimeoutId.value = setTimeout(async () => {
			hornStopTimeoutId.value = null;
			await pauseBgm(BackgroundMusic.Horn);
		}, 4000);
		showCountdown.value = false;
	}, 10500);
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

const resumeMatch = () => {
	if (!timerPaused.value || timerFrozenAtZero.value) {
		return;
	}

	const remainingSeconds = Math.max(0, Number(pausedTimerSeconds.value || 0));
	if (remainingSeconds <= 0) {
		timerPaused.value = false;
		showSaveBtn.value = false;
		return;
	}

	regulationTimer.value = dayjs().add(remainingSeconds, "second").valueOf();
	timerPaused.value = false;
	pausedTimerSeconds.value = 0;
	showSaveBtn.value = false;
	enableFinishBtn.value = true;
};

const saveMatchResult = async () => {
	await finishMatch(true);
};

const finishMatch = async (forcefully = false) => {
	if (!forcefully && live.value && !timerFrozenAtZero.value && !timerPaused.value) {
		pausedTimerSeconds.value = getRemainingSeconds(regulationTimer.value);
		timerPaused.value = true;
		showSaveBtn.value = true;
		enableFinishBtn.value = true;
		return;
	}
	if (!forcefully && goldenStrikeTaken.value && winnerTeamId.value == null) {
		openGoldenStrikeDialog();
		return;
	}
	const invalidTeamNetPoints = getInvalidTeamNetPoints();
	if (invalidTeamNetPoints) {
		window.alert(
			`${invalidTeamNetPoints.teamName} net points must be between 0 and 9. Current value: ${invalidTeamNetPoints.netPoints}.`,
		);
		return;
	}
	const invalidGoldenStrikeState = getInvalidGoldenStrikeState();
	if (invalidGoldenStrikeState) {
		window.alert(invalidGoldenStrikeState);
		return;
	}

	const finishedMatchMetadata = getFinishedMatchMetadata();
	if (!finishedMatchMetadata) {
		window.alert(
			"The match is tied. Please select the Golden Strike winner to finish the match.",
		);
		showGoldenStrikeDialog.value = true;
		return;
	}

	startLoader("Saving match result...");
	try {
		const playedStatus = MatchStatus.find(
			(status) => status.name === "Played",
		)?.id;
		const elapsedMatchTime = getElapsedMatchTime();
		const tossOutcome =
			matchObject.value.toss_outcome ??
			props.match.toss_outcome ??
			TossOutcome.NotDecided;

		const updatedMatch = await matchStore.updateMatch(props.match.id, {
			status: playedStatus,
			outcome: finishedMatchMetadata.outcome,
			net_points: finishedMatchMetadata.netPoints,
			golden_strike: goldenStrikeTaken.value,
			toss_outcome: tossOutcome,
			duration: elapsedMatchTime.duration,
			extra: elapsedMatchTime.extra,
		});

		const matchStatsPayload = getMatchStatsPayload();
		if (matchStatsPayload.length > 0) {
			await matchStore.updateMatchStats(props.match.id, matchStatsPayload);
		}

		winnerTeamId.value = finishedMatchMetadata.winnerTeamId;
		syncMatchCardFromApi(updatedMatch);
		showMatchManagementDialog.value = false;
	} catch (error) {
		console.error("Failed to persist finished match details", error);
		window.alert(error?.message || "Failed to save match details.");
	} finally {
		pauseLoader();
	}
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

.match-info .team-logo {
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

#match-live-info {
	height: calc(100vh - 130px);
}

.dialog-footer.match-started {
	position: absolute;
	bottom: 1.5rem;
	right: 1.5rem;
}

#stopwatch-head-btn {
	height: 12px;
	width: 40px;
	background: #000000;
	border-radius: 5px;
}

.stopwatch-head-btn-knurling {
	width: 7px;
	height: 12px;
	border-right: 1px solid #ffffff;
}

#stopwatch-head-pin {
	height: 16px;
	width: 20px;
	background: #000000;
	border-top: 1px solid #ffffff;
}

#stopwatch {
	height: 250px;
	width: 250px;
	border-radius: 50%;
	border: 10px solid #000000;
}

.countdown-frozen {
	font-weight: bold;
	font-size: 50px;
}

.el-statistic {
	display: flex;
	flex-direction: column;
	align-items: center;
}

::v-deep(.el-statistic__number) {
	font-weight: bold;
	font-size: 50px;
}

.match-team-logo {
	width: 180px;
	height: 180px;
	border-radius: 50%;
}

.team-scorecard {
	width: 350px;
	border-radius: 12px;
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
	transition: all 0.3s ease;
}

.team-scorecard:hover {
	cursor: pointer;
	box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
}

.live-badge {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font-weight: 600;
	color: #28a745;
}

.live-icon {
	width: 10px;
	height: 10px;
	background-color: #28a745;
	border-radius: 50%;
	position: relative;
	animation: rippleGlow 1.8s infinite;
}

.live-icon::after {
	content: "";
	position: absolute;
	width: 100%;
	height: 100%;
	border-radius: 50%;
	background-color: #28a745;
	z-index: -1;
}

.live-badge.disabled {
	color: #9e9e9e;
}

.live-badge.disabled .live-icon {
	background-color: #9e9e9e;
	animation: none;
	box-shadow: none;
}

@keyframes rippleGlow {
	0% {
		box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7);
	}
	70% {
		box-shadow: 0 0 0 10px rgba(40, 167, 69, 0);
	}
	100% {
		box-shadow: 0 0 0 0 rgba(40, 167, 69, 0);
	}
}

.radio-column {
	display: flex;
	flex-direction: column;
}
</style>
