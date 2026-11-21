<template>
	<el-drawer
		:model-value="modelValue"
		:title="webhook ? `Deliveries: ${webhook.name}` : 'Deliveries'"
		direction="rtl"
		size="min(560px, 100vw)"
		class="ip-drawer"
		append-to-body
		destroy-on-close
		@open="load"
		@update:model-value="(value) => $emit('update:modelValue', value)"
	>
		<div class="ip-drawer-body">
			<div class="ip-picker-bar">
				<el-radio-group v-model="filter" size="small" aria-label="Filter deliveries">
					<el-radio-button v-for="option in FILTERS" :key="option.value" :value="option.value">
						{{ option.label }}
					</el-radio-button>
				</el-radio-group>
				<el-button size="small" :loading="loading" style="margin-left: auto" @click="load">
					<el-icon class="me-1"><Refresh /></el-icon>Refresh
				</el-button>
			</div>

			<p v-if="error" class="ip-field-error">{{ error }}</p>
			<p v-else-if="loading && !items.length" class="ip-field-hint">Loading deliveries...</p>
			<p v-else-if="!items.length" class="ip-picker-empty">
				No deliveries yet. Use Send test on the list to make the first one.
			</p>
			<p v-else-if="!shown.length" class="ip-picker-empty">No {{ filter }} deliveries in the latest {{ items.length }}.</p>

			<article v-for="item in shown" :key="item.id" class="ip-delivery">
				<div class="ip-delivery-top">
					<strong>{{ item.event_type }}</strong>
					<span class="ip-pill" :class="tone(item.status)">{{ label(item.status) }}</span>
					<span v-if="item.response_status" class="ip-pill is-plain" :class="httpTone(item.response_status)">
						HTTP {{ item.response_status }}
					</span>
				</div>
				<div class="ip-delivery-sub">
					<span :title="fullTime(item.delivered_at || item.created_at)">{{ relativeTime(item.delivered_at || item.created_at) }}</span>
					<span v-if="item.duration_ms != null">{{ item.duration_ms }} ms</span>
					<span>{{ item.attempts }} attempt{{ item.attempts === 1 ? "" : "s" }}</span>
				</div>
				<p v-if="item.error_detail" class="ip-delivery-error">{{ item.error_detail }}</p>
			</article>
		</div>
	</el-drawer>
</template>

<script setup>
import { computed, ref } from "vue";
import { Refresh } from "@element-plus/icons-vue";
import { adminApi, apiErrorMessage } from "@/services/adminService";
import { unwrap } from "@/utils/adminHelpers";
import { fullTime, relativeTime } from "@/utils/integrations";
import { areas } from "@/utils/realtimeRules";
import { useAdminLive } from "@/utils/useLive";

const props = defineProps({
	modelValue: { type: Boolean, default: false },
	webhook: { type: Object, default: null },
});

defineEmits(["update:modelValue"]);

const FILTERS = [
	{ value: "all", label: "All" },
	{ value: "sent", label: "Sent" },
	{ value: "failed", label: "Failed" },
	{ value: "pending", label: "Pending" },
];

const filter = ref("all");
const items = ref([]);
const loading = ref(false);
const error = ref("");

const isFailed = (status) => status === "dead" || status === "failed";
const isPending = (status) => status === "pending" || status === "leased";

const shown = computed(() => {
	if (filter.value === "sent") return items.value.filter((item) => item.status === "sent");
	if (filter.value === "failed") return items.value.filter((item) => isFailed(item.status));
	if (filter.value === "pending") return items.value.filter((item) => isPending(item.status));
	return items.value;
});

const label = (status) => {
	if (status === "sent") return "Delivered";
	if (status === "dead") return "Gave up";
	if (status === "failed") return "Failed";
	if (status === "leased") return "Sending";
	return "Retrying";
};

const tone = (status) => {
	if (status === "sent") return "is-success";
	if (isFailed(status)) return "is-danger";
	return "is-warn";
};

const httpTone = (code) => (code >= 200 && code < 300 ? "is-success" : "is-danger");

const load = async () => {
	if (!props.webhook) return;
	loading.value = true;
	error.value = "";
	try {
		items.value = unwrap(await adminApi.webhooks.deliveries(props.webhook.id, 50)) || [];
	} catch (failure) {
		error.value = apiErrorMessage(failure, "Deliveries could not be loaded.");
	} finally {
		loading.value = false;
	}
};

// New deliveries land while the drawer is open, so keep it current.
useAdminLive(
	async () => {
		if (props.modelValue && props.webhook && !loading.value) await load();
	},
	{ areas: areas.adminIntegrations },
);

defineExpose({ load });
</script>
