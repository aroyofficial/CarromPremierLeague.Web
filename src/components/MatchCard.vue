<template>
	<div>
		<div
			class="row align-items-center border p-4 match-card"
			:class="{
				'golden-glow':
					match.category === MatchCategory.find((mc) => mc.name === 'Final').id,
			}"
			role="button"
			:tabindex="match.team1 && match.team2 ? 0 : -1"
			:aria-label="match.team1 && match.team2 ? `View ${getCategoryLabel()} match information for ${getTeam(match.team1)?.name || 'Team 1'} versus ${getTeam(match.team2)?.name || 'Team 2'}` : 'Match teams are to be decided'"
			@click="match.team1 && match.team2 && openMatchManagementDialog()"
			@keydown.enter="match.team1 && match.team2 && openMatchManagementDialog()"
			@keydown.space.prevent="match.team1 && match.team2 && openMatchManagementDialog()"
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
				<div class="versus-text">{{ getCategoryLabel() }} · Match {{ match.order }}</div>
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
			width="min(720px, 94vw)"
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
							<p v-if="!scorecard.team1.players.length" class="score-empty">No players are rostered for this team.</p>
							<article
								v-for="player in scorecard.team1.players"
								:key="player.id || player.first_name"
								class="score-player"
							>
								<div class="score-player-name">
									<img :src="player.avatar_url" class="player-avatar border" alt="" />
									<strong>{{ player.first_name }} {{ player.last_name }}</strong>
								</div>
								<div class="score-metric">
									<span>Own coins pocketed</span>
									<el-input-number v-model="player.coins" size="small" :min="playerBounds(player).ownMin" :max="playerBounds(player).ownMax" :readonly="!live" />
									<small class="score-limit">{{ limitText(playerBounds(player).ownMin, playerBounds(player).ownMax) }}</small>
								</div>
								<div class="score-metric">
									<span>Opponent coins pocketed</span>
									<el-input-number v-model="player.opponent" size="small" :min="playerBounds(player).opponentMin" :max="playerBounds(player).opponentMax" :readonly="!live" />
									<small class="score-limit">{{ opponentLimitText(player) }}</small>
								</div>
								<div class="score-metric">
									<span>Single fines (1 coin)</span>
									<el-input-number v-model="player.single" size="small" :min="playerBounds(player).singleMin" :max="playerBounds(player).singleMax" :readonly="!live" />
									<small v-if="playerBounds(player).singleMin" class="score-limit">At least {{ playerBounds(player).singleMin }}</small>
								</div>
								<div class="score-metric">
									<span>Double fines (2 coins)</span>
									<el-input-number v-model="player.double" size="small" :min="playerBounds(player).doubleMin" :max="playerBounds(player).doubleMax" :readonly="!live" />
									<small v-if="playerBounds(player).doubleMin" class="score-limit">At least {{ playerBounds(player).doubleMin }}</small>
								</div>
								<div class="score-metric">
									<span>Strikers pocketed</span>
									<el-input-number v-model="player.strikers" size="small" :min="0" :readonly="!live" />
								</div>
							</article>
						</div>
					</div>
					<div
						class="col d-flex flex-column gap-0 align-items-center justify-content-center"
					>
						<div class="mb-5 poppins-bold">{{ isGoldenStrikeCategory(match.category) ? "Golden Strike" : `Match ${match.order}` }}</div>
						<template v-if="!isGoldenStrikeCategory(match.category)">
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
								<div class="countdown-frozen">{{ forwardClock }}</div>
							</div>
						</template>
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
							<p v-if="!scorecard.team2.players.length" class="score-empty">No players are rostered for this team.</p>
							<article
								v-for="player in scorecard.team2.players"
								:key="player.id || player.first_name"
								class="score-player"
							>
								<div class="score-player-name">
									<img :src="player.avatar_url" class="player-avatar border" alt="" />
									<strong>{{ player.first_name }} {{ player.last_name }}</strong>
								</div>
								<div class="score-metric">
									<span>Own coins pocketed</span>
									<el-input-number v-model="player.coins" size="small" :min="playerBounds(player).ownMin" :max="playerBounds(player).ownMax" :readonly="!live" />
									<small class="score-limit">{{ limitText(playerBounds(player).ownMin, playerBounds(player).ownMax) }}</small>
								</div>
								<div class="score-metric">
									<span>Opponent coins pocketed</span>
									<el-input-number v-model="player.opponent" size="small" :min="playerBounds(player).opponentMin" :max="playerBounds(player).opponentMax" :readonly="!live" />
									<small class="score-limit">{{ opponentLimitText(player) }}</small>
								</div>
								<div class="score-metric">
									<span>Single fines (1 coin)</span>
									<el-input-number v-model="player.single" size="small" :min="playerBounds(player).singleMin" :max="playerBounds(player).singleMax" :readonly="!live" />
									<small v-if="playerBounds(player).singleMin" class="score-limit">At least {{ playerBounds(player).singleMin }}</small>
								</div>
								<div class="score-metric">
									<span>Double fines (2 coins)</span>
									<el-input-number v-model="player.double" size="small" :min="playerBounds(player).doubleMin" :max="playerBounds(player).doubleMax" :readonly="!live" />
									<small v-if="playerBounds(player).doubleMin" class="score-limit">At least {{ playerBounds(player).doubleMin }}</small>
								</div>
								<div class="score-metric">
									<span>Strikers pocketed</span>
									<el-input-number v-model="player.strikers" size="small" :min="0" :readonly="!live" />
								</div>
							</article>
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
				<div class="row d-flex match-info-grid">
					<div class="col-4 d-flex align-items-center flex-column info-team">
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
						class="col-4 d-flex flex-column justify-content-center align-items-center text-center info-center"
					>
						<div>Head To Head Wins</div>
						<div class="mb-2">
							<b>{{ stats?.team1_wins || 0 }} - {{ stats?.team2_wins || 0 }}</b>
						</div>
						<div>Net Points Difference</div>
						<div class="mb-2">
							<b>{{ stats?.team1_net_points || 0 }} - {{ stats?.team2_net_points || 0 }}</b>
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
					<div class="col-4 d-flex align-items-center flex-column info-team">
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
						v-if="!lock && showResetTossBtn()"
						type="warning"
						plain
						size="large"
						@click="resetToss()"
						>Reset toss</el-button
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
							v-if="!editingResult"
							type="danger"
							plain
							size="large"
							@click="requestReset()"
							>Reset match</el-button
						>
						<el-button
							type="primary"
							size="large"
							@click="requestFinish()"
							:disabled="!canFinishMatch"
							>{{ editingResult ? "Save scores" : "Finish" }}</el-button
						>
					</template>
				</div>
				<div v-else class="dialog-footer">
					<span v-if="!authStore.isAuthenticated" class="match-access-note">
						Sign in as an admin to start and record this match.
					</span>
					<el-button @click="hideMatchManagementDialog()">Cancel</el-button>
					<el-button
						v-if="showResetTossBtn()"
						type="warning"
						plain
						@click="resetToss()"
					>
						Reset toss
					</el-button>
					<el-button
						v-if="showResetBtn()"
						type="danger"
						plain
						@click="requestReset()"
					>
						Reset match
					</el-button>
					<el-button
						v-if="showResumeBtn()"
						type="warning"
						@click="resumeLiveMatch"
					>
						Resume live match
					</el-button>
					<el-button
						v-if="showEditBtn()"
						type="primary"
						@click="editScores()"
					>
						Edit scores
					</el-button>
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
		</el-dialog>
		<el-dialog
			v-model="showRegulationDecisionDialog"
			:close-on-click-modal="false"
			:close-on-press-escape="false"
			:show-close="false"
			align-center
			width="min(460px, 92vw)"
		>
			<template #header>
				<div class="ms-2">Regulation time is over</div>
			</template>
			<div class="ms-2">
				Go to 5 minutes of extra time? If you choose no, update the player scores and finish the match. The winner is calculated from the scorecard.
			</div>
			<template #footer>
				<el-button @click="handleRegulationDecision(false)">No, update scores</el-button>
				<el-button type="warning" @click="handleRegulationDecision(true)">Go to extra time</el-button>
			</template>
		</el-dialog>
		<el-dialog
			v-model="showExtraDecisionDialog"
			:close-on-click-modal="false"
			:close-on-press-escape="false"
			:show-close="false"
			align-center
			width="min(460px, 92vw)"
		>
			<template #header>
				<div class="ms-2">Extra time is over</div>
			</template>
			<div class="ms-2">
				Go to Golden Strike? If you choose no, update the player scores and finish the match. The winner is calculated from the scorecard.
			</div>
			<template #footer>
				<el-button @click="handleExtraDecision(false)">No, update scores</el-button>
				<el-button type="warning" @click="handleExtraDecision(true)">Go to Golden Strike</el-button>
			</template>
		</el-dialog>
		<el-dialog
			v-model="showRegulationCompleteDialog"
			:close-on-click-modal="false"
			:close-on-press-escape="false"
			:show-close="false"
			align-center
			width="min(460px, 92vw)"
		>
			<template #header>
				<div class="ms-2">Regulation time is over</div>
			</template>
			<div class="ms-2">
				Update the player scores, then finish the match. The winner is calculated from the scorecard.
			</div>
			<template #footer>
				<el-button type="primary" @click="acknowledgeRegulation()">Update scores</el-button>
			</template>
		</el-dialog>
		<el-dialog
			v-model="showFinishConfirm"
			:close-on-click-modal="false"
			:close-on-press-escape="false"
			align-center
			width="min(480px, 92vw)"
		>
			<template #header>
				<div class="ms-2">{{ editingResult ? "Recalculate this result?" : "Finish this match?" }}</div>
			</template>
			<div class="ms-2">{{ finishSummary }}</div>
			<template #footer>
				<el-button @click="showFinishConfirm = false">Back</el-button>
				<el-button type="primary" @click="confirmFinish()">Confirm</el-button>
			</template>
		</el-dialog>
		<el-dialog
			v-model="showTossDialog"
			:close-on-click-modal="false"
			:close-on-press-escape="false"
			:show-close="false"
			align-center
			width="min(400px, 92vw)"
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
			width="min(420px, 92vw)"
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
import { computed, nextTick, onMounted, onUnmounted, onUpdated, ref, watch } from "vue";
import { useSeasonStore } from "@/store/seasonStore";
import { useTeamStore } from "@/store/teamStore";
import { useMatchStore } from "@/store/matchStore";
import { useStatsStore } from "../store/statsStore";
import { useRosterStore } from "../store/rosterStore";
import { useAuthStore } from "@/store/authStore";
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
import { ElMessage, ElMessageBox } from "element-plus";
import { matchService } from "@/services/matchService";
import { useSettingsStore } from "@/store/settingsStore";
import { localPlayerPhoto } from "@/utils/playerPhotos";
import { COINS_PER_COLOR, coinBounds, colourOverflow, eitherTeamReachedNine, fineCoins as fineCoinCount, teamScore } from "@/utils/coinLimits";
import { matchQueue } from "@/utils/requestQueue";

