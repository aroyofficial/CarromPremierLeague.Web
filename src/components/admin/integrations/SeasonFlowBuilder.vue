<template>
	<div class="sfb-studio">
		<div class="sfb-composer">
			<section class="sfb-block">
				<div class="sfb-block-head">
					<div>
						<h4>Starter templates &amp; broadcast look</h4>
						<p>Pick a preset to populate the sequence, then customize any stage or card below.</p>
					</div>
				</div>

				<div class="sfb-presets">
					<button
						v-for="preset in FLOW_PRESETS"
						:key="preset.id"
						type="button"
						class="sfb-preset"
						@click="applyPreset(preset)"
					>
						<strong>{{ preset.label }}</strong>
						<span>{{ preset.description }}</span>
					</button>
				</div>

				<div class="sfb-look-row">
					<span class="sfb-label">Accent palette</span>
					<div class="sfb-accents" role="radiogroup" aria-label="Broadcast accent color">
						<button
							v-for="accent in ACCENTS"
							:key="accent.value"
							type="button"
							class="sfb-accent-chip"
							:class="{ 'is-active': modelValue.theme_accent === accent.value }"
							@click="patchFlow({ theme_accent: accent.value })"
						>
							<span class="sfb-swatch" :style="{ background: accent.swatch }"></span>
							{{ accent.label }}
						</button>
					</div>
				</div>

				<div class="sfb-look-row">
					<span class="sfb-label">Scene transition</span>
					<div class="sfb-accents" role="radiogroup" aria-label="Scene transition style">
						<button
							v-for="style in TRANSITION_STYLES"
							:key="style.value"
							type="button"
							class="sfb-accent-chip"
							:class="{ 'is-active': (modelValue.transition_style || 'reveal') === style.value }"
							:title="style.hint"
							@click="chooseTransition(style.value)"
						>
							{{ style.label }}
						</button>
						<button type="button" class="sfb-mini-link" @click="replayTransition">Replay</button>
					</div>
				</div>
			</section>

			<section class="sfb-block">
				<div class="sfb-block-head">
					<div>
						<h4>Match lifecycle stages (automatic)</h4>
						<p>Whenever a match enters one of these states, the stream switches to it automatically.</p>
					</div>
				</div>

				<div class="sfb-pipeline">
					<div class="sfb-stage-card" :class="{ 'is-off': !stages.show_ready }">
						<div class="sfb-stage-top">
							<span class="sfb-step-num">1</span>
							<strong>Match Ready</strong>
							<button type="button" class="sfb-mini-link" @click="previewMode = 'match_ready'">Preview</button>
							<el-switch
								:model-value="stages.show_ready"
								size="small"
								@change="(val) => patchStages({ show_ready: Boolean(val) })"
							/>
						</div>
						<p>Shows VS matchup, team rosters, and Head-to-Head when an admin marks a match Ready.</p>
					</div>

					<div class="sfb-stage-card" :class="{ 'is-off': !stages.show_toss }">
						<div class="sfb-stage-top">
							<span class="sfb-step-num">2</span>
							<strong>Toss Ceremony</strong>
							<button type="button" class="sfb-mini-link" @click="previewMode = 'toss'">Preview</button>
							<el-switch
								:model-value="stages.show_toss"
								size="small"
								@change="(val) => patchStages({ show_toss: Boolean(val) })"
							/>
						</div>
						<p>Lower-third toss banner appears as soon as the coin lands while players set the board.</p>
					</div>

					<div class="sfb-stage-card" :class="{ 'is-off': !stages.show_live }">
						<div class="sfb-stage-top">
							<span class="sfb-step-num">3</span>
							<strong>Live Play Scorebug</strong>
							<button type="button" class="sfb-mini-link" @click="previewMode = 'live_bar'">Preview</button>
							<el-switch
								:model-value="stages.show_live"
								size="small"
								@change="(val) => patchStages({ show_live: Boolean(val) })"
							/>
						</div>
						<p>Compact lower-third keeping over 82% of the 16:9 Carrom board clear during play.</p>
						<div v-if="stages.show_live" class="sfb-stage-opts">
							<el-checkbox
								:model-value="stages.show_clock"
								label="Synced match clock"
								size="small"
								@change="(val) => patchStages({ show_clock: Boolean(val) })"
							/>
							<el-checkbox
								:model-value="stages.show_player_strip"
								label="Player coin/fine strip"
								size="small"
								@change="(val) => patchStages({ show_player_strip: Boolean(val) })"
							/>
						</div>
					</div>

					<div class="sfb-stage-card" :class="{ 'is-off': stages.result_duration_sec === 0 }">
						<div class="sfb-stage-top">
							<span class="sfb-step-num">4</span>
							<strong>Full-Time Result Hold</strong>
							<button type="button" class="sfb-mini-link" @click="previewMode = 'match_result'">Preview</button>
							<el-switch
								:model-value="stages.result_duration_sec !== 0"
								size="small"
								@change="(val) => patchStages({ result_duration_sec: val ? 20 : 0 })"
							/>
						</div>
						<p>
							Keeps the final scorecard on screen after a match ends until an operator marks the match complete, then
							starts the break rotation.
						</p>
					</div>
				</div>
			</section>

			<section class="sfb-block">
				<div class="sfb-block-head">
					<div>
						<h4>Intermission &amp; break rotation (drag &amp; drop)</h4>
						<p>Drag cards from the palette or reorder steps below to control what plays between matches.</p>
					</div>
				</div>

				<div class="sfb-idle-toggle">
					<span class="sfb-label">Between matches</span>
					<el-radio-group
						:model-value="modelValue.idle_mode"
						size="small"
						@change="(val) => patchFlow({ idle_mode: val })"
					>
						<el-radio-button value="loop">Loop continuously</el-radio-button>
						<el-radio-button value="once_then_clean">Play once after match, then clean camera</el-radio-button>
					</el-radio-group>
				</div>

				<div class="sfb-palette" aria-label="Overlay card palette">
					<div
						v-for="card in ROTATION_CARDS"
						:key="card.kind"
						class="sfb-palette-chip"
						draggable="true"
						:title="card.hint"
						@dragstart="onPaletteDragStart($event, card.kind)"
						@dragend="clearDrag"
					>
						<span class="sfb-grip" aria-hidden="true">⋮⋮</span>
						<span class="sfb-chip-label">{{ card.shortLabel }}</span>
						<button
							type="button"
							class="sfb-chip-add"
							:disabled="rotation.length >= 20"
							:aria-label="`Add ${card.label} to rotation`"
							@click="appendCard(card.kind)"
						>
							+
						</button>
					</div>
				</div>

				<div
					class="sfb-track"
					:class="{ 'is-dragging': dragging }"
					@dragover.prevent="onTrackDragOver"
					@drop.prevent="onTrackDropEnd"
				>
					<div v-if="!rotation.length" class="sfb-track-empty">
						Drop overlay cards here or click <strong>+</strong> above to build your intermission loop.
					</div>

					<div
						v-for="(step, idx) in rotation"
						:key="step.id"
						class="sfb-step"
						:class="{
							'is-disabled': step.enabled === false,
							'is-drop-before': dropIndex === idx,
						}"
						draggable="true"
						@dragstart="onStepDragStart($event, idx)"
						@dragover.prevent.stop="onStepDragOver(idx)"
						@drop.prevent.stop="onStepDrop(idx)"
						@dragend="clearDrag"
					>
						<span class="sfb-grip" title="Drag to reorder" aria-hidden="true">⋮⋮</span>
						<span class="sfb-order">{{ idx + 1 }}</span>

						<div class="sfb-step-info">
							<strong>{{ cardMeta(step.kind).label }}</strong>
							<span>{{ cardMeta(step.kind).hint }}</span>
						</div>

						<div class="sfb-step-controls">
							<button type="button" class="sfb-mini-link" @click="previewMode = step.kind">Preview</button>
							<div class="sfb-dur">
								<el-input-number
									:model-value="step.duration_sec"
									:min="minSecForKind(step.kind)"
									:max="180"
									:step="5"
									size="small"
									controls-position="right"
									:aria-label="`Duration in seconds for ${cardMeta(step.kind).label}`"
									@change="(val) => updateStep(idx, { duration_sec: Number(val || minSecForKind(step.kind)) })"
								/>
								<span>s</span>
							</div>
							<div class="sfb-arrows">
								<button
									type="button"
									class="sfb-icon-btn"
									:disabled="idx === 0"
									:aria-label="`Move ${cardMeta(step.kind).label} up`"
									@click="nudgeStep(idx, idx - 1)"
								>
									↑
								</button>
								<button
									type="button"
									class="sfb-icon-btn"
									:disabled="idx === rotation.length - 1"
									:aria-label="`Move ${cardMeta(step.kind).label} down`"
									@click="nudgeStep(idx, idx + 1)"
								>
									↓
								</button>
							</div>
							<el-switch
								:model-value="step.enabled !== false"
								size="small"
								:aria-label="`Enable ${cardMeta(step.kind).label}`"
								@change="(val) => updateStep(idx, { enabled: Boolean(val) })"
							/>
							<button
								type="button"
								class="sfb-icon-btn is-danger"
								:aria-label="`Remove ${cardMeta(step.kind).label}`"
								@click="removeStep(idx)"
							>
								×
							</button>
						</div>
					</div>
				</div>
			</section>
		</div>

		<aside class="sfb-monitor-col">
			<div class="sfb-monitor-sticky">
				<div class="sfb-monitor-head">
					<div>
						<span class="sfb-onair-dot"></span>
						<strong>16:9 Stream Preview</strong>
						<small>1920×1080</small>
					</div>
					<el-checkbox v-model="showSafeZone" label="FB Live safe zone" size="small" />
				</div>

				<div class="sfb-scene-tabs" role="tablist" aria-label="Preview scene">
					<button
						v-for="tab in PREVIEW_TABS"
						:key="tab.value"
						type="button"
						class="sfb-scene-tab"
						:class="{ 'is-active': previewMode === tab.value }"
						@click="previewMode = tab.value"
					>
						{{ tab.label }}
					</button>
				</div>

				<div ref="viewportRef" class="sfb-viewport">
					<div class="sfb-board-backdrop" aria-hidden="true">
						<div class="sfb-board-frame">
							<div class="sfb-board-surface">
								<span class="sfb-pocket is-tl"></span>
								<span class="sfb-pocket is-tr"></span>
								<span class="sfb-pocket is-bl"></span>
								<span class="sfb-pocket is-br"></span>
								<div class="sfb-board-circle"></div>
							</div>
						</div>
					</div>

					<div
						class="sfb-scaled-stage"
						:style="{ transform: `translate(-50%, -50%) scale(${previewScale})` }"
					>
						<BroadcastStageScene
							v-if="previewSnapshot"
							:snapshot="previewSnapshot"
							:flow-override="modelValue"
							:preview-scene="previewMode"
							:now-ms="nowMs"
						/>
					</div>

					<div v-if="showSafeZone" class="sfb-safe-overlay" aria-hidden="true">
						<div class="sfb-fb-badge">
							<span class="sfb-fb-live">LIVE</span>
							<span class="sfb-fb-views">1.4K</span>
						</div>
						<div class="sfb-safe-box">
							<span>Title-safe 16:9 zone</span>
						</div>
					</div>
				</div>

				<p class="sfb-monitor-caption">
					Simulated tabletop camera feed behind your transparent <code>1920×1080</code> overlay. Click any stage or card to inspect its exact framing.
				</p>
			</div>
		</aside>
	</div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { adminApi } from "@/services/adminService";
