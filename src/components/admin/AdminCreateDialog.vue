<template>
	<el-dialog
		:model-value="modelValue"
		title="New admin"
		width="min(960px, 96vw)"
		:fullscreen="isPhone"
		class="create-admin-dialog"
		:close-on-click-modal="false"
		:close-on-press-escape="!submitting"
		:show-close="!submitting"
		:before-close="requestClose"
		append-to-body
		@update:model-value="emit('update:modelValue', $event)"
		@opened="onOpened"
	>
		<el-alert
			v-if="serverError"
			class="mb-3"
			type="error"
			:closable="false"
			show-icon
			role="alert"
			:title="serverError"
		/>
		<el-alert
			v-if="errors.length"
			class="mb-3 error-summary"
			type="error"
			:closable="false"
			show-icon
			role="alert"
			title="Fix these before continuing"
		>
			<ul class="error-list">
				<li v-for="problem in errors" :key="problem.prop">
					<button type="button" class="error-link" @click="jumpTo(problem.prop)">
						{{ problem.label }}: {{ problem.message }}
					</button>
				</li>
			</ul>
		</el-alert>

		<el-steps :active="step" finish-status="success" align-center class="create-steps" aria-label="Create admin progress">
			<el-step title="Basic information" />
			<el-step title="Permissions" />
			<el-step title="Finish" />
		</el-steps>

		<section v-show="step === 0" class="step-body" aria-labelledby="create-step-0">
			<h3 id="create-step-0">Basic information</h3>
			<el-form novalidate ref="formRef" :model="form" :rules="rules" label-position="top" class="admin-form-grid" @submit.prevent="continueFromBasics">
					<el-form-item label="First name" prop="first_name" data-prop="first_name">
						<el-input v-model="form.first_name" autocomplete="off" />
					</el-form-item>
					<el-form-item label="Last name" prop="last_name" data-prop="last_name">
						<el-input v-model="form.last_name" autocomplete="off" />
					</el-form-item>
					<el-form-item label="Email (required)" prop="email" data-prop="email">
						<el-input v-model="form.email" type="email" autocomplete="off" inputmode="email" />
						<p class="field-hint">Saved in lower case. The temporary password is sent here.</p>
					</el-form-item>
					<el-form-item label="Date of birth (optional)" prop="date_of_birth" data-prop="date_of_birth">
						<el-date-picker
							v-model="form.date_of_birth"
							type="date"
							value-format="YYYY-MM-DD"
							:disabled-date="(date) => date > new Date()"
							placeholder="Optional"
						/>
					</el-form-item>
					<el-form-item label="Gender (optional)" prop="gender" data-prop="gender">
						<el-select v-model="form.gender" clearable placeholder="Optional">
							<el-option v-for="option in genderOptions" :key="option.value" :label="option.label" :value="option.value" />
						</el-select>
					</el-form-item>
					<el-form-item label="Country code (optional)" prop="phone_country_id" data-prop="phone_country_id">
						<el-select v-model="form.phone_country_id" filterable clearable placeholder="Code" @change="formRef?.validateField('phone_number')">
							<el-option v-for="country in phoneOptions" :key="country.id" :label="country.label" :value="country.id" />
						</el-select>
					</el-form-item>
					<el-form-item label="Contact number (optional)" prop="phone_number" data-prop="phone_number">
						<el-input v-model="form.phone_number" inputmode="numeric" autocomplete="off" placeholder="Digits only" />
					</el-form-item>
					<div class="span-2 username-preview">
						<span class="preview-label">Username</span>
						<strong>{{ suggestedUsername || "Enter a name or email" }}</strong>
						<p class="field-hint">
							Created from the first name, last name, and email. If that username is already taken, the email or a number is added. It cannot be changed later.
						</p>
					</div>
					<el-alert
						class="span-2"
						type="info"
						:closable="false"
						show-icon
						title="A temporary password is emailed. The account stays off until that admin verifies the email and sets their own password."
					/>
				</el-form>
				<div class="step-actions">
					<el-button :disabled="submitting" @click="requestClose">Cancel</el-button>
					<el-button type="primary" @click="continueFromBasics">Continue</el-button>
				</div>
			</section>

			<section v-show="step === 1" class="step-body" aria-labelledby="create-step-1">
				<h3 id="create-step-1">Permissions</h3>
				<div class="permissions-pane">
					<p v-if="!canManage" class="pane-note">
						You cannot grant permissions. The new admin starts with none. Someone who can manage permissions can grant them later.
					</p>
					<template v-else>
						<p class="pane-note">You can grant only the permissions you hold, so only those are listed.</p>
						<PermissionTree
							v-if="delegable.sections.length"
							v-model="form.permissions"
							:tree="delegable"
							:editable="heldCodes"
							compact
						/>
						<p v-else-if="!tree.sections.length" class="pane-note">Permissions are still loading.</p>
						<p v-else class="pane-note">You do not hold any permissions you can grant.</p>
					</template>
					<p class="pane-count" aria-live="polite">
						{{ form.permissions.length }} permission{{ form.permissions.length === 1 ? "" : "s" }} selected
					</p>
				</div>
				<div class="step-actions">
					<el-button @click="step = 0">Back</el-button>
					<el-button type="primary" @click="step = 2">Continue</el-button>
				</div>
			</section>

			<section v-show="step === 2" class="step-body" aria-labelledby="create-step-2">
				<h3 id="create-step-2">Finish</h3>
				<dl class="review-list">
					<div><dt>Name</dt><dd>{{ displayName || "Not entered" }}</dd></div>
					<div><dt>Username</dt><dd>{{ suggestedUsername || "Created from the name and email" }}</dd></div>
					<div><dt>Email</dt><dd>{{ normalizedEmail || "Not entered" }}</dd></div>
					<div><dt>Contact number</dt><dd>{{ contactText || "Not added" }}</dd></div>
					<div><dt>Date of birth</dt><dd>{{ form.date_of_birth || "Not added" }}</dd></div>
					<div><dt>Gender</dt><dd>{{ genderLabel || "Not added" }}</dd></div>
					<div><dt>Profile picture</dt><dd>{{ pictureText }}</dd></div>
				</dl>
				<h3 class="review-heading">Permissions ({{ form.permissions.length }})</h3>
				<p v-if="!form.permissions.length" class="pane-note">No permissions. The admin can sign in but cannot change anything yet.</p>
				<div v-for="group in reviewGroups" :key="group.area" class="review-group">
					<h4>{{ group.area }}</h4>
					<ul>
						<li v-for="name in group.names" :key="name">{{ name }}</li>
					</ul>
				</div>
				<div class="step-actions">
					<el-button :disabled="submitting" @click="step = 1">Back</el-button>
					<el-button type="primary" :loading="submitting" :disabled="submitting" @click="save">
						{{ submitting ? "Creating…" : "Create admin" }}
					</el-button>
				</div>
			</section>
	</el-dialog>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from "vue";