const props = defineProps({
	match: Object,
});

const seasonStore = useSeasonStore();
const teamStore = useTeamStore();
const matchStore = useMatchStore();
const statsStore = useStatsStore();
const rosterStore = useRosterStore();
const authStore = useAuthStore();
const showMatchManagementDialog = ref(false);
const stats = ref({});
const teamDetails = ref([]);
const showMatchManager = ref(false);
const matchObject = ref({
	toss_outcome: null,
});
const lock = ref(false);
const matchStarted = ref(false);
const regulationTimer = ref(0);
const regulationTimeExhausted = ref(false);
const extraTimeExhausted = ref(false);
const live = ref(false);
const showTossDialog = ref(false);
const showRegulationDecisionDialog = ref(false);
const showRegulationCompleteDialog = ref(false);
const showExtraDecisionDialog = ref(false);
const showFinishConfirm = ref(false);
const editingResult = ref(false);
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
const settingsStore = useSettingsStore();
const regulationSeconds = () => settingsStore.regulation_minutes * 60;
const extraSeconds = () => settingsStore.extra_minutes * 60;

onMounted(() => {
	if (!settingsStore.loaded) settingsStore.fetchSettings().catch(() => undefined);
});
const clockNow = ref(Date.now());
let clockTick = null;

const stopClockTick = () => {
	if (clockTick) clearInterval(clockTick);
	clockTick = null;
};