import { unwrap } from "@/utils/adminHelpers";
import { areas } from "@/utils/realtimeRules";
import { useLive } from "@/utils/useLive";
import {
	FLOW_PRESETS,
	ROTATION_CARD_MAP,
	ROTATION_CARDS,
	TRANSITION_STYLES,
	cloneFlowConfig,
	insertStepAt,
	minSecForKind,
	moveStep,
} from "@/utils/widgetFlow";
import BroadcastStageScene from "@/views/widgets/BroadcastStageScene.vue";

const props = defineProps({
	modelValue: { type: Object, required: true },
	seasonId: { type: Number, default: null },
});

const emit = defineEmits(["update:modelValue"]);

const ACCENTS = [
	{ value: "gold", label: "CPL Gold", swatch: "#f5b82e" },
	{ value: "royal", label: "Royal Blue", swatch: "#38bdf8" },
	{ value: "crimson", label: "Crimson", swatch: "#f43f5e" },
];

const PREVIEW_TABS = [
	{ value: "auto", label: "Auto Live" },
	{ value: "live_bar", label: "Live Bar" },
	{ value: "match_ready", label: "Ready" },
	{ value: "toss", label: "Toss" },
	{ value: "match_result", label: "Result" },
	{ value: "points_table", label: "Points" },
	{ value: "stats", label: "Stats" },
	{ value: "bracket", label: "Bracket" },
	{ value: "champion", label: "Champion" },
	{ value: "fixtures", label: "Fixtures" },
];

