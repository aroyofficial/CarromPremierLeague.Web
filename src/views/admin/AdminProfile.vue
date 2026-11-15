<template>
	<div class="profile-page">
		<div class="admin-page-head">
			<div>
				<h1>Profile</h1>
				<p>Your name, contact details and sign-in. Every admin account can open this page.</p>
			</div>
		</div>

		<div v-if="loadError" class="admin-card">
			<p>{{ loadError }}</p>
			<el-button type="primary" @click="load">Try again</el-button>
		</div>

		<div v-else v-loading="loading" class="admin-card">
			<el-form
				v-if="account"
				ref="formRef"
				:model="form"
				:rules="rules"
				label-position="top"
				class="admin-form-grid"
				@submit.prevent="save"
			>
				<el-form-item label="Profile picture" class="span-2">
					<ImageUploadField
						v-model:busy="pictureBusy"
						:src="avatar"
						:name="adminName(form) || account.username"
						kind="admin"
						label="Profile picture"
						:external-error="pictureError"
						:upload="(file, onProgress) => adminApi.admins.uploadAvatar(account.id, file, onProgress)"
						:upload-link="(url) => adminApi.admins.setAvatarUrl(account.id, url)"
						:remove="() => adminApi.admins.removeAvatar(account.id)"
						@dismiss-error="pictureError = ''"
						@changed="pictureChanged"
					/>
				</el-form-item>
				<el-form-item label="First name" prop="first_name">
					<el-input v-model="form.first_name" autocomplete="given-name" />
				</el-form-item>
				<el-form-item label="Last name" prop="last_name">
					<el-input v-model="form.last_name" autocomplete="family-name" />
				</el-form-item>
				<el-form-item label="Date of birth" prop="date_of_birth">
					<el-date-picker
						v-model="form.date_of_birth"
						type="date"
						value-format="YYYY-MM-DD"
						:disabled-date="(date) => date > new Date()"
						placeholder="Optional"
					/>
				</el-form-item>
				<el-form-item label="Gender" prop="gender">
					<el-select v-model="form.gender" clearable placeholder="Optional">
						<el-option v-for="option in genderOptions" :key="option.value" :label="option.label" :value="option.value" />
					</el-select>
				</el-form-item>
				<el-form-item label="Country code" prop="phone_country_id">
					<el-select v-model="form.phone_country_id" filterable clearable placeholder="Code" @change="formRef?.validateField('phone_number')">
						<el-option v-for="country in phoneChoices" :key="country.id" :label="country.label" :value="country.id" />
					</el-select>
				</el-form-item>
				<el-form-item label="Contact number" prop="phone_number">
					<el-input v-model="form.phone_number" inputmode="numeric" autocomplete="tel" placeholder="Digits only" />
				</el-form-item>
				<p v-if="countriesError" class="span-2 field-note">{{ countriesError }}</p>
				<el-form-item label="Email" prop="email" class="span-2">
					<el-input v-model="form.email" type="email" autocomplete="email" />
				</el-form-item>
				<div v-if="emailChanged" class="span-2 email-code">
					<el-input v-model.trim="form.email_code" maxlength="6" inputmode="numeric" placeholder="6-digit code" />
					<el-button :loading="sendingCode" @click="sendEmailCode">Email code</el-button>
				</div>
				<el-form-item label="Username" prop="username">
					<el-input v-model="form.username" autocomplete="username" />
				</el-form-item>
				<el-form-item label="New password" prop="password">
					<el-input v-model="form.password" type="password" show-password autocomplete="new-password" placeholder="Leave blank to keep it" />
				</el-form-item>
				<el-form-item label="Confirm password" prop="confirm" class="span-2">
					<el-input v-model="form.confirm" type="password" show-password autocomplete="new-password" placeholder="Type the new password again" />
				</el-form-item>
				<div v-if="form.password" class="span-2 email-code">
					<el-input v-model.trim="form.password_code" maxlength="6" inputmode="numeric" placeholder="6-digit email code" />
					<el-button :loading="sendingPasswordCode" @click="sendPasswordCode">Email code</el-button>
				</div>
				<el-alert
					v-if="form.password || usernameChanged"
					class="span-2"
					type="info"
					:closable="false"
					show-icon
					title="Changing your username or password signs you out. Sign in again with the new details."
				/>
				<div class="span-2 actions">
					<el-button type="primary" native-type="submit" :loading="saving" :disabled="saving || pictureBusy">Save profile</el-button>
				</div>
			</el-form>
			<AdminSecurity v-if="account" class="security" />
		</div>
	</div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import AdminSecurity from "@/components/admin/AdminSecurity.vue";