const blankMetricPlayer = (member, previous) => ({
	id: member?.player_id ?? previous?.id ?? null,
	first_name: member?.first_name || previous?.first_name || "Player",
	last_name: member?.last_name || previous?.last_name || "",
	avatar_url: (member && (localPlayerPhoto(member) || member.avatar_url)) || previous?.avatar_url || "",
	coins: previous?.coins || 0,
	opponent: previous?.opponent || 0,
	single: previous?.single || 0,
	double: previous?.double || 0,
	strikers: previous?.strikers || 0,
	shots: previous?.shots || 0,
});

const createInitialScorecard = () => ({
	team1: { netCoins: 0, players: [] },
	team2: { netCoins: 0, players: [] },
});

const scorecard = ref(createInitialScorecard());

watch(showMatchManager, (open) => {
	document.querySelector("span.el-dialog__title")?.classList.toggle("ms-4");
	stopClockTick();
	if (!open) return;
	clockNow.value = Date.now();
	clockTick = setInterval(() => {
		clockNow.value = Date.now();
	}, 250);
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
	showRegulationCompleteDialog.value = false;
	showExtraDecisionDialog.value = false;
	showFinishConfirm.value = false;
	editingResult.value = false;
	showGoldenStrikeDialog.value = false;
	matchObject.value = {
		toss_outcome: null,
	};
	lock.value = false;
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
		pauseBgm(BackgroundMusic.Horn, 300),
	]);
});

const categoryId = (name) => MatchCategory.find((category) => category.name === name)?.id;

const isLeagueCategory = (category) => category === categoryId("League");

const isKnockoutCategory = (category) =>
	[
		categoryId("Eliminator"),
		categoryId("Qualifier 1"),
		categoryId("Qualifier 2"),
		categoryId("Final"),
	].includes(category);

const isGoldenStrikeCategory = (category) => category === categoryId("Golden Strike");

const getCategoryLabel = () =>
	MatchCategory.find((category) => category.id === props.match.category)?.name || "Match";

const getTeam = (teamId) => {
	return teamStore.teams.find((team) => team.id === teamId);
};

const getTeamLogo = (teamId) => {
	if (!teamId) return resolveAsset("public/assets/images/teams/tbd.png");
	return getTeam(teamId)?.logo_url || resolveAsset("public/assets/images/teams/tbd.png");
};

const blockMatchManagement = () => {
	return false;
	// return !dayjs(props.match.scheduled_date).isSame(dayjs(), 'day');
};

const toLimitRow = (player, teamId) => ({
	id: player.id,
	teamId,
	own: player.coins,
	opponent: player.opponent,
	single: player.single,
	double: player.double,
});

const limitRows = () => [
	...scorecard.value.team1.players.map((player) => toLimitRow(player, props.match.team1)),
	...scorecard.value.team2.players.map((player) => toLimitRow(player, props.match.team2)),
];

const playerTeamId = (player) =>
	scorecard.value.team1.players.includes(player) ? props.match.team1 : props.match.team2;

const playerBounds = (player) => coinBounds(limitRows(), toLimitRow(player, playerTeamId(player)));

const limitText = (min, max) => (min > 0 ? `${min} to ${max}` : `Up to ${max}`);

const opponentLimitText = (player) => `Up to ${playerBounds(player).opponentCap}`;

const fineCoins = (player) => fineCoinCount(player.single, player.double);

const getInvalidCoinCount = () => {
	const rows = limitRows();
	for (const teamId of [props.match.team1, props.match.team2]) {
		const overflow = colourOverflow(rows, teamId);
		if (overflow) {
			return { teamName: getTeam(teamId)?.name || "A team", coins: COINS_PER_COLOR + overflow };
		}
	}
	return null;
};

const getTeamNetPoints = () => {
	const rows = limitRows();
	return {
		team1NetPoints: teamScore(rows, props.match.team1),
		team2NetPoints: teamScore(rows, props.match.team2),
	};
};

// The clock still enables Finish when time expires. Reaching 9 coins enables it during the match.
const canFinishMatch = computed(() => {
	if (enableFinishBtn.value) return true;
	if (!lock.value) return false;
	return eitherTeamReachedNine(limitRows(), [props.match.team1, props.match.team2]);
});