import { ElMessageBox } from "element-plus";
import { notify } from "@/utils/notify";
import PermissionTree from "@/components/admin/PermissionTree.vue";
import { adminApi, apiErrorMessage } from "@/services/adminService";
import { useAuthStore } from "@/store/authStore";
import { blankToNull, unwrap } from "@/utils/adminHelpers";
import { optionalContactError } from "@/utils/contactNumber";
import { suggestUsername } from "@/utils/adminUsername";
import { focusField, useFormSubmit, validateForm } from "@/utils/formValidation";
import { buildIndex, delegableTree } from "@/utils/permissionTree";
import { Permission } from "@/utils/constants";
import { useIsPhone } from "@/utils/viewport";

const props = defineProps({
	modelValue: { type: Boolean, default: false },
	tree: { type: Object, required: true },
	countries: { type: Array, default: () => [] },
});
const emit = defineEmits(["update:modelValue", "created"]);

const authStore = useAuthStore();
const isPhone = useIsPhone();
const formRef = ref(null);
const step = ref(0);
const serverError = ref("");
const errors = ref([]);
const { submitting, submit } = useFormSubmit(formRef);

const canManage = computed(() => authStore.can(Permission.PERMISSIONS_MANAGE));
// Only what the signed-in admin holds right now. The API checks the same list again.
const heldCodes = computed(() => authStore.permissions || []);
const delegable = computed(() => delegableTree(props.tree, heldCodes.value));
const index = computed(() => buildIndex(props.tree));