const stages = computed(() => props.modelValue?.match_stages || {});
const rotation = computed(() => props.modelValue?.rotation || []);
const cardMeta = (kind) => ROTATION_CARD_MAP[kind] || ROTATION_CARDS[0];

const previewMode = ref("live_bar");
const showSafeZone = ref(true);
const previewSnapshot = ref(null);
const viewportRef = ref(null);
const previewScale = ref(0.24);
const nowMs = ref(Date.now());

const dragging = ref(null);
const dropIndex = ref(null);

let resizeObserver = null;
let clockTimer = null;
let previewReq = 0;

const patchFlow = (patch) => {
	emit("update:modelValue", cloneFlowConfig({ ...props.modelValue, ...patch }));
};

const patchStages = (patch) => {
	patchFlow({ match_stages: { ...stages.value, ...patch } });
};

let replayTimer = null;

// Takes the preview off air and back on so the chosen transition plays once in front of the admin.
const replayTransition = () => {
	const keep = previewMode.value === "clean" ? "auto" : previewMode.value;
	previewMode.value = "clean";
	window.clearTimeout(replayTimer);
	replayTimer = window.setTimeout(() => {
		previewMode.value = keep;
	}, 1200);
};

const chooseTransition = (value) => {
	patchFlow({ transition_style: value });
	replayTransition();
};

