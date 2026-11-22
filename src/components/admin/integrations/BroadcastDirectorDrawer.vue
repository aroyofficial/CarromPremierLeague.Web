<template>
	<el-drawer
		:model-value="modelValue"
		:title="widget ? `Live Broadcast Director · ${widget.name}` : 'Live Broadcast Director'"
		direction="rtl"
		size="min(900px, 100vw)"
		class="ip-drawer"
		append-to-body
		destroy-on-close
		@update:model-value="(val) => emit('update:modelValue', val)"
		@open="loadPreview"
	>
		<div class="ip-drawer-body bdd-body" v-loading="loading && !snapshot">
			<section class="bdd-monitor-card">
				<div class="bdd-monitor-bar">
					<div class="bdd-air-pill">
						<span class="bdd-dot"></span>
						<strong>ON AIR NOW</strong>
						<span class="bdd-scene-name">{{ activeSummary }}</span>
					</div>
					<el-checkbox v-model="showSafeZone" label="FB Live safe zone" size="small" />
				</div>

				<div ref="viewportRef" class="bdd-viewport">
					<div class="bdd-backdrop" aria-hidden="true"></div>
					<div
						class="bdd-scaled"
						:style="{ transform: `translate(-50%, -50%) scale(${scale})` }"
					>
						<BroadcastStageScene v-if="snapshot" :snapshot="snapshot" :now-ms="syncedNowMs" />
					</div>
					<div v-if="showSafeZone" class="bdd-safe-guide" aria-hidden="true"></div>
				</div>
			</section>

			<section class="ip-section">
				<h3>Stream switcher</h3>
				<p class="ip-section-hint">
					Auto mode follows your season flow automatically. Use <strong>Push 20s</strong> for a timed cutaway that returns to Auto on its own, or <strong>Pin</strong> to hold a graphic.
				</p>

				<div class="bdd-mode-bar">
					<el-button
						:type="directorMode === 'auto' ? 'primary' : 'default'"
						:loading="busyKey === 'auto'"
						@click="setDirector({ mode: 'auto', card: null, match_id: null, until_utc: null }, 'auto')"
					>
						Follow Auto Flow
					</el-button>
					<el-button
						:type="directorMode === 'clean' && !directorUntil ? 'warning' : 'default'"
						:loading="busyKey === 'clean'"
						@click="setDirector({ mode: 'clean', card: null, match_id: null, until_utc: null }, 'clean')"
					>
						Clean Camera (Hide Overlays)
					</el-button>
					<el-button
						:loading="busyKey === 'clean-30'"
						@click="pushClean(30)"
					>
						Clean Camera for 30s
					</el-button>
				</div>

				<div class="bdd-cards-grid">
					<div
						v-for="item in DIRECTOR_PIN_CARDS"
						:key="item.card"
						class="bdd-card-tile"
						:class="{ 'is-pinned': directorMode === 'pin' && directorCard === item.card }"
					>
						<strong>{{ item.label }}</strong>
						<div class="bdd-tile-actions">
							<el-button
								size="small"
								:loading="busyKey === `push:${item.card}`"
								@click="pushCard(item.card, 20)"
							>
								Push 20s
							</el-button>
							<el-button
								size="small"
								type="primary"
								plain
								:loading="busyKey === `pin:${item.card}`"
								@click="pinCard(item.card)"
							>
								Pin
							</el-button>
						</div>
					</div>
				</div>
			</section>

			<section v-if="canUpdateMatches && finishedOnStream" class="ip-section">
				<h3>Finished match on stream</h3>
				<p class="ip-section-hint">
					A finished match keeps its scorecard on screen until you mark it complete. Then the stream moves on to the
					break rotation.
				</p>
				<div class="bdd-match-cue">
					<div>
						<strong>Match #{{ finishedOnStream.order ?? finishedOnStream.match_order }} · {{ finishedOnStream.team1?.name || "TBD" }} vs {{ finishedOnStream.team2?.name || "TBD" }}</strong>
						<span>{{ resultLine(finishedOnStream) }}</span>
					</div>
					<div class="bdd-cue-btns">
						<el-button type="success" size="small" :loading="matchBusy" @click="concludeMatch(finishedOnStream.id)">
							Mark complete
						</el-button>
					</div>
				</div>
			</section>

			<section v-if="canUpdateMatches && upcomingOrReadyMatch" class="ip-section">
				<h3>Table stage cue</h3>
				<p class="ip-section-hint"> Cue the next fixture on stream when players step up to the Carrom board.</p>
				<div class="bdd-match-cue">
					<div>
						<strong>Match #{{ upcomingOrReadyMatch.order ?? upcomingOrReadyMatch.match_order }} · {{ upcomingOrReadyMatch.team1?.name || "TBD" }} vs {{ upcomingOrReadyMatch.team2?.name || "TBD" }}</strong>
						<span>
							{{ isReadyMatch ? "Currently marked Ready on stream" : "Scheduled · Waiting to be called to the table" }}
						</span>
					</div>
					<div class="bdd-cue-btns">
						<el-button
							v-if="!isReadyMatch"
							type="primary"
							size="small"
							:loading="matchBusy"
							@click="toggleReady(upcomingOrReadyMatch.id, true)"
						>
							Mark Ready on Stream
						</el-button>
						<el-button
							v-else
							size="small"
							:loading="matchBusy"
							@click="toggleReady(upcomingOrReadyMatch.id, false)"
						>
							Clear Ready
						</el-button>
						<router-link class="el-button el-button--small" to="/admin/matches">Open Matches</router-link>
					</div>
				</div>
			</section>
		</div>

		<div class="ip-drawer-foot">
			<el-button @click="emit('update:modelValue', false)">Close</el-button>
		</div>
	</el-drawer>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { adminApi, apiErrorMessage } from "@/services/adminService";
