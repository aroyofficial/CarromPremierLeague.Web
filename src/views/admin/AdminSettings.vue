<template>
	<div class="settings-page">
		<div class="admin-page-head">
			<div>
				<h1>Settings</h1>
				<p>Match clock and Queen rules. The public site and match completion both use these values.</p>
			</div>
		</div>

		<div v-if="loadError" class="admin-card settings-error">
			<p>{{ loadError }}</p>
			<el-button type="primary" @click="load">Try again</el-button>
		</div>

		<div v-else v-loading="loading" class="settings-layout">
			<section class="preview" aria-label="Current choices">
				<article class="preview-card">
					<span>Regulation</span>
					<strong>{{ clockText(form.regulation_minutes) }}</strong>
					<small>Every match except Golden Strike</small>
				</article>
				<article class="preview-card">
					<span>Extra time</span>
					<strong>{{ clockText(form.extra_minutes) }}</strong>
					<small>Final and eliminator only</small>
				</article>
				<article class="preview-card">
					<span>League Queen</span>
					<strong>{{ queenHeadline }}</strong>
					<small>{{ queenDetail }}</small>
				</article>
			</section>

			<el-form class="settings-form" label-position="top" @submit.prevent="save">
				<section class="admin-card setting-group">
					<header class="group-head">
						<h2>Match clock</h2>
						<p>Choose whole minutes. A match can be completed once this regulation time has been played.</p>
					</header>

					<div class="setting-row">
						<div class="setting-copy">
							<h3 id="regulation-label">Regulation time</h3>
							<p>Used by every match except a Golden Strike. Allowed range is 5 to 30 minutes.</p>
						</div>
						<div class="setting-control">
							<el-input-number
								v-model="form.regulation_minutes"
								:min="5"
								:max="30"
								:step="1"
								:precision="0"
								step-strictly
								size="large"
								aria-labelledby="regulation-label"
							/>
							<span>min</span>
						</div>
					</div>

					<div class="setting-row">
						<div class="setting-copy">
							<h3 id="extra-label">Extra time</h3>
							<p>Added only when a final or an eliminator is still tied. Allowed range is 1 to 10 minutes.</p>
						</div>
						<div class="setting-control">
							<el-input-number
								v-model="form.extra_minutes"
								:min="1"
								:max="10"
								:step="1"
								:precision="0"
								step-strictly
								size="large"
								aria-labelledby="extra-label"
							/>
							<span>min</span>
						</div>
					</div>
				</section>

				<section class="admin-card setting-group">
					<header class="group-head">
						<h2>Queen</h2>
						<p>These switches apply to league matches. A Golden Strike still needs no cover.</p>
					</header>

					<div class="setting-row">
						<div class="setting-copy">
							<h3 id="queen-label">Use the Queen in league matches</h3>
							<p>When this is off, the Queen stays off the board during league regulation.</p>
						</div>
						<el-switch
							v-model="form.league_queen"
							class="setting-switch"
							size="large"
							aria-labelledby="queen-label"
							@change="onLeagueQueenChange"
						/>
					</div>

					<div class="setting-row is-nested" :class="{ 'is-unavailable': !form.league_queen }">
						<div class="setting-copy">
							<h3 id="cover-label">The Queen must be covered</h3>
							<p v-if="form.league_queen">A pocketed Queen has to be covered by another coin.</p>
							<p v-else>Turn the league Queen on before choosing whether it must be covered.</p>
						</div>
						<el-switch
							v-model="form.queen_needs_cover"
							class="setting-switch"
							size="large"
							:disabled="!form.league_queen"
							aria-labelledby="cover-label"
						/>
					</div>
				</section>

				<div class="save-bar">
					<p :class="{ 'is-dirty': dirty }">{{ statusText }}</p>
					<el-button type="primary" size="large" native-type="submit" :loading="saving" :disabled="!canSave">
						Save settings
					</el-button>
				</div>
			</el-form>
		</div>
	</div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { useSettingsStore } from "@/store/settingsStore";

const settingsStore = useSettingsStore();
const loading = ref(false);
const saving = ref(false);
const loadError = ref("");
const form = reactive({
	regulation_minutes: 15,
	extra_minutes: 5,
	league_queen: false,
	queen_needs_cover: false,
});

const wholeNumber = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;

const regulationValid = computed(() => wholeNumber(form.regulation_minutes, 5, 30));
const extraValid = computed(() => wholeNumber(form.extra_minutes, 1, 10));
const formValid = computed(() => regulationValid.value && extraValid.value);

const dirty = computed(
	() =>
		form.regulation_minutes !== settingsStore.regulation_minutes ||
		form.extra_minutes !== settingsStore.extra_minutes ||
		form.league_queen !== settingsStore.league_queen ||
		(form.league_queen && form.queen_needs_cover) !== settingsStore.queen_needs_cover,
);

const canSave = computed(() => formValid.value && dirty.value && !saving.value);

const statusText = computed(() => {
	if (!formValid.value) return "Enter a whole number inside each allowed range.";
	if (dirty.value) return "You have unsaved changes.";
	return "All changes are saved.";
});

const clockText = (minutes) => (Number.isInteger(minutes) ? `${minutes}:00` : "–");

const queenHeadline = computed(() => (form.league_queen ? "On" : "Off"));

