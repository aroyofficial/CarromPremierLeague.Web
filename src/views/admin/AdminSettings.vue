<template>
	<div>
		<div class="admin-page-head">
			<div>
				<h1>Settings</h1>
				<p>Match clock and Queen rules for the competition.</p>
			</div>
		</div>

		<div v-loading="loading" class="admin-card settings-card">
			<el-form label-position="top" @submit.prevent>
				<section>
					<h2>Match clock</h2>
					<div class="settings-grid">
						<el-form-item label="Regulation time">
							<div class="setting-control">
								<el-input-number v-model="form.regulation_minutes" :min="5" :max="30" :step="1" />
								<span>minutes, from 5 to 30</span>
							</div>
						</el-form-item>
						<el-form-item label="Extra time">
							<div class="setting-control">
								<el-input-number v-model="form.extra_minutes" :min="1" :max="10" :step="1" />
								<span>minutes, from 1 to 10. Final and eliminator only.</span>
							</div>
						</el-form-item>
					</div>
				</section>

				<section>
					<h2>Queen</h2>
					<el-form-item label="Use the Queen in league matches">
						<div class="setting-control">
							<el-switch v-model="form.league_queen" @change="onLeagueQueenChange" />
							<span>When this is off, the Queen stays off the board during a league match.</span>
						</div>
					</el-form-item>
					<el-form-item label="The Queen must be covered">
						<div class="setting-control">
							<el-switch v-model="form.queen_needs_cover" :disabled="!form.league_queen" />
							<span>This applies only when the Queen is used in league matches. Golden Strike still needs no cover.</span>
						</div>
					</el-form-item>
				</section>

				<el-button type="primary" :loading="saving" @click="save">Save settings</el-button>
			</el-form>
		</div>
	</div>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { useSettingsStore } from "@/store/settingsStore";

const settingsStore = useSettingsStore();
const loading = ref(false);
const saving = ref(false);
const form = reactive({
	regulation_minutes: 15,
	extra_minutes: 5,
	league_queen: false,
	queen_needs_cover: false,
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

const save = async () => {
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

onMounted(async () => {
	loading.value = true;
	try {
		await settingsStore.fetchSettings();
		copyFromStore();
	} catch (error) {
		ElMessage.error(error?.message || "The settings could not be loaded.");
	} finally {
		loading.value = false;
	}
});
</script>

<style scoped lang="scss">
.settings-card {
	max-width: 760px;
	padding: 8px 4px 4px;
}

h2 {
	margin: 8px 0 12px;
	font-size: 16px;
}

.settings-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
	gap: 0 24px;
}

.setting-control {
	display: flex;
	align-items: center;
	gap: 12px;
	flex-wrap: wrap;
	color: var(--cpl-ink-500, #5c6b84);
	font-size: 13px;
}
</style>