import { useAuthStore } from "@/store/authStore";
import { unwrap } from "@/utils/adminHelpers";
import { Permission } from "@/utils/constants";
import { notify } from "@/utils/notify";
import { areas } from "@/utils/realtimeRules";
import { useLive } from "@/utils/useLive";
import { DIRECTOR_PIN_CARDS, computeClockOffset, resolveActiveScene } from "@/utils/widgetFlow";
import { awaitsCompletion, isReady, resultLine } from "@/utils/widgetScore";
import BroadcastStageScene from "@/views/widgets/BroadcastStageScene.vue";

const props = defineProps({
	modelValue: { type: Boolean, default: false },
	widget: { type: Object, default: null },
});

const emit = defineEmits(["update:modelValue", "updated"]);

const authStore = useAuthStore();
const canUpdateMatches = computed(() => authStore.can(Permission.MATCHES_UPDATE));

const snapshot = ref(null);
const loading = ref(false);
const busyKey = ref("");
const matchBusy = ref(false);
const showSafeZone = ref(false);
const viewportRef = ref(null);
const scale = ref(0.4);
const clockOffsetMs = ref(0);
const clientNowMs = ref(Date.now());
const syncedNowMs = computed(() => clientNowMs.value + clockOffsetMs.value);

let resizeObserver = null;
let tickTimer = null;

const activeState = computed(() => resolveActiveScene(snapshot.value, syncedNowMs.value));
const director = computed(() => snapshot.value?.flow?.director || { mode: "auto" });
const directorMode = computed(() => ( activeState.value.source === "director" ? director.value.mode : "auto" ));
const directorCard = computed(() => director.value.card || null);
const directorUntil = computed(() => director.value.until_utc || null);

const activeSummary = computed(() => {
	const cur = activeState.value;
	if (!snapshot.value) return "Connecting…";
	const sceneLabel = {
		clean: "Clean Camera",
		live_bar: "Live Scorebug",
		toss: "Toss Ceremony",
		match_ready: "Match Ready / Up Next",
		match_result: "Match Result",
		scorecard: "Full Scorecard",
		points_table: "Points Table",
		stats: "Golden Striker & Stats",
		bracket: "Knockout Bracket",
		tie_breakers: "Tie-breakers",
		champion: "Season Champions",
		fixtures: "Fixtures & Results",
	}[cur.scene] || cur.scene;
	const prefix = cur.source === "director" ? "Director Override" : "Auto Flow";
	const timer = cur.remainingSec ? ` (${cur.remainingSec}s)` : "";
	return `${prefix} · ${sceneLabel}${timer}`;
});

const upcomingOrReadyMatch = computed(() => {
	const active = snapshot.value?.active_match?.match;
	if (active && active.status === 1) return active;
	return snapshot.value?.next_scheduled_match?.match || null;
});

const isReadyMatch = computed(() => isReady(upcomingOrReadyMatch.value));

const finishedOnStream = computed(() => {
	const match = snapshot.value?.last_completed_match?.match;
	return awaitsCompletion(match) ? match : null;
});

const loadPreview = async () => {
	if (!props.modelValue || !props.widget?.id) return;
	loading.value = true;
	try {
		const data = unwrap(await adminApi.widgets.preview(props.widget.id));
		snapshot.value = data || null;
		if (data?.server_now) {
			clockOffsetMs.value = computeClockOffset(data.server_now, Date.now());
		}
		clientNowMs.value = Date.now();
		measure();
	} catch (error) {
		notify.error(apiErrorMessage(error, "Could not load live stream preview."));
	} finally {
		loading.value = false;
	}
};

const setDirector = async (directorPayload, key) => {
	if (!props.widget?.id) return;
	busyKey.value = key;
	try {
		await adminApi.widgets.update(props.widget.id, { director: directorPayload });
		await loadPreview();
		emit("updated");
	} catch (error) {
		notify.error(apiErrorMessage(error, "Director state could not be updated."));
	} finally {
		busyKey.value = "";
	}
};

