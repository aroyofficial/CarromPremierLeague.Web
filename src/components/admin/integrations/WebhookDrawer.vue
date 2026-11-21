<template>
	<el-drawer
		:model-value="modelValue"
		:title="webhook ? 'Edit webhook' : 'Create webhook'"
		direction="rtl"
		size="min(600px, 100vw)"
		class="ip-drawer"
		append-to-body
		destroy-on-close
		:before-close="requestClose"
		@open="reset"
	>
		<div class="ip-drawer-body">
			<el-form label-position="top" novalidate @submit.prevent="submit(false)">
				<section class="ip-section">
					<h3>Basics</h3>
					<p class="ip-section-hint">Name it after what receives it, so the list stays easy to read.</p>
					<div class="ip-two">
						<el-form-item label="Name" required>
							<el-input v-model="form.name" maxlength="120" placeholder="e.g. Discord match feed" />
							<p v-if="attempted && errors.name" class="ip-field-error">{{ errors.name }}</p>
						</el-form-item>
						<el-form-item label="Status">
							<el-switch v-model="form.is_active" active-text="Active" inactive-text="Paused" inline-prompt />
						</el-form-item>
					</div>
					<el-form-item label="Description">
						<el-input v-model="form.description" maxlength="400" placeholder="Optional note about what this feeds" />
					</el-form-item>
				</section>

				<section class="ip-section">
					<h3>Endpoint</h3>
					<p class="ip-section-hint">CPL sends a signed HTTP POST with a JSON body to this address.</p>
					<el-form-item label="Payload URL" required>
						<el-input
							v-model="form.url"
							maxlength="2000"
							placeholder="https://example.com/hooks/cpl"
							@blur="urlTouched = true"
						/>
						<p v-if="(attempted || urlTouched) && errors.url" class="ip-field-error">{{ errors.url }}</p>
						<p v-else class="ip-field-hint">Must be https. Addresses that point inside a private network are refused.</p>
					</el-form-item>
				</section>

				<section class="ip-section">
					<h3>Authorization</h3>
					<p class="ip-section-hint">
						Some receivers only accept requests that carry a credential. It is stored encrypted and sent on every delivery
						and test. It is never shown again after you save.
					</p>

					<div class="ip-auth-types" role="radiogroup" aria-label="Authorization type">
						<button
							v-for="option in AUTH_TYPES"
							:key="option.value"
							type="button"
							role="radio"
							class="ip-auth-type"
							:class="{ 'is-active': form.auth.type === option.value }"
							:aria-checked="form.auth.type === option.value"
							@click="chooseType(option.value)"
						>
							{{ option.label }}
						</button>
					</div>

					<div v-if="form.auth.keep" class="ip-saved-credential">
						<div>
							<strong>Credential saved</strong>
							<span class="ip-sub">{{ summary }}</span>
							<code v-if="webhook?.auth_hint"> {{ webhook.auth_hint }}</code>
						</div>
						<el-button size="small" @click="replaceCredential">Replace</el-button>
						<el-button size="small" type="danger" plain @click="removeCredential">Remove</el-button>
					</div>

					<template v-else>
						<p v-if="form.auth.type === 'none'" class="ip-field-hint">
							No credential is sent.
							<template v-if="hadCredential">Saving removes the credential that is stored now.</template>
						</p>

						<template v-else-if="form.auth.type === 'bearer'">
							<el-form-item label="Token">
								<el-input v-model="form.auth.token" type="password" show-password maxlength="500" autocomplete="off" placeholder="The token the receiver expects" />
							</el-form-item>
							<p class="ip-field-hint">Sent as <code>Authorization: Bearer &lt;token&gt;</code>.</p>
						</template>

						<template v-else-if="form.auth.type === 'basic'">
							<div class="ip-two">
								<el-form-item label="Username">
									<el-input v-model="form.auth.username" maxlength="200" autocomplete="off" />
								</el-form-item>
								<el-form-item label="Password">
									<el-input v-model="form.auth.password" type="password" show-password maxlength="500" autocomplete="new-password" />
								</el-form-item>
							</div>
							<p class="ip-field-hint">Sent as <code>Authorization: Basic</code> with the username and password encoded.</p>
						</template>

						<template v-else-if="form.auth.type === 'header'">
							<div class="ip-two">
								<el-form-item label="Header name">
									<el-input v-model="form.auth.headerName" maxlength="100" autocomplete="off" placeholder="X-Api-Key" />
								</el-form-item>
								<el-form-item label="Header value">
									<el-input v-model="form.auth.headerValue" type="password" show-password maxlength="500" autocomplete="off" />
								</el-form-item>
							</div>
							<p class="ip-field-hint">Use <code>Authorization</code> here if the receiver wants a scheme other than Bearer or Basic.</p>
						</template>

						<p v-if="attempted && errors.auth" class="ip-field-error">{{ errors.auth }}</p>
					</template>
				</section>

				<section class="ip-section">
					<h3>Events</h3>
					<p class="ip-section-hint">Pick what this webhook hears about. It receives nothing else.</p>
					<ChoicePicker
						:groups="groups"
						:selected="form.events"
						noun="event"
						search-placeholder="Search events"
						empty-text="No events are available."
						@toggle="toggleEvent"
						@toggle-group="toggleGroup"
						@select-all="selectAll"
						@clear="form.events = []"
					/>
					<p v-if="attempted && errors.events" class="ip-field-error">{{ errors.events }}</p>
				</section>
			</el-form>
		</div>

		<div class="ip-drawer-foot">
			<span v-if="!webhook" class="ip-foot-note">A signing secret is shown once after you save.</span>
			<el-button :disabled="saving" @click="requestClose()">Cancel</el-button>
			<el-button :loading="saving" :disabled="saving" @click="submit(true)">Save and send test</el-button>
			<el-button type="primary" :loading="saving" :disabled="saving" @click="submit(false)">
				{{ webhook ? "Save changes" : "Create webhook" }}
			</el-button>
		</div>
	</el-drawer>