import ImageUploadField from "@/components/admin/ImageUploadField.vue";
import { adminApi } from "@/services/adminService";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/store/authStore";
import { blankToNull, runAction, unwrap } from "@/utils/adminHelpers";
import { Routes } from "@/utils/constants";
import { adminName } from "@/utils/media";
import { contactNumberError } from "@/utils/contactNumber";

const router = useRouter();
const authStore = useAuthStore();
const loading = ref(true);
const loadError = ref("");
const saving = ref(false);
const sendingCode = ref(false);
const sendingPasswordCode = ref(false);
const account = ref(null);
const avatar = ref("");
const pictureBusy = ref(false);
const pictureError = ref("");
const countries = ref([]);
const countriesError = ref("");
const formRef = ref(null);

const genderOptions = [
	{ value: "female", label: "Female" },
	{ value: "male", label: "Male" },
	{ value: "other", label: "Other" },
];

const emptyForm = () => ({
	username: "",
	password: "",
	confirm: "",
	email_code: "",
	password_code: "",
	first_name: "",
	last_name: "",
	date_of_birth: null,
	gender: null,
	phone_code: "",
	phone_country_id: null,
	phone_number: "",
	email: "",
});
const form = reactive(emptyForm());

const phoneOptions = computed(() =>
	countries.value
		.filter((country) => country.phone_code)
		.map((country) => ({
			id: country.id,
			code: country.phone_code,
			label: `${country.name} (${country.phone_code})`,
		})),
);

const phoneChoices = computed(() => {
	if (form.phone_country_id !== 0 || !form.phone_code) return phoneOptions.value;
	if (phoneOptions.value.some((country) => country.code === form.phone_code)) return phoneOptions.value;
	return [{ id: 0, code: form.phone_code, label: form.phone_code }, ...phoneOptions.value];
});

const emailChanged = computed(
	() => Boolean(account.value) && form.email.trim().toLowerCase() !== (account.value.email || "").toLowerCase(),
);
const usernameChanged = computed(() => Boolean(account.value) && form.username.trim() !== account.value.username);

const rules = {
	username: [
		{ required: true, message: "Username is required", trigger: "blur" },
		{ pattern: /^[A-Za-z0-9_.-]{3,100}$/, message: "3–100 letters, numbers, dot, dash or underscore", trigger: "blur" },
	],
	password: [
		{
			validator: (_rule, value, callback) => {
				if (!value) return callback();
				if (value.length < 12) return callback(new Error("Use at least 12 characters"));
				return callback();
			},
			trigger: "blur",
		},
	],
	confirm: [
		{
			validator: (_rule, value, callback) =>
				(form.password || value) && value !== form.password ? callback(new Error("Passwords do not match")) : callback(),
			trigger: "blur",
		},
	],
	first_name: [{ max: 100, message: "Use 100 characters or fewer", trigger: "blur" }],
	last_name: [{ max: 100, message: "Use 100 characters or fewer", trigger: "blur" }],
	email: [
		{
			validator: (_rule, value, callback) => {
				const text = (value || "").trim();
				if (!text) return callback(new Error("Email is required"));
				if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return callback(new Error("Enter a valid email address"));
				return callback();
			},
			trigger: "blur",
		},
	],
	phone_number: [
		{
			validator: (_rule, value, callback) => {
				const number = (value || "").trim();
				const hasCode = form.phone_country_id === 0 || Boolean(form.phone_country_id);
				const problem = contactNumberError(number, hasCode);
				return problem ? callback(new Error(problem)) : callback();
			},
			trigger: "blur",
		},
	],
};

const phoneCountryIdFor = (code) => {
	if (!code) return null;
	return phoneOptions.value.find((country) => country.code === code)?.id ?? 0;
};

const applyAccount = (admin) => {
	account.value = admin;
	avatar.value = admin.avatar_url || "";
	Object.assign(form, {
		...emptyForm(),
		username: admin.username,
		first_name: admin.first_name || "",
		last_name: admin.last_name || "",
		date_of_birth: admin.date_of_birth,
		gender: admin.gender,
		phone_code: admin.phone_code || "",
		phone_country_id: phoneCountryIdFor(admin.phone_code),
		phone_number: admin.phone_number || "",
		email: admin.email || "",
	});
};