const getInvalidTeamNetPoints = () => {
	const { team1NetPoints, team2NetPoints } = getTeamNetPoints();
	if (team1NetPoints > COINS_PER_COLOR) {
		return {
			teamName: getTeam(props.match.team1)?.name || "Team 1",
			netPoints: team1NetPoints,
		};
	}
	if (team2NetPoints > COINS_PER_COLOR) {
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

	if (isGoldenStrikeCategory(props.match.category)) {
		return null;
	}

	if (goldenStrikeTaken.value && !isTie) {
		return "For Golden Strike, both teams must have equal net points.";
	}

	return null;
};

const getFinishedMatchMetadata = () => {
	const { team1NetPoints, team2NetPoints } = getTeamNetPoints();
	const isTie = team1NetPoints === team2NetPoints;

	if (isGoldenStrikeCategory(props.match.category)) {
		if (winnerTeamId.value == null) {
			return null;
		}
		return {
			winnerTeamId: winnerTeamId.value,
			outcome:
				winnerTeamId.value === props.match.team1
					? MatchOutcome.Team1Won
					: MatchOutcome.Team2Won,
			netPoints: 0,
			goldenStrike: true,
		};
	}

	if (!isTie) {
		const resolvedWinnerTeamId =
			team1NetPoints > team2NetPoints ? props.match.team1 : props.match.team2;
		return {
			winnerTeamId: resolvedWinnerTeamId,
			outcome:
				resolvedWinnerTeamId === props.match.team1
					? MatchOutcome.Team1Won
					: MatchOutcome.Team2Won,
			netPoints: Math.abs(team1NetPoints - team2NetPoints),
			goldenStrike: false,
		};
	}

	return {
		winnerTeamId: null,
		outcome: MatchOutcome.NotDecided,
		netPoints: 0,
		goldenStrike: false,
		draw: true,
	};
};

const finishSummary = computed(() => {
	const result = getFinishedMatchMetadata();
	if (!result) return "Choose the Golden Strike winner before finishing.";
	if (result.goldenStrike) {
		return `${getTeam(result.winnerTeamId)?.name || "The selected team"} won on the Golden Strike. Saving will record that winner.`;
	}
	if (result.draw) {
		return "The scorecard is level, so this match will be recorded as a tie.";
	}
	return `${getTeam(result.winnerTeamId)?.name || "The leading team"} won by ${result.netPoints}. Saving calculates and records this winner.`;
});

const getMatchStatsPayload = () => {
	const allPlayers = [
		...scorecard.value.team1.players,
		...scorecard.value.team2.players,
	];

	return allPlayers
		.filter((player) => player.id != null)
		.map((player) => ({
			player_id: player.id,
			coins_pocketed: player.coins || 0,
			opponent_coins_pocketed: player.opponent || 0,
			single_fines: player.single || 0,
			double_fines: player.double || 0,
			strikers_pocketed: player.strikers || 0,
			coins_fined: fineCoins(player),
			shots_taken: player.shots || 0,
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
	props.match.duration = updatedMatch.duration;
	props.match.extra = updatedMatch.extra;
	props.match.started_at = updatedMatch.started_at;
	props.match.extra_started_at = updatedMatch.extra_started_at;
};

const apiMessage = (error, fallback) => error?.message || error?.detail || fallback;

// Every write for this match goes through one queue, so the server sees changes in the order they were made.
const persistMatch = (payload, what) =>
	matchQueue(props.match.id).enqueue(async () => {
		try {
			const updatedMatch = await matchStore.updateMatch(props.match.id, payload);
			syncMatchCardFromApi(updatedMatch);
			return updatedMatch;
		} catch (error) {
			ElMessage.error(apiMessage(error, `The ${what} could not be saved.`));
			throw error;
		}
	});

const persistStats = () =>
	matchQueue(props.match.id).enqueue(async () => {
		const payload = getMatchStatsPayload();
		if (!payload.length) return null;
		try {
			return await matchStore.updateMatchStats(props.match.id, payload);
		} catch (error) {
			ElMessage.error(apiMessage(error, "The scorecard could not be saved."));
			throw error;
		}
	}, "stats");

const scorecardLoading = ref(false);

watch(
	() => JSON.stringify(getMatchStatsPayload()),
	(next, previous) => {
		if (next === previous || !live.value || !matchStarted.value || editingResult.value || scorecardLoading.value) return;
		persistStats().catch(() => undefined);
	},
);

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
	const diffMs = targetTime - clockNow.value;
	return Math.max(0, Math.ceil(diffMs / 1000));
};

const activePeriodSeconds = () =>
	extraTimeStarted.value ? extraSeconds() : regulationSeconds();

const forwardClock = computed(() => {
	if (isGoldenStrikeCategory(props.match.category)) return "";
	if (editingResult.value) {
		const extraPlayed = Number(props.match.extra || 0);
		if (extraPlayed > 0) return `${formatDurationFromSeconds(extraPlayed)} extra`;
		return formatDurationFromSeconds(props.match.duration ?? regulationSeconds());
	}
	if (timerFrozenAtZero.value) return formatDurationFromSeconds(activePeriodSeconds());
	const remaining = timerPaused.value
		? Math.max(0, Number(pausedTimerSeconds.value || 0))
		: getRemainingSeconds(regulationTimer.value);
	return formatDurationFromSeconds(Math.max(0, activePeriodSeconds() - remaining));
});

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
					regulationSeconds(),
					regulationSeconds() - remainingRegulationSeconds,
				),
			),
			extra: null,
		};
	}

	const duration = regulationSeconds();
	if (!extraTimeStarted.value) {
		return {
			duration,
			extra: null,
		};
	}

	if (extraTimeExhausted.value) {
		return {
			duration,
			extra: extraSeconds(),
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
			Math.min(extraSeconds(), extraSeconds() - remainingExtraSeconds),
		),
	};
};