const applyPreset = (preset) => {
	const next = preset.build();
	next.theme_accent = props.modelValue?.theme_accent || "gold";
	next.director = props.modelValue?.director || next.director;
	emit("update:modelValue", next);
	previewMode.value = "auto";
};

const appendCard = (kind) => {
	patchFlow({ rotation: insertStepAt(rotation.value, kind, null) });
	previewMode.value = kind;
};

const updateStep = (index, patch) => {
	const next = rotation.value.map((step, idx) => (idx === index ? { ...step, ...patch } : step));
	patchFlow({ rotation: next });
};

const nudgeStep = (from, to) => {
	patchFlow({ rotation: moveStep(rotation.value, from, to) });
};

const removeStep = (index) => {
	patchFlow({ rotation: rotation.value.filter((_, idx) => idx !== index) });
};

const onPaletteDragStart = (event, kind) => {
	dragging.value = { source: "palette", kind };
	if (event.dataTransfer) {
		event.dataTransfer.effectAllowed = "copy";
		event.dataTransfer.setData("text/plain", `palette:${kind}`);
	}
};

const onStepDragStart = (event, index) => {
	dragging.value = { source: "step", index };
	if (event.dataTransfer) {
		event.dataTransfer.effectAllowed = "move";
		event.dataTransfer.setData("text/plain", `step:${index}`);
	}
};