const queenDetail = computed(() => {
	if (!form.league_queen) return "Stays off the board in league matches";
	if (form.queen_needs_cover) return "Must be covered";
	return "No cover required";
});

const copyFromStore = () => {
	form.regulation_minutes = settingsStore.regulation_minutes;
	form.extra_minutes = settingsStore.extra_minutes;
	form.league_queen = settingsStore.league_queen;
	form.queen_needs_cover = settingsStore.queen_needs_cover;
};

const onLeagueQueenChange = (enabled) => {
	if (!enabled) form.queen_needs_cover = false;
};

const load = async () => {
	loading.value = true;
	loadError.value = "";
	try {
		await settingsStore.fetchSettings();
		copyFromStore();
	} catch (error) {
		loadError.value = error?.message || "The settings could not be loaded.";
	} finally {
		loading.value = false;
	}
};

const save = async () => {
	if (!canSave.value) return;
	saving.value = true;
	try {
		await settingsStore.saveSettings({
			regulation_minutes: form.regulation_minutes,
			extra_minutes: form.extra_minutes,
			league_queen: form.league_queen,
			queen_needs_cover: form.league_queen && form.queen_needs_cover,
		});
		copyFromStore();
		ElMessage.success("Settings saved.");
	} catch (error) {
		ElMessage.error(error?.message || "The settings could not be saved.");
	} finally {
		saving.value = false;
	}
};

onMounted(load);
</script>

<style scoped lang="scss">
.settings-page {
	max-width: 880px;
}

.settings-layout {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.preview {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 12px;
}

.preview-card {
	display: flex;
	flex-direction: column;
	gap: 4px;
	min-width: 0;
	padding: 14px 16px;
	border: 1px solid var(--cpl-line);
	border-radius: var(--cpl-radius-md);
	background: linear-gradient(180deg, #fff 0%, var(--cpl-gold-100) 140%);
	box-shadow: var(--cpl-shadow-card);

	span {
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--cpl-ink-600);
	}

	strong {
		font-family: var(--cpl-font-display);
		font-size: clamp(26px, 4vw, 32px);
		font-weight: 800;
		line-height: 1.1;
		color: var(--cpl-navy-900);
	}

	small {
		color: var(--cpl-ink-600);
		font-size: 13px;
		line-height: 1.35;
	}
}

.setting-group {
	padding: 4px 16px 8px;
}

.group-head {
	padding: 14px 0 4px;

	h2 {
		margin: 0;
		font-family: var(--cpl-font-display);
		font-size: 18px;
		font-weight: 800;
		color: var(--cpl-ink-900);
	}

	p {
		margin: 4px 0 0;
		color: var(--cpl-ink-600);
		font-size: 14px;
		line-height: 1.45;
	}
}

.setting-row {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	gap: 12px 20px;
	align-items: center;
	padding: 16px 0;
	border-top: 1px solid var(--cpl-line);

	& + & {
		margin-top: 0;
	}
}

.setting-row.is-nested {
	margin: 4px 0 8px;
	padding: 14px 14px 14px 16px;
	border-top: 0;
	border-left: 3px solid var(--cpl-gold-400);
	border-radius: 0 12px 12px 0;
	background: var(--cpl-surface-muted);
}

.setting-row.is-unavailable {
	.setting-copy h3 {
		color: var(--cpl-ink-400);
	}
}

.setting-copy {
	min-width: 0;

	h3 {
		margin: 0;
		font-size: 15px;
		font-weight: 700;
		color: var(--cpl-ink-900);
	}

	p {
		margin: 4px 0 0;
		color: var(--cpl-ink-600);
		font-size: 13px;
		line-height: 1.45;
	}
}

.setting-control {
	display: flex;
	align-items: center;
	gap: 8px;
	color: var(--cpl-ink-600);
	font-size: 14px;
	font-weight: 600;

	:deep(.el-input-number) {
		width: 148px;
	}
}

.save-bar {
	position: sticky;
	bottom: 12px;
	z-index: 5;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 12px 16px;
	border: 1px solid var(--cpl-line);
	border-radius: var(--cpl-radius-md);
	background: rgba(255, 255, 255, 0.96);
	box-shadow: var(--cpl-shadow-card);

	p {
		margin: 0;
		color: var(--cpl-ink-600);
		font-size: 14px;
	}

	.is-dirty {
		color: var(--cpl-navy-900);
		font-weight: 700;
	}
}

.settings-error {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 12px;

	p {
		margin: 0;
		color: var(--cpl-ink-900);
	}
}

@media (max-width: 720px) {
	.preview {
		grid-template-columns: 1fr;
	}
}

@media (max-width: 575.98px) {
	.setting-group {
		padding: 4px 12px 8px;
	}

	.setting-row,
	.setting-row.is-nested {
		grid-template-columns: minmax(0, 1fr);
		align-items: stretch;
	}

	.setting-row.is-nested {
		margin-left: 0;
		margin-right: 0;
	}

	.setting-control {
		width: 100%;

		:deep(.el-input-number) {
			flex: 1 1 auto;
			width: 100%;
		}
	}

	.setting-switch {
		justify-self: start;
		height: auto;
	}

	.save-bar {
		bottom: 8px;
		flex-direction: column;
		align-items: stretch;

		:deep(.el-button) {
			width: 100%;
			margin-left: 0;
		}
	}

	.settings-error :deep(.el-button) {
		width: 100%;
	}
}
</style>