const genderOptions = [
	{ value: "female", label: "Female" },
	{ value: "male", label: "Male" },
	{ value: "other", label: "Other" },
];

const emptyAccount = () => ({
	first_name: "",
	last_name: "",
	date_of_birth: null,
	gender: null,
	phone_country_id: null,
	phone_number: "",
	email: "",
	permissions: [],
});
const form = reactive(emptyAccount());
const initialSnapshot = ref("");

const phoneOptions = computed(() =>
	props.countries
		.filter((country) => country.phone_code)
		.map((country) => ({ id: country.id, code: country.phone_code, label: `${country.name} (${country.phone_code})` })),
);
const selectedCode = () => phoneOptions.value.find((country) => country.id === form.phone_country_id)?.code || "";

const normalizedEmail = computed(() => form.email.trim().toLowerCase());
const suggestedUsername = computed(() => suggestUsername(form.first_name, form.last_name, normalizedEmail.value));
const displayName = computed(() => [form.first_name, form.last_name].map((part) => part.trim()).filter(Boolean).join(" "));
const contactText = computed(() => {
	const code = selectedCode();
	const number = form.phone_number.trim();
	return code && number ? `${code} ${number}` : "";
});
const genderLabel = computed(() => genderOptions.find((option) => option.value === form.gender)?.label || "");
const pictureText = computed(() => {
	return "Added by the new admin after first sign-in";
});

const reviewGroups = computed(() => {
	const names = new Map(index.value.items.map((item) => [item.code, item]));
	const groups = new Map();
	form.permissions.forEach((code) => {
		const item = names.get(code);
		if (!item) return;
		if (!groups.has(item.area)) groups.set(item.area, []);
		groups.get(item.area).push(item.name);
	});
	return [...groups.entries()].map(([area, list]) => ({ area, names: list }));
});

const rules = {
	first_name: [{ max: 100, message: "Use 100 characters or fewer", trigger: "blur" }],
	last_name: [{ max: 100, message: "Use 100 characters or fewer", trigger: "blur" }],
	email: [
		{ required: true, message: "Email is required", trigger: "blur" },
		{
			validator: (_rule, value, callback) => {
				const text = (value || "").trim();
				if (!text) return callback(new Error("Email is required"));
				if (text.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
					return callback(new Error("Enter a valid email address"));
				}
				return callback();
			},
			trigger: "blur",
		},
	],
	phone_number: [
		{
			validator: (_rule, _value, callback) => {
				const problem = optionalContactError(form.phone_number, selectedCode());
				return problem ? callback(new Error(problem)) : callback();
			},
			trigger: "blur",
		},
	],
};

const isDirty = computed(
	() => JSON.stringify(form) !== initialSnapshot.value,
);

const resetAll = () => {
	Object.assign(form, emptyAccount());
	initialSnapshot.value = JSON.stringify(form);
	serverError.value = "";
	errors.value = [];
	step.value = 0;
};

// Each time the dialog opens, start clean.
watch(
	() => props.modelValue,
	(open) => {
		if (open) resetAll();
	},
);

const onOpened = () => {
	nextTick(() => focusField(formRef, "first_name"));
};

// Every way of closing (X, Esc, Cancel, the mask) goes through here, so unsaved work is never lost silently.
const requestClose = async (done) => {
	if (submitting.value) return;
	const close = typeof done === "function" ? done : () => emit("update:modelValue", false);
	if (!isDirty.value) return close();
	try {
		await ElMessageBox.confirm("Your entries for this new admin will be lost.", "Discard this new admin?", {
			confirmButtonText: "Discard",
			cancelButtonText: "Keep editing",
			type: "warning",
			confirmButtonClass: "el-button--danger",
		});
	} catch {
		return undefined;
	}
	return close();
};

