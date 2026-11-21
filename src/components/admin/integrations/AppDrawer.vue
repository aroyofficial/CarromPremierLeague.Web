<template>
	<el-drawer
		:model-value="modelValue"
		:title="app ? 'Edit app' : 'Create app'"
		direction="rtl"
		size="min(600px, 100vw)"
		class="ip-drawer"
		append-to-body
		destroy-on-close
		:before-close="requestClose"
		@open="reset"
	>
		<div class="ip-drawer-body">
			<el-form label-position="top" novalidate @submit.prevent="submit">
				<section class="ip-section">
					<h3>Basics</h3>
					<p class="ip-section-hint">Name the tool or script that will use this key, so you know what to revoke later.</p>
					<div class="ip-two">
						<el-form-item label="App name" required>
							<el-input v-model="form.name" maxlength="120" placeholder="e.g. Scoreboard sync script" />
							<p v-if="attempted && errors.name" class="ip-field-error">{{ errors.name }}</p>
						</el-form-item>
						<el-form-item v-if="app" label="Status">
							<el-switch v-model="form.is_active" active-text="Active" inactive-text="Paused" inline-prompt />
						</el-form-item>
					</div>
					<el-form-item label="Description">
						<el-input v-model="form.description" maxlength="400" placeholder="Optional note on where this key is used" />
					</el-form-item>
				</section>

				<section class="ip-section">
					<h3>Expiry</h3>
					<p class="ip-section-hint">A key that expires stops working on its own. Rotate it before then.</p>
					<el-form-item>
						<el-date-picker
							v-model="form.expires_at"
							type="datetime"
							placeholder="No expiry"
							clearable
							:disabled-date="beforeToday"
						/>
					</el-form-item>
					<div class="ip-picker-bar">
						<el-button size="small" @click="form.expires_at = null">No expiry</el-button>
						<el-button v-for="preset in PRESETS" :key="preset.days" size="small" @click="setExpiry(preset.days)">
							{{ preset.label }}
						</el-button>
					</div>
				</section>

				<section class="ip-section">
					<h3>Permissions</h3>
					<p class="ip-section-hint">
						An app can only receive permissions you hold. With none selected the key is read-only.
					</p>
					<ChoicePicker
						:groups="groups"
						:selected="form.permissions"
						noun="permission"
						search-placeholder="Search permissions"
						clear-label="Read-only (none)"
						empty-text="You do not hold any league permissions to delegate, so this key will be read-only."
						@toggle="toggleScope"
						@toggle-group="toggleGroup"
						@select-all="form.permissions = catalogCodes"
						@clear="form.permissions = []"
					/>
				</section>
			</el-form>
		</div>

		<div class="ip-drawer-foot">
			<span v-if="!app" class="ip-foot-note">The key is shown once after you save.</span>
			<el-button :disabled="saving" @click="requestClose()">Cancel</el-button>
			<el-button type="primary" :loading="saving" :disabled="saving" @click="submit">
				{{ app ? "Save changes" : "Create app" }}
			</el-button>
		</div>
	</el-drawer>
</template>

<script setup>
import { computed, reactive, ref } from "vue";
import { ElMessageBox } from "element-plus";
import ChoicePicker from "@/components/admin/integrations/ChoicePicker.vue";
import { groupAppScopes, parseServerTime, toggleAppScope, toggleScopeGroup } from "@/utils/integrations";

const props = defineProps({
	modelValue: { type: Boolean, default: false },
	app: { type: Object, default: null },
	scopes: { type: Array, default: () => [] },
	held: { type: Array, default: () => [] },
	saving: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue", "submit"]);

const PRESETS = [
	{ label: "30 days", days: 30 },
	{ label: "90 days", days: 90 },
	{ label: "1 year", days: 365 },
];

const form = reactive({ name: "", description: "", expires_at: null, permissions: [], is_active: true });
const attempted = ref(false);
const snapshot = ref("");

const scopeGroups = computed(() => groupAppScopes(props.scopes, props.held));
const catalog = computed(() => scopeGroups.value.flatMap((group) => group.scopes));
const catalogCodes = computed(() => catalog.value.map((item) => item.code));
const groups = computed(() =>
	scopeGroups.value.map((group) => ({ key: group.area, title: group.areaName, items: group.scopes })),
);

const errors = computed(() => ({ name: form.name.trim() ? "" : "Enter a name." }));

const stateKey = () => JSON.stringify({ ...form, expires_at: form.expires_at ? new Date(form.expires_at).getTime() : null });

const reset = () => {
	const app = props.app;
	attempted.value = false;
	form.name = app?.name || "";
	form.description = app?.description || "";
	form.is_active = app ? Boolean(app.is_active) : true;
	form.expires_at = app?.expires_at ? parseServerTime(app.expires_at) : null;
	form.permissions = [...(app?.permissions || [])];
	snapshot.value = stateKey();
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
	form.expires_at = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
};

const toggleScope = (code, on) => {
	form.permissions = toggleAppScope(form.permissions, code, on, catalog.value);
};

const toggleGroup = (key, on) => {
	const group = scopeGroups.value.find((item) => item.area === key);
	if (group) form.permissions = toggleScopeGroup(form.permissions, group, on, catalog.value);
};

const submit = () => {
	attempted.value = true;
	if (props.saving || errors.value.name) return;
	emit("submit", {
		name: form.name.trim(),
		description: form.description.trim() || null,
		permissions: form.permissions,
		...(props.app ? { is_active: form.is_active } : {}),
		expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
	});
};
</script>
