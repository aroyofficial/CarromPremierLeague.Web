<template>
	<div class="ip-page">
		<div class="admin-page-head">
			<div>
				<h1>Widgets</h1>
				<p>
					Build 16:9 broadcast TV overlays for Facebook Live &amp; Prism Live Studio. Create one
					<strong>Season broadcast flow</strong> to run an entire tournament automatically, or pin individual cards.
				</p>
			</div>
			<el-button v-if="canManage" type="primary" @click="openCreate">
				<el-icon class="me-1"><Plus /></el-icon>Create overlay
			</el-button>
		</div>

		<div v-if="!canManage" class="admin-card ip-locked" role="note">
			<el-icon><Lock /></el-icon>
			<div>
				<strong>Manage widgets permission required</strong>
				<p>
					You need the <strong>Manage widgets</strong> permission to create or change overlay links.
					<template v-if="canManagePermissions">
						Grant it from <router-link :to="permissionsPath">Permissions</router-link>.
					</template>
				</p>
			</div>
		</div>

		<template v-else>
			<section class="ip-stats" aria-label="Widget summary">
				<div class="ip-stat">
					<span>Total</span>
					<strong>{{ summary.total }}</strong>
					<small>Links created</small>
				</div>
				<div class="ip-stat">
					<span>Live</span>
					<strong>{{ summary.active }}</strong>
					<small>Active stream links</small>
				</div>
				<div class="ip-stat">
					<span>Season flows</span>
					<strong>{{ summary.flows }}</strong>
					<small>Auto broadcast pipelines</small>
				</div>
				<div class="ip-stat">
					<span>Off</span>
					<strong>{{ summary.off }}</strong>
					<small>Turned off or expired</small>
				</div>
			</section>

			<div class="admin-card ip-list-card" v-loading="loading && !loaded">
				<div v-if="loadError" class="ip-error">
					<span>{{ loadError }}</span>
					<el-button size="small" type="primary" @click="load">Try again</el-button>
				</div>

				<div v-else-if="loaded && !widgets.length" class="ip-empty">
					<div class="ip-empty-icon"><el-icon><VideoCamera /></el-icon></div>
					<h2>No overlays yet</h2>
					<p>Create a Season Broadcast Flow, then paste its single link into Prism Live Studio as a 1920×1080 Browser Capture source.</p>
					<el-button type="primary" @click="openCreate">
						<el-icon class="me-1"><Plus /></el-icon>Create your first overlay
					</el-button>
				</div>

				<template v-else-if="loaded">
					<div class="ip-filters">
						<el-input v-model="search" placeholder="Search by name, type, or link start" clearable :prefix-icon="Search" aria-label="Search widgets" />
						<el-select v-model="status" style="width: 170px" aria-label="Filter by status">
							<el-option v-for="option in STATUS_FILTERS" :key="option.value" :label="option.label" :value="option.value" />
						</el-select>
						<span class="ip-count">{{ rows.length }} of {{ widgets.length }}</span>
					</div>

					<div class="ip-head ip-cols" aria-hidden="true">
						<span>Overlay</span>
						<span>Shows</span>
						<span>Link</span>
						<span>Status</span>
						<span></span>
					</div>

					<div v-if="!rows.length" class="ip-empty">
						<h2>No widgets match</h2>
						<p>Try a different search or status.</p>
						<el-button @click="clearFilters">Clear filters</el-button>
					</div>

					<article
						v-for="widget in rows"
						:key="widget.id"
						class="ip-row ip-cols"
						:class="{ 'is-dim': widgetState(widget) !== 'active' }"
					>
						<div class="ip-cell">
							<span class="ip-name">{{ widget.name }}</span>
							<span class="ip-sub">{{ WIDGET_TYPE_LABEL[widget.widget_type] || widget.widget_type }}</span>
						</div>

						<div class="ip-cell">
							<span class="ip-cell-label">Shows</span>
							<span class="ip-name" style="font-weight: 600">{{ widgetTargetText(widget, seasonsById) }}</span>
							<span class="ip-sub">{{ describeScope(widget) }}</span>
						</div>

						<div class="ip-cell">
							<span class="ip-cell-label">Link</span>
							<span class="ip-mono"><code>{{ widget.token_prefix }}...</code></span>
							<span class="ip-sub">Shown once on create. Rotate to issue a fresh URL.</span>
						</div>

						<div class="ip-cell">
							<span class="ip-cell-label">Status</span>
							<span>
								<span class="ip-pill" :class="tone(widget)">{{ WIDGET_STATUS_LABEL[widgetState(widget)] }}</span>
							</span>
							<span v-if="widget.last_used_at" class="ip-sub" :title="fullTime(widget.last_used_at)">
								Seen {{ relativeTime(widget.last_used_at, now) }}
							</span>
							<span v-else class="ip-sub">Not opened yet</span>
							<span v-if="widget.expires_at" class="ip-sub" :title="fullTime(widget.expires_at)">
								{{ widgetState(widget) === "expired" ? "Expired" : "Expires" }} {{ relativeTime(widget.expires_at, now) }}
							</span>
						</div>

						<div class="ip-cell is-main-actions">
							<div class="ip-actions">
								<el-switch
									:model-value="widget.is_active && widgetState(widget) !== 'expired'"
									size="small"
									:disabled="busyId === widget.id || widgetState(widget) === 'expired'"
									:aria-label="`${widget.is_active ? 'Turn off' : 'Turn on'} ${widget.name}`"
									@change="(value) => setActive(widget, value)"
								/>
								<el-button
									v-if="widget.widget_type === 'season_flow'"
									size="small"
									type="primary"
									plain
									@click="openDirector(widget)"
								>
									Director
								</el-button>
								<el-button size="small" @click="openEdit(widget)">
									{{ widget.widget_type === "season_flow" ? "Studio" : "Edit" }}
								</el-button>
								<el-dropdown trigger="click" @command="(command) => onCommand(command, widget)">
									<el-button size="small" :loading="busyId === widget.id" :aria-label="`More actions for ${widget.name}`">
										<el-icon><MoreFilled /></el-icon>
									</el-button>
									<template #dropdown>
										<el-dropdown-menu>
											<el-dropdown-item command="rotate">Rotate link</el-dropdown-item>
										</el-dropdown-menu>
									</template>
								</el-dropdown>
							</div>
						</div>
					</article>
				</template>
			</div>
		</template>

		<WidgetDrawer
			v-model="formOpen"
			:widget="editing"
			:seasons="seasonStore.seasons"
			:saving="saving"
			@submit="submit"
		/>

		<BroadcastDirectorDrawer
			v-model="directorOpen"
			:widget="directing"
			@updated="load"
		/>

		<SecretRevealDialog
			v-model="linkOpen"
			:title="linkTitle"
			lead="Copy this link now. For safety it is shown only once. Later you will see just its start, and you can rotate the link if it is lost."
			:secret="widgetLink"
			copied-message="Widget link copied."
		>
			In Prism Live Studio, add a <strong>Browser Capture</strong> source set to <strong>1920 × 1080</strong> and paste this link, or add a
			<strong>Web widget</strong> on mobile. Turning the overlay off here stops the link immediately.
		</SecretRevealDialog>
	</div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { ElMessageBox } from "element-plus";
