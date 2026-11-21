<template>
	<el-drawer
		:model-value="modelValue"
		:title="widget ? (isSeasonFlow ? 'Edit season broadcast flow' : 'Edit widget') : 'Create stream overlay'"
		direction="rtl"
		:size="isSeasonFlow ? 'min(1180px, 100vw)' : 'min(640px, 100vw)'"
		class="ip-drawer"
		append-to-body
		destroy-on-close
		:before-close="requestClose"
		@open="reset"
	>
		<div class="ip-drawer-body">
			<el-form label-position="top" novalidate @submit.prevent="submit">
				<div :class="isSeasonFlow ? 'wd-top-grid' : ''">
					<section class="ip-section">
						<h3>Name</h3>
						<p class="ip-section-hint">Name the overlay after where it is used, such as "Facebook Live Main Feed".</p>
						<el-form-item label="Widget name" required>
							<el-input v-model="form.name" maxlength="120" placeholder="e.g. Facebook Live Main Feed" />
						</el-form-item>
					</section>

					<section class="ip-section">
						<h3>Expiry</h3>
						<p class="ip-section-hint">An expired link stops working on its own. Leave blank to keep it active until turned off.</p>
						<el-form-item>
							<el-date-picker
								v-model="form.expiresAt"
								type="datetime"
								placeholder="No expiry"
								clearable
								:disabled-date="beforeToday"
							/>
						</el-form-item>
						<div class="ip-picker-bar">
							<el-button size="small" @click="form.expiresAt = null">No expiry</el-button>
							<el-button v-for="preset in PRESETS" :key="preset.days" size="small" @click="setExpiry(preset.days)">
								{{ preset.label }}
							</el-button>
						</div>
					</section>
				</div>

				<section class="ip-section">
					<h3>What it shows</h3>
					<template v-if="widget">
						<p class="ip-section-hint">
							<strong>{{ WIDGET_TYPE_LABEL[widget.widget_type] }}</strong> for
							<strong>{{ widgetTargetText(widget, seasonsById) }}</strong>.
							<span v-if="!isSeasonFlow">To show something else, create a new widget.</span>
						</p>
					</template>
					<template v-else>
						<div class="wd-types" role="radiogroup" aria-label="What the widget shows">
							<button
								v-for="type in WIDGET_TYPES"
								:key="type.value"
								type="button"
								class="wd-type"
								role="radio"
								:aria-checked="form.widgetType === type.value"
								:class="{
									'is-selected': form.widgetType === type.value,
									'is-featured': type.value === 'season_flow',
								}"
								@click="form.widgetType = type.value"
							>
								<div class="wd-type-head">
									<strong>{{ type.label }}</strong>
									<span v-if="type.badge" class="wd-type-badge">{{ type.badge }}</span>
								</div>
								<span>{{ type.hint }}</span>
							</button>
						</div>

						<div class="wd-target-row mt-3">
							<el-form-item :label="targetKind === 'season' ? 'Season' : 'Season to pick the match from'">
								<el-select v-model="form.seasonId" placeholder="Choose a season" style="width: 100%">
									<el-option v-for="season in seasons" :key="season.id" :label="season.name" :value="season.id" />
								</el-select>
							</el-form-item>

							<el-form-item v-if="targetKind === 'match'" label="Match">
								<el-select
									v-model="form.matchId"
									filterable
									:loading="loadingMatches"
									:disabled="!form.seasonId"
									placeholder="Choose a match"
									style="width: 100%"
								>
									<el-option v-for="match in matches" :key="match.id" :label="matchOptionLabel(match)" :value="match.id" />
								</el-select>
							</el-form-item>
						</div>
					</template>
				</section>

				<section v-if="isSeasonFlow" class="ip-section">
					<h3>Broadcast flow studio</h3>
					<p class="ip-section-hint">
						Configure how this single stream URL transitions across Match Ready, Toss, Live Lower-Third, and your drag-and-drop break cards.
					</p>
					<SeasonFlowBuilder v-model="form.flowConfig" :season-id="form.seasonId" />
				</section>

				<p v-if="attempted && formError" class="ip-field-error" role="alert">{{ formError }}</p>
			</el-form>
		</div>

		<div class="ip-drawer-foot">
			<span v-if="!widget" class="ip-foot-note">The private stream URL is shown once after you save.</span>
			<el-button :disabled="saving" @click="requestClose()">Cancel</el-button>
			<el-button type="primary" :loading="saving" :disabled="saving" @click="submit">
				{{ widget ? "Save changes" : "Create overlay" }}
			</el-button>
		</div>
	</el-drawer>
</template>

<script setup>
import { computed, reactive, ref, watch } from "vue";
import { ElMessageBox } from "element-plus";
import SeasonFlowBuilder from "./SeasonFlowBuilder.vue";
import { matchService } from "@/services/matchService";
import { parseServerTime } from "@/utils/integrations";
import { notify } from "@/utils/notify";
import { defaultSeasonId, unwrap } from "@/utils/adminHelpers";
import { cloneFlowConfig, defaultFlowConfig } from "@/utils/widgetFlow";
import {
	WIDGET_TYPES,
	WIDGET_TYPE_LABEL,
	widgetCreatePayload,
	widgetFormError,
	widgetTargetKind,
	widgetTargetText,
} from "@/utils/widgets";