const onStepDragOver = (index) => {
	if (!dragging.value) return;
	dropIndex.value = index;
};

const onTrackDragOver = () => {
	if (!dragging.value) return;
	dropIndex.value = rotation.value.length;
};

const onStepDrop = (targetIndex) => {
	const current = dragging.value;
	clearDrag();
	if (!current) return;
	if (current.source === "palette") {
		patchFlow({ rotation: insertStepAt(rotation.value, current.kind, targetIndex) });
		previewMode.value = current.kind;
	} else if (current.source === "step") {
		patchFlow({ rotation: moveStep(rotation.value, current.index, targetIndex) });
	}
};

const onTrackDropEnd = () => {
	const current = dragging.value;
	clearDrag();
	if (!current) return;
	if (current.source === "palette") {
		patchFlow({ rotation: insertStepAt(rotation.value, current.kind, null) });
		previewMode.value = current.kind;
	} else if (current.source === "step") {
		patchFlow({ rotation: moveStep(rotation.value, current.index, rotation.value.length - 1) });
	}
};

const clearDrag = () => {
	dragging.value = null;
	dropIndex.value = null;
};

const syntheticEmptySnapshot = () => ({
	type: "season_flow",
	server_now: new Date().toISOString(),
	season: { id: props.seasonId || 1, name: "CPL Championship" },
	clock: { regulation_minutes: 15, extra_minutes: 5 },
	flow: props.modelValue,
	matches: [],
	active_match: null,
	last_completed_match: null,
	next_scheduled_match: null,
	points_table: {
		winner_name: null,
		standings: [
			{ rank: 1, team_id: 1, team_name: "Carrom Kings", matches_played: 3, wins: 3, draws: 0, net_points: 14, points: 6 },
			{ rank: 2, team_id: 2, team_name: "Board Strikers", matches_played: 3, wins: 2, draws: 0, net_points: 6, points: 4 },
			{ rank: 3, team_id: 3, team_name: "Queen Hunters", matches_played: 3, wins: 1, draws: 0, net_points: -4, points: 2 },
			{ rank: 4, team_id: 4, team_name: "Pocket Aces", matches_played: 3, wins: 0, draws: 0, net_points: -16, points: 0 },
		],
	},
	top_stats: {
		is_league_stage_completed: false,
		matches_played: 6,
		players: [
			{ rank: 1, player_id: 1, name: "Player One", team_name: "Carrom Kings", net_coins: 16, coins_pocketed: 18, coins_fined: 2, strikers_pocketed: 1 },
			{ rank: 2, player_id: 2, name: "Player Two", team_name: "Board Strikers", net_coins: 12, coins_pocketed: 13, coins_fined: 1, strikers_pocketed: 0 },
			{ rank: 3, player_id: 3, name: "Player Three", team_name: "Queen Hunters", net_coins: 9, coins_pocketed: 11, coins_fined: 2, strikers_pocketed: 1 },
		],
	},
});

const loadPreview = async () => {
	const req = ++previewReq;
	if (!props.seasonId) {
		previewSnapshot.value = syntheticEmptySnapshot();
		return;
	}
	try {
		const data = unwrap(await adminApi.widgets.seasonPreview(props.seasonId));
		if (req !== previewReq) return;
		previewSnapshot.value = data || syntheticEmptySnapshot();
	} catch {
		if (req === previewReq) previewSnapshot.value = syntheticEmptySnapshot();
	}
};

const measureViewport = () => {
	const el = viewportRef.value;
	if (!el) return;
	const width = el.clientWidth || 420;
	previewScale.value = width / 1920;
};

useLive(loadPreview, { areas: areas.widget });

watch(
	() => props.seasonId,
	() => {
		loadPreview();
	},
	{ immediate: true },
);

onMounted(() => {
	measureViewport();
	if (typeof ResizeObserver !== "undefined" && viewportRef.value) {
		resizeObserver = new ResizeObserver(measureViewport);
		resizeObserver.observe(viewportRef.value);
	}
	clockTimer = window.setInterval(() => {
		nowMs.value = Date.now();
	}, 1000);
});