</template>

<script setup>
import { computed, reactive, ref } from "vue";
import { ElMessageBox } from "element-plus";
import ChoicePicker from "@/components/admin/integrations/ChoicePicker.vue";
import {
	AUTH_TYPES,
	authError,
	authFromWebhook,
	authPayload,
	authSummary,
	blankAuth,
	groupWebhookEvents,
	webhookUrlError,
} from "@/utils/integrations";

const props = defineProps({
	modelValue: { type: Boolean, default: false },
	webhook: { type: Object, default: null },
	events: { type: Array, default: () => [] },
	saving: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue", "submit"]);

const form = reactive({
	name: "",
	url: "",
	description: "",
	events: [],
	is_active: true,
	auth: blankAuth(),
});

const attempted = ref(false);
const urlTouched = ref(false);
const snapshot = ref("");

const groups = computed(() =>
	groupWebhookEvents(props.events).map((group) => ({ key: group.group, title: group.group, items: group.events })),
);

const hadCredential = computed(() => Boolean(props.webhook?.auth_type && props.webhook.auth_type !== "none"));
const summary = computed(() => authSummary(props.webhook));

const errors = computed(() => ({
	name: form.name.trim() ? "" : "Enter a name.",
	url: webhookUrlError(form.url),
	auth: authError(form.auth),
	events: form.events.length ? "" : "Choose at least one event.",
}));

const stateKey = () => JSON.stringify({ ...form, auth: { ...form.auth } });

const reset = () => {
	const hook = props.webhook;
	attempted.value = false;
	urlTouched.value = false;
	form.name = hook?.name || "";
	form.url = hook?.url || "";
	form.description = hook?.description || "";
	form.is_active = hook ? Boolean(hook.is_active) : true;
	form.events = hook
		? [...(hook.events || [])]
		: props.events.filter((item) => item.group === "Matches").map((item) => item.code);
	form.auth = hook ? authFromWebhook(hook) : blankAuth();
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

const chooseType = (type) => {
	if (form.auth.type === type) return;
	form.auth.type = type;
	// A different type needs a new credential, so the stored one is no longer kept.
	form.auth.keep = false;
};

const replaceCredential = () => {
	form.auth.keep = false;
};

const removeCredential = () => {
	form.auth.keep = false;
	form.auth.type = "none";
};

const orderedEvents = (codes) => {
	const set = new Set(codes);
	return props.events.filter((item) => set.has(item.code)).map((item) => item.code);
};

const toggleEvent = (code, on) => {
	const set = new Set(form.events);
	if (on) set.add(code);
	else set.delete(code);
	form.events = orderedEvents(set);
};

const toggleGroup = (key, on) => {
	const group = groups.value.find((item) => item.key === key);
	if (!group) return;
	const set = new Set(form.events);
	for (const item of group.items) {
		if (on) set.add(item.code);
		else set.delete(item.code);
	}
	form.events = orderedEvents(set);
};

const selectAll = () => {
	form.events = props.events.map((item) => item.code);
};

const submit = (sendTest) => {
	attempted.value = true;
	if (props.saving) return;
	if (errors.value.name || errors.value.url || errors.value.auth || errors.value.events) return;
	emit("submit", {
		sendTest,
		payload: {
			name: form.name.trim(),
			url: form.url.trim(),
			description: form.description.trim() || null,
			events: form.events,
			is_active: form.is_active,
			...authPayload(form.auth),
		},
	});
};
</script>