const jumpTo = async (prop) => {
	step.value = 0;
	await nextTick();
	focusField(formRef, prop);
};

const continueFromBasics = async () => {
	serverError.value = "";
	form.email = form.email.trim().toLowerCase();
	const check = await validateForm(formRef);
	errors.value = check.errors;
	if (!check.valid) return;
	step.value = 1;
};

const save = () =>
	submit(async () => {
		if (step.value !== 2) return;
		serverError.value = "";
		form.email = form.email.trim().toLowerCase();
		const check = await validateForm(formRef);
		errors.value = check.errors;
		if (!check.valid) {
			step.value = 0;
			return;
		}

		// Permissions the admin does not hold are never sent, even if they reached the form.
		const granted = canManage.value ? form.permissions.filter((code) => heldCodes.value.includes(code)) : [];
		const code = selectedCode();
		const payload = blankToNull({
			first_name: form.first_name.trim(),
			last_name: form.last_name.trim(),
			date_of_birth: form.date_of_birth,
			gender: form.gender,
			phone_code: code || null,
			phone_number: form.phone_number.trim(),
			email: form.email,
		});
		payload.permissions = granted;

		try {
			const created = unwrap(await adminApi.admins.create(payload));
			emit("created", created);
			const username = created?.username ? ` Username is ${created.username}.` : "";
			notify.success(`Admin created.${username} The temporary password was emailed. The account activates after they verify their email and set a password.`);
			emit("update:modelValue", false);
		} catch (error) {
			serverError.value = apiErrorMessage(error);
			// The grant may have been revoked since this dialog opened. Reload what this admin holds.
			await authStore.loadProfile({ force: true }).catch(() => undefined);
			form.permissions = form.permissions.filter((item) => heldCodes.value.includes(item));
		}
	});
</script>

<style scoped>
.create-steps {
	margin-bottom: 24px;
}

.step-body {
	display: grid;
	gap: 14px;
}

.step-body h3 {
	margin: 0;
	font-size: 18px;
	font-weight: 700;
}

.step-actions {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-end;
	gap: 8px;
	margin-top: 8px;
}

.admin-form-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	column-gap: 16px;
}

.span-2 {
	grid-column: span 2;
}

.admin-form-grid :deep(.el-select),
.admin-form-grid :deep(.el-date-editor.el-input) {
	width: 100%;
}

.field-hint {
	margin: 4px 0 0;
	color: var(--cpl-ink-600);
	font-size: 12px;
}

.username-preview {
	margin: 0 0 12px;
}

.preview-label {
	display: block;
	margin-bottom: 4px;
	color: var(--cpl-ink-600);
	font-size: 14px;
}

.pane-note {
	margin: 0 0 12px;
	color: var(--cpl-ink-600);
	font-size: 14px;
}

.pane-count {
	margin: 12px 0 0;
	font-weight: 600;
}

.error-list {
	margin: 4px 0 0;
	padding-left: 0;
	list-style: none;
}

.error-link {
	padding: 4px 0;
	border: 0;
	background: none;
	color: inherit;
	font: inherit;
	text-align: left;
	text-decoration: underline;
	cursor: pointer;
	min-height: 32px;
}

.review-list {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 10px 20px;
	margin: 0;
}

.review-list dt {
	color: var(--cpl-ink-600);
	font-size: 12px;
	text-transform: uppercase;
	letter-spacing: 0.04em;
}

.review-list dd {
	margin: 2px 0 0;
	font-weight: 600;
	overflow-wrap: anywhere;
}

.review-heading {
	margin: 20px 0 8px;
	font-size: 16px;
}

.review-group h4 {
	margin: 10px 0 4px;
	font-size: 14px;
}

.review-group ul {
	margin: 0;
	padding-left: 18px;
}

@media (max-width: 767.98px) {
	.admin-form-grid,
	.review-list {
		grid-template-columns: minmax(0, 1fr);
	}

	.span-2 {
		grid-column: auto;
	}
}
</style>