const startExtraTime = async () => {
	showRegulationDecisionDialog.value = false;
	extraTimeStarted.value = true;
	enableFinishBtn.value = false;
	timerFrozenAtZero.value = false;
	timerPaused.value = false;
	pausedTimerSeconds.value = 0;
	showSaveBtn.value = false;
	goldenStrikeTaken.value = false;
	regulationTimer.value = dayjs().add(extraSeconds(), "second").valueOf();
	try {
		const updatedMatch = await persistMatch({ extra: 0 }, "extra time start");
		if (updatedMatch?.extra_started_at) {
			regulationTimer.value = dayjs(updatedMatch.extra_started_at).valueOf() + extraSeconds() * 1000;
		}
	} catch (error) {
		console.error("Failed to start extra time", error);
	}
};

const acknowledgeRegulation = () => {
	showRegulationCompleteDialog.value = false;
	enableFinishBtn.value = true;
};

const handleRegulationDecision = async (goToExtraTime) => {
	showRegulationDecisionDialog.value = false;
	if (goToExtraTime) {
		await startExtraTime();
		return;
	}
	enableFinishBtn.value = true;
};

const handleExtraDecision = (goToGoldenStrike) => {
	showExtraDecisionDialog.value = false;
	if (goToGoldenStrike) {
		openGoldenStrikeDialog();
		return;
	}
	goldenStrikeTaken.value = false;
	winnerTeamId.value = null;
	enableFinishBtn.value = true;
};

watch(clockNow, () => {
	if (!live.value || editingResult.value || timerFrozenAtZero.value || timerPaused.value) return;
	if (!regulationTimer.value || getRemainingSeconds(regulationTimer.value) > 0) return;
	onEndingCountdown();
});