import { Lock, MoreFilled, Plus, Search, VideoCamera } from "@element-plus/icons-vue";
import BroadcastDirectorDrawer from "@/components/admin/integrations/BroadcastDirectorDrawer.vue";
import WidgetDrawer from "@/components/admin/integrations/WidgetDrawer.vue";
import SecretRevealDialog from "@/components/admin/integrations/SecretRevealDialog.vue";
import { adminApi, apiErrorMessage } from "@/services/adminService";
import { useAuthStore } from "@/store/authStore";
import { useSeasonStore } from "@/store/seasonStore";
import { runAction, unwrap } from "@/utils/adminHelpers";
import { settlePageLoader } from "@/utils/common";
import { Permission, Routes } from "@/utils/constants";
import { fullTime, relativeTime } from "@/utils/integrations";
import { notify } from "@/utils/notify";
import { areas } from "@/utils/realtimeRules";
import { useAdminLive } from "@/utils/useLive";
import {
	WIDGET_STATUS_LABEL,
	WIDGET_TYPE_LABEL,
	filterWidgets,
	summarizeWidgets,
	widgetState,
	widgetTargetText,
	widgetUrl,
} from "@/utils/widgets";
import "@/assets/styles/integrations.css";

const authStore = useAuthStore();
const seasonStore = useSeasonStore();
const canManage = computed(() => authStore.can(Permission.WIDGETS_MANAGE));
const canManagePermissions = computed(() => authStore.can(Permission.PERMISSIONS_MANAGE));
const permissionsPath = `${Routes.ADMIN}/permissions`;

const STATUS_FILTERS = [
	{ value: "all", label: "All statuses" },
	{ value: "active", label: "Live" },
	{ value: "expired", label: "Expired" },
	{ value: "revoked", label: "Turned off" },
];

const loading = ref(false);
const loaded = ref(false);
const loadError = ref("");
const widgets = ref([]);
const search = ref("");
const status = ref("all");
const now = ref(Date.now());

const formOpen = ref(false);
const editing = ref(null);
const saving = ref(false);
const busyId = ref(null);

const directorOpen = ref(false);
const directing = ref(null);

const linkOpen = ref(false);
const widgetLink = ref("");
const linkTitle = ref("Copy the widget link");

const seasonsById = computed(() => new Map((seasonStore.seasons || []).map((s) => [s.id, s.name])));
const summary = computed(() => summarizeWidgets(widgets.value));
const rows = computed(() => filterWidgets(widgets.value, search.value, status.value));