const pushClean = (seconds) => {
	const until = new Date(Date.now() + seconds * 1000).toISOString();
	setDirector({ mode: "clean", card: null, match_id: null, until_utc: until }, `clean-${seconds}`);
};

const pushCard = (card, seconds) => {
	const until = new Date(Date.now() + seconds * 1000).toISOString();
	setDirector({ mode: "pin", card, match_id: null, until_utc: until }, `push:${card}`);
};

const pinCard = (card) => {
	setDirector({ mode: "pin", card, match_id: null, until_utc: null }, `pin:${card}`);
};

const toggleReady = async (matchId, ready) => {
	matchBusy.value = true;
	try {
		await adminApi.matches.update(matchId, { is_ready: ready });
		notify.success(ready ? "Match marked Ready on stream." : "Cleared Ready status.");
		await loadPreview();
	} catch (error) {
		notify.error(apiErrorMessage(error, "Match status could not be updated."));
	} finally {
		matchBusy.value = false;
	}
};

const concludeMatch = async (matchId) => {
	matchBusy.value = true;
	try {
		await adminApi.matches.update(matchId, { is_concluded: true });
		notify.success("Match marked complete. The stream moves on from its result.");
		await loadPreview();
	} catch (error) {
		notify.error(apiErrorMessage(error, "Match could not be marked complete."));
	} finally {
		matchBusy.value = false;
	}
};

const measure = () => {
	const el = viewportRef.value;
	if (!el) return;
	scale.value = (el.clientWidth || 760) / 1920;
};

useLive(loadPreview, { areas: areas.widget });

watch(
	() => props.widget?.id,
	() => {
		if (props.modelValue) loadPreview();
	},
);

onMounted(() => {
	measure();
	if (typeof ResizeObserver !== "undefined" && viewportRef.value) {
		resizeObserver = new ResizeObserver(measure);
		resizeObserver.observe(viewportRef.value);
	}
	tickTimer = window.setInterval(() => {
		clientNowMs.value = Date.now();
		measure();
	}, 1000);
});

onUnmounted(() => {
	resizeObserver?.disconnect();
	if (tickTimer) window.clearInterval(tickTimer);
});
</script>

<style scoped>
.bdd-body {
	display: flex;
	flex-direction: column;
	gap: 18px;
}

.bdd-monitor-card {
	padding: 14px;
	border-radius: 14px;
	border: 1px solid var(--el-border-color-lighter, #e2e8f0);
	background: var(--el-fill-color-blank, #fff);
}

.bdd-monitor-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	margin-bottom: 10px;
}

.bdd-air-pill {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	font-size: 13px;
}

.bdd-dot {
	width: 9px;
	height: 9px;
	border-radius: 50%;
	background: #ef4444;
	box-shadow: 0 0 8px #ef4444;
}

.bdd-scene-name {
	padding: 3px 10px;
	border-radius: 999px;
	background: rgba(212, 160, 23, 0.16);
	font-weight: 600;
	font-size: 12px;
}

.bdd-viewport {
	position: relative;
	width: 100%;
	aspect-ratio: 16 / 9;
	border-radius: 10px;
	overflow: hidden;
	background: radial-gradient(circle at 50% 45%, #2b3446 0%, #0f172a 100%);
	border: 1px solid #1e293b;
}

.bdd-backdrop {
	position: absolute;
	inset: 0;
	background-image: radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px);
	background-size: 24px 24px;
}

.bdd-scaled {
	position: absolute;
	left: 50%;
	top: 50%;
	width: 1920px;
	height: 1080px;
	transform-origin: center center;
	pointer-events: none;
}

.bdd-safe-guide {
	position: absolute;
	inset: 5.2% 5%;
	border: 1px dashed rgba(250, 204, 21, 0.5);
	pointer-events: none;
}

.bdd-mode-bar {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin-bottom: 14px;
}

.bdd-cards-grid {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 10px;
}

.bdd-card-tile {
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	gap: 10px;
	padding: 12px;
	border-radius: 10px;
	border: 1px solid var(--el-border-color, #cbd5e1);
}

.bdd-card-tile.is-pinned {
	border-color: #d4a017;
	background: rgba(212, 160, 23, 0.08);
}

.bdd-card-tile strong {
	font-size: 13px;
}

.bdd-tile-actions {
	display: flex;
	gap: 6px;
}

.bdd-match-cue {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 12px 14px;
	border-radius: 10px;
	border: 1px solid var(--el-border-color-light, #e2e8f0);
}

.bdd-match-cue strong {
	display: block;
	font-size: 13.5px;
}

.bdd-match-cue span {
	font-size: 12px;
	opacity: 0.72;
}

.bdd-cue-btns {
	display: flex;
	gap: 8px;
}

@media (max-width: 720px) {
	.bdd-cards-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}
</style>