onUnmounted(() => {
	resizeObserver?.disconnect();
	if (clockTimer) window.clearInterval(clockTimer);
	window.clearTimeout(replayTimer);
});
</script>

<style scoped>
.sfb-studio {
	display: grid;
	grid-template-columns: minmax(0, 1.15fr) minmax(360px, 0.85fr);
	gap: 22px;
	align-items: stretch;
}

.sfb-composer {
	display: flex;
	flex-direction: column;
	gap: 18px;
}

.sfb-block {
	padding: 16px;
	border-radius: 12px;
	border: 1px solid var(--el-border-color-lighter, #e2e8f0);
	background: var(--el-fill-color-blank, #fff);
}

.sfb-block-head h4 {
	margin: 0;
	font-size: 15px;
	font-weight: 700;
}

.sfb-block-head p {
	margin: 3px 0 12px;
	font-size: 12.5px;
	opacity: 0.72;
}

.sfb-presets {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 8px;
}

.sfb-preset {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 10px 12px;
	border-radius: 10px;
	border: 1px solid var(--el-border-color, #cbd5e1);
	background: transparent;
	text-align: left;
	color: inherit;
	cursor: pointer;
	transition: border-color 0.15s ease, background 0.15s ease;
}

.sfb-preset:hover {
	border-color: #d4a017;
	background: rgba(212, 160, 23, 0.06);
}

.sfb-preset strong {
	font-size: 13px;
}

.sfb-preset span {
	font-size: 11.5px;
	opacity: 0.75;
	line-height: 1.35;
}

.sfb-look-row,
.sfb-idle-toggle {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	margin-top: 12px;
	padding-top: 12px;
	border-top: 1px solid var(--el-border-color-lighter, #e2e8f0);
}

.sfb-idle-toggle {
	margin-top: 0;
	margin-bottom: 12px;
	padding-top: 0;
	border-top: none;
}

.sfb-label {
	font-size: 12.5px;
	font-weight: 600;
	opacity: 0.85;
}

.sfb-accents {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
}

.sfb-accent-chip {
	display: inline-flex;
	align-items: center;
	gap: 7px;
	padding: 5px 11px;
	border-radius: 999px;
	border: 1px solid var(--el-border-color, #cbd5e1);
	background: transparent;
	color: inherit;
	font-size: 12.5px;
	font-weight: 600;
	cursor: pointer;
}

.sfb-accent-chip.is-active {
	border-color: #d4a017;
	box-shadow: inset 0 0 0 1px #d4a017;
}

.sfb-swatch {
	width: 11px;
	height: 11px;
	border-radius: 50%;
}

.sfb-pipeline {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 10px;
}

.sfb-stage-card {
	padding: 12px;
	border-radius: 10px;
	border: 1px solid var(--el-border-color-light, #e2e8f0);
	background: var(--el-fill-color-lighter, rgba(148, 163, 184, 0.06));
}

.sfb-stage-card.is-off {
	opacity: 0.58;
}

.sfb-stage-top {
	display: flex;
	align-items: center;
	gap: 8px;
}

.sfb-stage-top strong {
	flex: 1;
	font-size: 13px;
}

.sfb-step-num {
	display: inline-grid;
	place-items: center;
	width: 21px;
	height: 21px;
	border-radius: 6px;
	background: rgba(212, 160, 23, 0.2);
	color: #b45309;
	font-size: 11.5px;
	font-weight: 800;
}

.sfb-stage-card p {
	margin: 6px 0 0;
	font-size: 11.8px;
	line-height: 1.4;
	opacity: 0.75;
}

.sfb-stage-opts {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
	margin-top: 8px;
	padding-top: 8px;
	border-top: 1px dashed var(--el-border-color, #cbd5e1);
}

.sfb-hold-input {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	font-size: 12px;
}

.sfb-hold-input :deep(.el-input-number) {
	width: 82px;
}

.sfb-palette {
	display: flex;
	flex-wrap: wrap;
	gap: 7px;
	margin-bottom: 12px;
}

.sfb-palette-chip {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 5px 6px 5px 10px;
	border-radius: 999px;
	border: 1px dashed var(--el-border-color, #94a3b8);
	background: var(--el-fill-color-lighter, rgba(148, 163, 184, 0.08));
	font-size: 12px;
	font-weight: 600;
	cursor: grab;
	user-select: none;
}

.sfb-chip-add {
	display: inline-grid;
	place-items: center;
	width: 22px;
	height: 22px;
	border: none;
	border-radius: 50%;
	background: rgba(212, 160, 23, 0.22);
	color: inherit;
	font-weight: 800;
	cursor: pointer;
}

.sfb-chip-add:disabled {
	opacity: 0.4;
	cursor: not-allowed;
}

.sfb-track {
	display: flex;
	flex-direction: column;
	gap: 8px;
	min-height: 76px;
	padding: 10px;
	border-radius: 10px;
	border: 1px dashed var(--el-border-color, #cbd5e1);
}

.sfb-track.is-dragging {
	border-color: #d4a017;
	background: rgba(212, 160, 23, 0.04);
}

.sfb-track-empty {
	padding: 18px;
	text-align: center;
	font-size: 12.5px;
	opacity: 0.7;
}

.sfb-step {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 9px 11px;
	border-radius: 10px;
	border: 1px solid var(--el-border-color-light, #e2e8f0);
	background: var(--el-fill-color-blank, #fff);
	cursor: grab;
}

.sfb-step.is-disabled {
	opacity: 0.5;
}

.sfb-step.is-drop-before {
	border-top: 2.5px solid #d4a017;
}

.sfb-grip {
	opacity: 0.45;
	font-weight: 700;
	letter-spacing: -1px;
}

.sfb-order {
	display: inline-grid;
	place-items: center;
	width: 22px;
	height: 22px;
	border-radius: 50%;
	background: var(--el-fill-color, #f1f5f9);
	font-size: 11.5px;
	font-weight: 700;
	flex-shrink: 0;
}

.sfb-step-info {
	display: flex;
	flex-direction: column;
	min-width: 0;
	flex: 1;
}

.sfb-step-info strong {
	font-size: 13px;
}

.sfb-step-info span {
	font-size: 11.5px;
	opacity: 0.68;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.sfb-step-controls {
	display: flex;
	align-items: center;
	gap: 7px;
	flex-shrink: 0;
}

.sfb-dur {
	display: inline-flex;
	align-items: center;
	gap: 3px;
	font-size: 12px;
}

.sfb-dur :deep(.el-input-number) {
	width: 78px;
}

.sfb-arrows {
	display: inline-flex;
	gap: 2px;
}

.sfb-icon-btn {
	width: 24px;
	height: 24px;
	border: 1px solid var(--el-border-color, #cbd5e1);
	border-radius: 6px;
	background: transparent;
	color: inherit;
	font-size: 12px;
	line-height: 1;
	cursor: pointer;
}

.sfb-icon-btn:disabled {
	opacity: 0.35;
	cursor: not-allowed;
}

.sfb-icon-btn.is-danger:hover {
	border-color: #ef4444;
	color: #ef4444;
}

.sfb-mini-link {
	border: none;
	background: none;
	color: #d97706;
	font-size: 11.5px;
	font-weight: 700;
	cursor: pointer;
	padding: 2px 4px;
}

.sfb-mini-link:hover {
	text-decoration: underline;
}

.sfb-monitor-col {
	position: relative;
}

.sfb-monitor-sticky {
	position: sticky;
	top: 8px;
	padding: 14px;
	border-radius: 14px;
	border: 1px solid var(--el-border-color-lighter, #e2e8f0);
	background: var(--el-fill-color-blank, #fff);
}

.sfb-monitor-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	margin-bottom: 10px;
}

.sfb-monitor-head strong {
	font-size: 13.5px;
	margin-right: 6px;
}

.sfb-monitor-head small {
	font-size: 11.5px;
	opacity: 0.65;
}

.sfb-onair-dot {
	display: inline-block;
	width: 8px;
	height: 8px;
	margin-right: 6px;
	border-radius: 50%;
	background: #ef4444;
}

.sfb-scene-tabs {
	display: flex;
	flex-wrap: wrap;
	gap: 5px;
	margin-bottom: 10px;
}

.sfb-scene-tab {
	padding: 4px 9px;
	border-radius: 999px;
	border: 1px solid var(--el-border-color, #cbd5e1);
	background: transparent;
	color: inherit;
	font-size: 11.5px;
	font-weight: 600;
	cursor: pointer;
}

.sfb-scene-tab.is-active {
	background: #0f172a;
	border-color: #0f172a;
	color: #f8fafc;
}

.sfb-viewport {
	position: relative;
	width: 100%;
	aspect-ratio: 16 / 9;
	border-radius: 10px;
	overflow: hidden;
	background: radial-gradient(circle at 50% 42%, #2c3548 0%, #111827 100%);
	border: 1px solid #1e293b;
}

.sfb-board-backdrop {
	position: absolute;
	inset: 0;
	display: grid;
	place-items: center;
	pointer-events: none;
}

.sfb-board-frame {
	width: 44%;
	aspect-ratio: 1 / 1;
	padding: 10px;
	border-radius: 12px;
	background: linear-gradient(145deg, #432818, #26150c);
	box-shadow: 0 12px 30px rgba(0, 0, 0, 0.55);
}

.sfb-board-surface {
	position: relative;
	width: 100%;
	height: 100%;
	border-radius: 5px;
	background: radial-gradient(circle, #ebd5b3 0%, #d8bc90 100%);
	display: grid;
	place-items: center;
}

.sfb-board-circle {
	width: 32%;
	height: 32%;
	border-radius: 50%;
	border: 2px solid rgba(127, 29, 29, 0.45);
}

.sfb-pocket {
	position: absolute;
	width: 10px;
	height: 10px;
	border-radius: 50%;
	background: #1f1612;
}

.sfb-pocket.is-tl { top: 5px; left: 5px; }
.sfb-pocket.is-tr { top: 5px; right: 5px; }
.sfb-pocket.is-bl { bottom: 5px; left: 5px; }
.sfb-pocket.is-br { bottom: 5px; right: 5px; }

.sfb-scaled-stage {
	position: absolute;
	left: 50%;
	top: 50%;
	width: 1920px;
	height: 1080px;
	transform-origin: center center;
	pointer-events: none;
}

.sfb-safe-overlay {
	position: absolute;
	inset: 0;
	pointer-events: none;
}

.sfb-fb-badge {
	position: absolute;
	top: 10px;
	left: 12px;
	display: inline-flex;
	align-items: center;
	gap: 5px;
	font-size: 9px;
	font-weight: 800;
}

.sfb-fb-live {
	padding: 2px 5px;
	border-radius: 3px;
	background: #e11d48;
	color: #fff;
}

.sfb-fb-views {
	padding: 2px 5px;
	border-radius: 3px;
	background: rgba(0, 0, 0, 0.6);
	color: #fff;
}

.sfb-safe-box {
	position: absolute;
	inset: 5.2% 5%;
	border: 1px dashed rgba(250, 204, 21, 0.42);
	border-radius: 4px;
}

.sfb-safe-box span {
	position: absolute;
	top: 4px;
	right: 6px;
	font-size: 9px;
	color: rgba(250, 204, 21, 0.8);
}

.sfb-monitor-caption {
	margin: 10px 0 0;
	font-size: 11.5px;
	line-height: 1.45;
	opacity: 0.72;
}

@media (max-width: 980px) {
	.sfb-studio {
		grid-template-columns: 1fr;
	}

	.sfb-presets,
	.sfb-pipeline {
		grid-template-columns: 1fr;
	}
}
</style>