const props = defineProps({
	modelValue: { type: Boolean, default: false },
	widget: { type: Object, default: null },
	seasons: { type: Array, default: () => [] },
	saving: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue", "submit"]);

const PRESETS = [
	{ label: "30 days", days: 30 },
	{ label: "90 days", days: 90 },
	{ label: "1 year", days: 365 },
];

const form = reactive({
	name: "",
	widgetType: "season_flow",
	seasonId: null,
	matchId: null,
	expiresAt: null,
	flowConfig: defaultFlowConfig(),
});

const matches = ref([]);
const loadingMatches = ref(false);
const attempted = ref(false);
const snapshot = ref("");
let matchesRequest = 0;

const seasonsById = computed(() => new Map((props.seasons || []).map((s) => [s.id, s.name])));
const isSeasonFlow = computed(() => form.widgetType === "season_flow");
const targetKind = computed(() => widgetTargetKind(form.widgetType));

const formError = computed(() =>
	widgetFormError({
		name: form.name,
		widgetType: form.widgetType,
		matchId: form.matchId,
		seasonId: form.seasonId,
		expiresAt: form.expiresAt,
		flowConfig: form.flowConfig,
		editing: Boolean(props.widget),
	}),
);

const matchOptionLabel = (match) => {
	const left = match.team1_name || "TBD";
	const right = match.team2_name || "TBD";
	return `Match ${match.order} · ${left} vs ${right}`;
};

const loadMatches = async () => {
	const request = ++matchesRequest;
	matches.value = [];
	if (!form.seasonId || targetKind.value !== "match") return;
	loadingMatches.value = true;
	try {
		const list = unwrap(await matchService.getAll(form.seasonId));
		if (request !== matchesRequest) return;
		matches.value = Array.isArray(list) ? list : [];
	} catch {
		if (request === matchesRequest) notify.error("Matches for that season could not be loaded.");
	} finally {
		if (request === matchesRequest) loadingMatches.value = false;
	}
};

watch(
	() => form.seasonId,
	() => {
		if (!props.widget) form.matchId = null;
		loadMatches();
	},
);

watch(
	() => form.widgetType,
	(type, previous) => {
		if (type === previous) return;
		form.matchId = null;
		loadMatches();
	},
);

const stateKey = () =>
	JSON.stringify({
		name: form.name,
		widgetType: form.widgetType,
		seasonId: form.seasonId,
		matchId: form.matchId,
		expiresAt: form.expiresAt ? new Date(form.expiresAt).getTime() : null,
		flowConfig: isSeasonFlow.value ? form.flowConfig : null,
	});

const reset = () => {
	const widget = props.widget;
	attempted.value = false;
	form.name = widget?.name || "";
	form.widgetType = widget?.widget_type || "season_flow";
	form.seasonId = widget?.season_id ?? defaultSeasonId(props.seasons);
	form.matchId = widget?.match_id ?? null;
	form.expiresAt = widget?.expires_at ? parseServerTime(widget.expires_at) : null;
	form.flowConfig = cloneFlowConfig(widget?.flow_config);
	snapshot.value = stateKey();
	if (!widget) loadMatches();
};

const dirty = computed(() => props.modelValue && snapshot.value !== "" && stateKey() !== snapshot.value);

const requestClose = async (done) => {
	if (props.saving) return;
	if (dirty.value) {
		const discard = await ElMessageBox.confirm("You have unsaved changes. Close without saving?", "Discard changes", {
			confirmButtonText: "Discard",
			cancelButtonText: "Keep editing",
			type: "warning",
		})
			.then(() => true)
			.catch(() => false);
		if (!discard) return;
	}
	if (typeof done === "function") done();
	else emit("update:modelValue", false);
};

const beforeToday = (date) => date.getTime() < new Date().setHours(0, 0, 0, 0);

const setExpiry = (days) => {
	form.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
};

const submit = () => {
	attempted.value = true;
	if (props.saving || formError.value) return;
	if (props.widget) {
		const patch = {
			name: form.name.trim(),
			expires_at: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
		};
		if (isSeasonFlow.value) {
			patch.flow_config = form.flowConfig;
		}
		emit("submit", patch);
		return;
	}
	emit("submit", widgetCreatePayload(form));
};
</script>

<style scoped>
.wd-top-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 16px;
}

.wd-types {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 10px;
}

.wd-type {
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 13px 14px;
	text-align: left;
	border: 1px solid var(--cpl-ink-200, #d6dbe6);
	border-radius: 12px;
	background: transparent;
	cursor: pointer;
	color: inherit;
}

.wd-type.is-featured {
	grid-column: 1 / -1;
	background: rgba(212, 160, 23, 0.05);
}

.wd-type-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
}

.wd-type-badge {
	padding: 2px 8px;
	border-radius: 999px;
	background: rgba(212, 160, 23, 0.22);
	color: #b45309;
	font-size: 11px;
	font-weight: 800;
	text-transform: uppercase;
	letter-spacing: 0.06em;
}

.wd-type span {
	font-size: 12.5px;
	opacity: 0.78;
	line-height: 1.4;
}

.wd-type.is-selected {
	border-color: var(--cpl-gold-500, #d4a017);
	box-shadow: inset 0 0 0 1px var(--cpl-gold-500, #d4a017);
}

.wd-type:focus-visible {
	outline: 2px solid var(--cpl-gold-500, #d4a017);
	outline-offset: 2px;
}

.wd-target-row {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	gap: 14px;
}

@media (max-width: 760px) {
	.wd-top-grid,
	.wd-types {
		grid-template-columns: 1fr;
	}
}
</style>