watch(phoneOptions, () => {
	if (!account.value || !form.phone_code || (form.phone_country_id && form.phone_country_id !== 0)) return;
	form.phone_country_id = phoneCountryIdFor(form.phone_code);
});

const load = async () => {
	loading.value = true;
	loadError.value = "";
	const { ok, result } = await runAction(() => adminApi.admins.me());
	if (!ok) {
		loadError.value = "Your profile could not be loaded.";
		loading.value = false;
		return;
	}
	const admin = unwrap(result);
	if (!admin?.id) {
		loadError.value = "Your profile could not be loaded.";
		loading.value = false;
		return;
	}
	applyAccount(admin);
	loading.value = false;
	adminApi.countries
		.list()
		.then((response) => {
			countries.value = unwrap(response) || [];
			countriesError.value = "";
		})
		.catch(() => {
			countriesError.value = "Country codes could not be loaded. Your saved number is unchanged.";
		});
};

const pictureChanged = (admin) => {
	avatar.value = admin?.avatar_url || "";
	if (account.value) account.value = { ...account.value, avatar_url: avatar.value || null };
};

const selectedPhoneCode = () => {
	if (!form.phone_country_id && form.phone_country_id !== 0) return null;
	return phoneChoices.value.find((country) => country.id === form.phone_country_id)?.code || null;
};

const sendPasswordCode = async () => {
	sendingPasswordCode.value = true;
	try {
		await authService.passwordCode();
		ElMessage.success("A code was sent to your email address.");
	} catch (error) {
		ElMessage.error(error?.message || "The code could not be sent.");
	} finally {
		sendingPasswordCode.value = false;
	}
};

const sendEmailCode = async () => {
	const text = form.email.trim();
	if (!account.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
		ElMessage.error("Enter the new email address first.");
		return;
	}
	sendingCode.value = true;
	try {
		await adminApi.admins.emailCode(account.value.id, text);
		ElMessage.success("A code was sent to that email address.");
	} catch (error) {
		ElMessage.error(error?.message || "The code could not be sent.");
	} finally {
		sendingCode.value = false;
	}
};

const save = async () => {
	const valid = await formRef.value.validate().catch(() => false);
	if (!valid || !account.value) return;
	if (emailChanged.value && !/^\d{6}$/.test(form.email_code)) {
		ElMessage.error("Email the code to the new address, then enter it here.");
		return;
	}
	saving.value = true;
	const payload = blankToNull({
		first_name: form.first_name.trim(),
		last_name: form.last_name.trim(),
		date_of_birth: form.date_of_birth,
		gender: form.gender,
		phone_code: selectedPhoneCode(),
		phone_number: form.phone_number.trim(),
		email: form.email.trim(),
	});
	if (usernameChanged.value) payload.username = form.username.trim();
	if (form.password) {
		if (!/^\d{6}$/.test(form.password_code)) {
			saving.value = false;
			ElMessage.error("Email yourself a code, then enter it to confirm the new password.");
			return;
		}
		payload.password = form.password;
		payload.password_code = form.password_code;
	}
	if (emailChanged.value) payload.email_code = form.email_code;
	const signInChanged = usernameChanged.value || Boolean(form.password);
	const { ok, result } = await runAction(() => adminApi.admins.update(account.value.id, payload), signInChanged ? "" : "Profile saved");
	saving.value = false;
	if (!ok) return;
	if (signInChanged) {
		ElMessage.info("Your sign-in details changed. Please sign in again.");
		await authStore.logout();
		router.push(Routes.LOGIN);
		return;
	}
	const fresh = unwrap(result);
	if (fresh?.id) applyAccount(fresh);
	await authStore.loadProfile({ force: true }).catch(() => undefined);
};

onMounted(load);
</script>

<style scoped>
.profile-page {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.email-code {
	display: flex;
	gap: 8px;
	align-items: center;
	margin-bottom: 18px;
}

.email-code .el-input {
	max-width: 220px;
}

.field-note {
	margin: -8px 0 12px;
	color: var(--cpl-ink-600);
	font-size: 13px;
}

.actions {
	display: flex;
	justify-content: flex-end;
}
</style>