const describeScope = (widget) => {
	if (widget.widget_type === "season_flow") {
		const count = (widget.flow_config?.rotation || []).filter((s) => s.enabled !== false).length;
		const dirMode = widget.flow_config?.director?.mode;
		if (dirMode && dirMode !== "auto") {
			return `Director override (${dirMode}) · ${count} break cards`;
		}
		return `Auto flow · ${count} break card${count === 1 ? "" : "s"}`;
	}
	if (widget.widget_type === "points_table") return "League standings";
	if (widget.widget_type === "stats") return "Top coin potters";
	if (widget.widget_type === "fixtures") return "All fixtures in the season";
	return "One match";
};

const tone = (widget) => {
	const current = widgetState(widget);
	if (current === "active") return "is-success";
	if (current === "expired") return "is-warn";
	return "";
};

const clearFilters = () => {
	search.value = "";
	status.value = "all";
};

const showLink = (token, title) => {
	widgetLink.value = widgetUrl(token);
	linkTitle.value = title;
	linkOpen.value = true;
};

const load = async () => {
	if (!canManage.value) {
		widgets.value = [];
		loaded.value = true;
		return;
	}
	loading.value = true;
	loadError.value = "";
	try {
		const data = unwrap(await adminApi.widgets.list()) || {};
		widgets.value = data.widgets || [];
		now.value = Date.now();
		if (directing.value) {
			const refreshed = widgets.value.find((w) => w.id === directing.value.id);
			if (refreshed) directing.value = refreshed;
		}
	} catch (error) {
		loadError.value = apiErrorMessage(error, "Widgets could not be loaded.");
	} finally {
		loading.value = false;
		loaded.value = true;
	}
};

watch(canManage, () => load());

useAdminLive(
	async () => {
		if (!canManage.value || loading.value || saving.value || formOpen.value || linkOpen.value) return;
		await load();
	},
	{ areas: areas.adminIntegrations },
);

const tick = setInterval(() => {
	now.value = Date.now();
}, 30_000);
onUnmounted(() => clearInterval(tick));

const openCreate = () => {
	if (!canManage.value) return;
	editing.value = null;
	formOpen.value = true;
};

const openEdit = (widget) => {
	if (!canManage.value) return;
	editing.value = widget;
	formOpen.value = true;
};

const openDirector = (widget) => {
	if (!canManage.value) return;
	directing.value = widget;
	directorOpen.value = true;
};

const submit = async (payload) => {
	if (!canManage.value) return;
	saving.value = true;
	try {
		if (editing.value) {
			await adminApi.widgets.update(editing.value.id, payload);
			notify.success("Overlay updated.");
			formOpen.value = false;
			await load();
		} else {
			const created = unwrap(await adminApi.widgets.create(payload));
			formOpen.value = false;
			await load();
			if (created?.token) showLink(created.token, "Copy the overlay link");
		}
	} catch (error) {
		notify.error(apiErrorMessage(error, "The widget could not be saved."));
	} finally {
		saving.value = false;
	}
};

const setActive = async (widget, next) => {
	busyId.value = widget.id;
	await runAction(
		async () => {
			await adminApi.widgets.update(widget.id, { is_active: Boolean(next) });
			await load();
		},
		next ? `${widget.name} is live.` : `${widget.name} is turned off.`,
	);
	busyId.value = null;
};

const rotateLink = async (widget) => {
	const confirmed = await ElMessageBox.confirm(
		`Rotate the link for "${widget.name}"? The current link stops working right away, so paste the new one into Prism Live Studio.`,
		"Rotate widget link",
		{ confirmButtonText: "Rotate link", cancelButtonText: "Cancel", type: "warning" },
	)
		.then(() => true)
		.catch(() => false);
	if (!confirmed) return;
	busyId.value = widget.id;
	try {
		const rotated = unwrap(await adminApi.widgets.rotate(widget.id));
		await load();
		if (rotated?.token) showLink(rotated.token, "Copy the new overlay link");
	} catch (error) {
		notify.error(apiErrorMessage(error, "The widget link could not be rotated."));
	} finally {
		busyId.value = null;
	}
};

const onCommand = (command, widget) => {
	if (command === "rotate") rotateLink(widget);
};

watch(
	() => canManage.value,
	(allowed) => {
		if (allowed && !seasonStore.seasons.length) seasonStore.fetchSeasons().catch(() => undefined);
	},
);

onMounted(() => {
	if (canManage.value && !seasonStore.seasons.length) seasonStore.fetchSeasons().catch(() => undefined);
	settlePageLoader(load);
});
</script>

<style scoped lang="scss">
.ip-cols {
	grid-template-columns: minmax(0, 1.45fr) minmax(0, 1.3fr) minmax(0, 1.2fr) minmax(0, 1.15fr) auto;
}
</style>