const onEndingCountdown = async () => {
	if (!regulationTimeExhausted.value) {
		regulationTimeExhausted.value = true;
		timerFrozenAtZero.value = true;
		timerPaused.value = false;
		pausedTimerSeconds.value = 0;
		showSaveBtn.value = false;
		regulationTimer.value = dayjs().valueOf();
		await playHorn();
		enableFinishBtn.value = false;
		if (isKnockoutCategory(props.match.category)) {
			showRegulationDecisionDialog.value = true;
			return;
		}
		showRegulationCompleteDialog.value = true;
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
				if (props.match.outcome === MatchOutcome.NotDecided) {
					if (isKnockoutCategory(props.match.category)) {
						return "Tied — Golden Strike scheduled";
					}
					if (isLeagueCategory(props.match.category)) {
						return "Match tied";
					}
				}
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

const tossDecided = (value) => value != null && value !== TossOutcome.NotDecided;

const scaleDialog = () => {
	if (matchObject.value.toss_outcome == null && tossDecided(props.match.toss_outcome)) {
		matchObject.value.toss_outcome = props.match.toss_outcome;
	}
	if (matchObject.value.toss_outcome == null) {
		showTossDialog.value = true;
		return;
	}
	showTossDialog.value = false;
	showMatchManager.value = true;
	takeFullScreen();
	setScorecardPlayerIds();
	if (matchObject.value.toss_outcome !== props.match.toss_outcome) {
		persistMatch({ toss_outcome: matchObject.value.toss_outcome }, "toss result").catch(() => undefined);
	}
};

const emptyHeadToHead = () => ({
	team1_wins: 0,
	team2_wins: 0,
	team1_net_points: 0,
	team2_net_points: 0,
});

const openMatchManagementDialog = async () => {
	startLoader();
	try {
		await statsStore.fetchHeadToHead(props.match.team1, props.match.team2);
		const key =
			props.match.team1 < props.match.team2
				? `${props.match.team1}-${props.match.team2}`
				: `${props.match.team2}-${props.match.team1}`;
		stats.value = statsStore.stats.get(key) || emptyHeadToHead();
	} catch (error) {
		console.error("Failed to load head-to-head", error);
		stats.value = emptyHeadToHead();
	} finally {
		showMatchManagementDialog.value = true;
		pauseLoader();
	}
	await playBgm(BackgroundMusic.Match, 8000);
};

const hideMatchManagementDialog = () => {
	showMatchManagementDialog.value = false;
};

const back = () => {
	showMatchManager.value = false;
	matchObject.value.toss_outcome = null;
	exitFullScreen();
	if (props.match.status === scheduledStatus() && tossDecided(props.match.toss_outcome)) {
		persistMatch({ toss_outcome: TossOutcome.NotDecided }, "toss reset").catch(() => undefined);
	}
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

const statusId = (name) => MatchStatus.find((status) => status.name === name)?.id;
const scheduledStatus = () => statusId("Scheduled");

const startMatch = async () => {
	pauseBgm();
	clearMatchTimeouts();
	lock.value = true;
	matchStarted.value = true;
	live.value = true;
	enableFinishBtn.value = false;
	goldenStrikeTaken.value = false;
	timerFrozenAtZero.value = false;
	timerPaused.value = false;
	pausedTimerSeconds.value = 0;
	showSaveBtn.value = false;
	extraTimeStarted.value = false;
	regulationTimeExhausted.value = false;
	extraTimeExhausted.value = false;
	const goldenStrike = isGoldenStrikeCategory(props.match.category);
	if (goldenStrike) {
		live.value = false;
		timerFrozenAtZero.value = true;
		enableFinishBtn.value = true;
		openGoldenStrikeDialog();
	} else {
		regulationTimer.value = dayjs().add(regulationSeconds(), "second").valueOf();
	}
	playHorn();
	try {
		const updatedMatch = await persistMatch(
			{
				status: statusId("In Progress"),
				toss_outcome: matchObject.value.toss_outcome ?? props.match.toss_outcome,
			},
			"match start",
		);
		if (!goldenStrike && updatedMatch?.started_at) {
			regulationTimer.value = dayjs(updatedMatch.started_at).valueOf() + regulationSeconds() * 1000;
		}
	} catch (error) {
		console.error("Failed to mark the match live", error);
		lock.value = false;
		matchStarted.value = false;
		live.value = false;
		showGoldenStrikeDialog.value = false;
		regulationTimer.value = 0;
	}
};

const showEditBtn = () =>
	authStore.isAuthenticated &&
	props.match.status === MatchStatus.find((status) => status.name === "Played")?.id;

const showStartBtn = () => {
	let isScheduled =
		props.match.status ===
		MatchStatus.find((status) => status.name === "Scheduled").id;
	return isScheduled && authStore.isAuthenticated;
};

const getTeamMembers = (teamId) => {
	return teamDetails.value?.find((td) => td.team_id === teamId)?.players || [];
};

const syncScorecardSide = (side, teamId) => {
	const previous = new Map(scorecard.value[side].players.filter((player) => player.id).map((player) => [player.id, player]));
	const members = getTeamMembers(teamId);
	if (!members.length) {
		if (scorecard.value[side].players.length) scorecard.value[side].players = [];
		return;
	}
	const nextIds = members.map((member) => member.player_id).join(",");
	const currentIds = scorecard.value[side].players.map((player) => player.id).join(",");
	if (members.length && nextIds === currentIds) {
		members.forEach((member) => {
			const player = previous.get(member.player_id);
			if (!player) return;
			player.first_name = member.first_name;
			player.last_name = member.last_name;
			player.avatar_url = localPlayerPhoto(member) || member.avatar_url || player.avatar_url;
		});
		return;
	}
	scorecard.value[side].players = members.map((member) => blankMetricPlayer(member, previous.get(member.player_id)));
};

const setScorecardPlayerIds = () => {
	syncScorecardSide("team1", props.match.team1);
	syncScorecardSide("team2", props.match.team2);
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

const showResumeBtn = () =>
	authStore.isAuthenticated &&
	props.match.status === MatchStatus.find((status) => status.name === "In Progress")?.id;

// The clock always comes from the start time stored on the server, so it keeps running while nobody has the page open.
const restoreClock = () => {
	const now = dayjs().valueOf();
	const regulationStartedAt = props.match.started_at ? dayjs(props.match.started_at).valueOf() : now;
	const extraStartedAt = props.match.extra_started_at ? dayjs(props.match.extra_started_at).valueOf() : null;
	const regulationEnd = regulationStartedAt + regulationSeconds() * 1000;
	timerPaused.value = false;
	pausedTimerSeconds.value = 0;

	if (isGoldenStrikeCategory(props.match.category)) {
		live.value = false;
		timerFrozenAtZero.value = true;
		enableFinishBtn.value = true;
		openGoldenStrikeDialog();
		return;
	}

	if (extraStartedAt) {
		const extraEnd = extraStartedAt + extraSeconds() * 1000;
		regulationTimeExhausted.value = true;
		extraTimeStarted.value = true;
		regulationTimer.value = extraEnd;
		if (extraEnd <= now) {
			extraTimeExhausted.value = true;
			timerFrozenAtZero.value = true;
			enableFinishBtn.value = false;
			showExtraDecisionDialog.value = true;
		}
		return;
	}

	regulationTimer.value = regulationEnd;
	if (regulationEnd <= now) {
		regulationTimeExhausted.value = true;
		timerFrozenAtZero.value = true;
		enableFinishBtn.value = false;
		if (isKnockoutCategory(props.match.category)) {
			showRegulationDecisionDialog.value = true;
		} else {
			showRegulationCompleteDialog.value = true;
		}
	}
};

const resumeLiveMatch = async () => {
	startLoader("Loading the live match...");
	try {
		const response = await matchService.getById(props.match.id);
		syncMatchCardFromApi(response.data);
		showMatchManager.value = true;
		lock.value = true;
		matchStarted.value = true;
		live.value = true;
		matchObject.value.toss_outcome = props.match.toss_outcome;
		restoreClock();
		takeFullScreen();
		await loadScorecard();
	} catch (error) {
		console.error("Failed to resume the live match", error);
		ElMessage.error(apiMessage(error, "The live match could not be loaded."));
	} finally {
		pauseLoader();
	}
};

const loadScorecard = async () => {
	scorecardLoading.value = true;
	try {
		setScorecardPlayerIds();
		const response = await matchService.getStats(props.match.id);
		const saved = new Map((response.data || []).map((item) => [item.player_id, item]));
		[...scorecard.value.team1.players, ...scorecard.value.team2.players].forEach((player) => {
			const stat = saved.get(player.id);
			if (!stat) return;
			player.coins = stat.coins_pocketed || 0;
			player.opponent = stat.opponent_coins_pocketed || 0;
			player.single = stat.single_fines || (!stat.double_fines ? stat.coins_fined || 0 : 0);
			player.double = stat.double_fines || 0;
			player.strikers = stat.strikers_pocketed || 0;
			player.shots = stat.shots_taken || 0;
		});
		await nextTick();
	} finally {
		scorecardLoading.value = false;
	}
};

const showResetBtn = () => authStore.isAuthenticated && props.match.status !== scheduledStatus();

const showResetTossBtn = () =>
	authStore.isAuthenticated &&
	props.match.status === scheduledStatus() &&
	tossDecided(props.match.toss_outcome);

const resetToss = async () => {
	try {
		await ElMessageBox.confirm(
			"Clear the toss? The match stays scheduled, and the toss can be called again.",
			"Reset the toss?",
			{ confirmButtonText: "Reset toss", cancelButtonText: "Keep it", type: "warning" },
		);
	} catch {
		return;
	}
	const returnToToss = showMatchManager.value && !lock.value;
	try {
		await persistMatch({ toss_outcome: TossOutcome.NotDecided }, "toss reset");
		matchObject.value.toss_outcome = null;
		ElMessage.success("The toss has been cleared.");
		if (returnToToss) {
			showMatchManager.value = false;
			exitFullScreen();
			showTossDialog.value = true;
		}
	} catch (error) {
		console.error("Failed to reset the toss", error);
	}
};

const requestReset = async () => {
	try {
		await ElMessageBox.confirm(
			"This clears the toss, the clock, the result and every player's scorecard, and puts the match back to Scheduled.",
			"Reset this match?",
			{ confirmButtonText: "Reset match", cancelButtonText: "Keep it", type: "warning" },
		);
	} catch {
		return;
	}
	startLoader("Resetting the match...");
	try {
		const resetMatch = await matchQueue(props.match.id).enqueue(() => matchStore.resetMatch(props.match.id));
		syncMatchCardFromApi(resetMatch);
		showMatchManagementDialog.value = false;
		await matchStore.fetchMatches(props.match.season_id);
		ElMessage.success("The match is back to Scheduled.");
	} catch (error) {
		console.error("Failed to reset the match", error);
		ElMessage.error(apiMessage(error, "The match could not be reset."));
	} finally {
		pauseLoader();
	}
};

const editScores = async () => {
	startLoader("Loading scorecard...");
	try {
		editingResult.value = true;
		showMatchManager.value = true;
		lock.value = true;
		live.value = true;
		timerFrozenAtZero.value = true;
		enableFinishBtn.value = true;
		await loadScorecard();
	} catch (error) {
		console.error("Failed to load the scorecard", error);
		window.alert("The scorecard could not be loaded.");
	} finally {
		pauseLoader();
	}
};

const requestFinish = () => {
	if (
		(isGoldenStrikeCategory(props.match.category) || goldenStrikeTaken.value) &&
		winnerTeamId.value == null
	) {
		openGoldenStrikeDialog();
		return;
	}
	const invalidCoinCount = getInvalidCoinCount();
	if (invalidCoinCount) {
		window.alert(
			`${invalidCoinCount.teamName}'s colour has ${invalidCoinCount.coins} coins off the board after fines. Each colour has only 9 coins.`,
		);
		return;
	}
	const invalidTeamNetPoints = getInvalidTeamNetPoints();
	if (invalidTeamNetPoints) {
		window.alert(
			`${invalidTeamNetPoints.teamName} cannot score more than 9 net coins. Current value: ${invalidTeamNetPoints.netPoints}.`,
		);
		return;
	}
	const invalidGoldenStrikeState = getInvalidGoldenStrikeState();
	if (invalidGoldenStrikeState) {
		window.alert(invalidGoldenStrikeState);
		return;
	}
	if (!getFinishedMatchMetadata()) {
		openGoldenStrikeDialog();
		return;
	}
	showFinishConfirm.value = true;
};

const confirmFinish = async () => {
	showFinishConfirm.value = false;
	await finishMatch(true);
};

const finishMatch = async (forcefully = false) => {
	if (!forcefully) return;
	if (
		!forcefully &&
		(isGoldenStrikeCategory(props.match.category) || goldenStrikeTaken.value) &&
		winnerTeamId.value == null
	) {
		openGoldenStrikeDialog();
		return;
	}
	const invalidCoinCount = getInvalidCoinCount();
	if (invalidCoinCount) {
		window.alert(
			`${invalidCoinCount.teamName}'s colour has ${invalidCoinCount.coins} coins off the board after fines. Each colour has only 9 coins.`,
		);
		return;
	}
	const invalidTeamNetPoints = getInvalidTeamNetPoints();
	if (invalidTeamNetPoints) {
		window.alert(
			`${invalidTeamNetPoints.teamName} cannot score more than 9 net coins. Current value: ${invalidTeamNetPoints.netPoints}.`,
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
		if (isGoldenStrikeCategory(props.match.category)) {
			openGoldenStrikeDialog();
			return;
		}
		window.alert(
			"The match is tied. Extra time has to be played before it can finish.",
		);
		return;
	}

	startLoader("Saving match result...");
	try {
		const playedStatus = MatchStatus.find(
			(status) => status.name === "Played",
		)?.id;
		const elapsedMatchTime = editingResult.value
			? {
				duration: isGoldenStrikeCategory(props.match.category)
					? 0
					: props.match.duration ?? regulationSeconds(),
				extra: props.match.extra,
			}
			: isGoldenStrikeCategory(props.match.category)
				? { duration: 0, extra: null }
				: getElapsedMatchTime();
		const tossOutcome =
			matchObject.value.toss_outcome ??
			props.match.toss_outcome ??
			TossOutcome.NotDecided;

		await matchQueue(props.match.id).enqueue(async () => {
			const matchStatsPayload = getMatchStatsPayload();
			if (matchStatsPayload.length > 0) {
				await matchStore.updateMatchStats(props.match.id, matchStatsPayload);
			}
			const updatedMatch = await matchStore.updateMatch(props.match.id, {
				status: playedStatus,
				outcome: finishedMatchMetadata.outcome,
				net_points: finishedMatchMetadata.netPoints,
				golden_strike: finishedMatchMetadata.goldenStrike,
				toss_outcome: tossOutcome,
				duration: elapsedMatchTime.duration,
				extra: elapsedMatchTime.extra,
			});
			syncMatchCardFromApi(updatedMatch);
		});

		winnerTeamId.value = finishedMatchMetadata.winnerTeamId;
		await matchStore.fetchMatches(props.match.season_id);
		showMatchManagementDialog.value = false;
	} catch (error) {
		console.error("Failed to persist finished match details", error);
		window.alert(error?.message || "Failed to save match details.");
	} finally {
		pauseLoader();
	}
};

onUnmounted(stopClockTick);

onUpdated(() => {
	const next =
		rosterStore.teams
			.get(props.match.season_id)
			?.filter((team) => team.team_id === props.match.team1 || team.team_id === props.match.team2) || [];
	const current = teamDetails.value || [];
	const same =
		next.length === current.length &&
		next.every(
			(team, index) =>
				team.team_id === current[index]?.team_id && team.players?.length === current[index]?.players?.length,
		);
	if (!same) teamDetails.value = next;
});

watch(teamDetails, () => {
	if (showMatchManager.value) setScorecardPlayerIds();
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

.match-card:focus-visible {
	outline: 3px solid var(--cpl-gold-500);
	outline-offset: 3px;
}

.fixtures-team-logo {
	width: 60px;
	height: 60px;
	max-width: none;
	flex-shrink: 0;
	object-fit: cover;
	border-radius: 50%;
}

@media (min-width: 768px) {
	.match-card {
		display: grid;
		grid-template-columns: 60px minmax(0, 1fr) minmax(140px, auto) minmax(0, 1fr) 60px;
		align-items: center;
		column-gap: 12px;
		margin: 0;

		> * {
			width: auto !important;
			max-width: none;
			padding-right: 0;
			padding-left: 0;
		}
	}

	.fixture-team-name {
		overflow-wrap: break-word;
	}

	.match-card > :nth-child(4) {
		text-align: right;
	}
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
	width: min(100%, 440px);
	max-height: calc(100vh - 280px);
	overflow: auto;
	border-radius: 12px;
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
	transition: all 0.3s ease;
}

.score-player + .score-player {
	margin-top: 12px;
	padding-top: 12px;
	border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.score-player-name {
	display: flex;
	align-items: center;
	margin-bottom: 8px;
}

.score-metric {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto 78px;
	align-items: center;
	gap: 8px;
	margin-top: 6px;
	font-size: 13px;
}

.score-limit {
	color: #6c757d;
	font-size: 11px;
	white-space: nowrap;
}

.score-empty {
	margin: 0;
	color: #6c757d;
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

.match-access-note {
	margin-right: auto;
	color: var(--cpl-ink-600);
	font-size: 13px;
}

@media (max-width: 767.98px) {
	.match-card {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr) minmax(0, 1fr);
		grid-template-rows: auto auto;
		align-items: center;
		gap: 6px 8px;
		margin: 0;
		padding: 0.9rem 0.6rem !important;
	}

	.match-card > * {
		width: auto !important;
		max-width: none;
		padding: 0 !important;
		display: flex;
		justify-content: center !important;
		text-align: center;
	}

	.match-card > :nth-child(1) {
		grid-column: 1;
		grid-row: 1;
	}

	.match-card > :nth-child(2) {
		grid-column: 1;
		grid-row: 2;
		align-self: start;
	}

	.match-card > :nth-child(3) {
		grid-column: 2;
		grid-row: 1 / span 2;
	}

	.match-card > :nth-child(4) {
		grid-column: 3;
		grid-row: 2;
		align-self: start;
	}

	.match-card > :nth-child(5) {
		grid-column: 3;
		grid-row: 1;
	}

	.fixture-team-name {
		font-size: 13px;
		font-weight: 500;
		line-height: 1.25;
		overflow-wrap: anywhere;
	}

	.fixtures-team-logo {
		width: 42px;
		height: 42px;
	}

	.match-info .team-logo {
		width: 110px;
		height: 110px;
	}

	.match-info {
		margin: 0.5rem 0 !important;
	}

	.match-info-grid {
		display: grid !important;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 14px 10px;
		margin: 0;

		> .col-4 {
			width: auto;
			padding: 0;
		}

		.info-center {
			grid-column: 1 / -1;
			grid-row: 1;
			padding: 10px;
			border-radius: 10px;
			background: rgba(15, 23, 42, 0.04);
			font-size: 13px;
		}

		.info-team {
			grid-row: 2;
		}

		.team-logo {
			width: 84px;
			height: 84px;
		}

		.team-members {
			width: 100%;
			padding: 10px !important;
			font-size: 13px;
			line-height: 1.3;
		}

		.player-avatar {
			flex-shrink: 0;
			width: 26px;
			height: 26px;
			margin-right: 8px;
		}
	}

	.dialog-footer:not(.match-started) {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		align-items: center;
		gap: 8px;

		.el-button + .el-button {
			margin-left: 0;
		}
	}

	.match-access-note {
		flex: 1 1 100%;
		text-align: left;
	}

	#match-live-info {
		height: auto;
		gap: 1.25rem;
		padding: 1rem !important;
	}

	#match-live-info > .col {
		flex: 0 0 100%;
		width: 100%;
	}

	.match-team-logo {
		width: 96px;
		height: 96px;
	}

	.team-scorecard {
		width: min(100%, 440px);
		max-height: none;
		padding: 0.75rem !important;
	}

	.score-metric {
		grid-template-columns: minmax(0, 1fr) auto;
		grid-template-areas:
			"label input"
			"limit input";
		row-gap: 0;
		line-height: 1.3;

		> span {
			grid-area: label;
		}

		> .el-input-number {
			grid-area: input;
		}

		> .score-limit {
			grid-area: limit;
		}
	}

	#stopwatch {
		width: 180px;
		height: 180px;
		border-width: 8px;
	}

	.countdown-frozen {
		font-size: 38px;
	}

	.dialog-footer.match-started {
		position: static;
		display: flex;
		justify-content: center;
		gap: 8px;
		padding: 0.75rem;
	}
}

@media (max-width: 420px) {
	.fixtures-team-logo {
		width: 38px;
		height: 38px;
	}

	.fixture-team-name {
		font-size: 12px;
	}

	.versus-text,
	.toss-text,
	.match-status-text {
		font-size: 11px;
	}
}
</style>
