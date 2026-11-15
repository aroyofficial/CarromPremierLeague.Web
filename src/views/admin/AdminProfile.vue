<template>
	<div class="profile-page">
		<header class="profile-hero">
			<span class="hero-avatar" aria-hidden="true">
				<img v-if="avatar" :src="avatar" alt="" />
				<template v-else>{{ heroInitial }}</template>
			</span>
			<div class="hero-text">
				<span class="hero-eyebrow">My profile</span>
				<h1>{{ heroName }}</h1>
				<p v-if="account">@{{ account.username }}</p>
				<ul v-if="account" class="hero-chips" aria-label="Contact details">
					<li v-if="account.email">
						<el-icon><Message /></el-icon><span>{{ account.email }}</span>
					</li>
					<li v-if="account.phone_number">
						<el-icon><Phone /></el-icon><span>{{ account.phone_code }} {{ account.phone_number }}</span>
					</li>
				</ul>
			</div>
		</header>

		<div v-if="loadError" class="profile-card error-card" role="alert">
			<p>{{ loadError }}</p>
			<el-button type="primary" @click="load">Try again</el-button>
		</div>

		<div v-else v-loading="loading" class="profile-body">
			<el-form
				v-if="account"
				ref="formRef"
				:model="form"
				:rules="rules"
				label-position="top"
				class="profile-layout"
				@submit.prevent="save"
			>
				<aside class="profile-aside">
					<section class="profile-card photo-card" aria-labelledby="photo-title">
						<h2 id="photo-title" class="card-title"><el-icon><Camera /></el-icon>Photo</h2>
						<p class="card-lead">Shown in the console and next to your actions.</p>
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
					</section>
				</aside>

				<div class="profile-main">
					<section class="profile-card" aria-labelledby="personal-title">
						<h2 id="personal-title" class="card-title"><el-icon><User /></el-icon>Personal details</h2>
						<div class="field-grid">
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
						</div>
					</section>

					<section class="profile-card" aria-labelledby="contact-title">
						<h2 id="contact-title" class="card-title"><el-icon><Message /></el-icon>Contact</h2>
						<div class="field-grid">
							<el-form-item label="Country code" prop="phone_country_id">
								<el-select v-model="form.phone_country_id" filterable clearable placeholder="Code" @change="formRef?.validateField('phone_number')">
									<el-option v-for="country in phoneChoices" :key="country.id" :label="country.label" :value="country.id" />
								</el-select>
							</el-form-item>
							<el-form-item label="Contact number" prop="phone_number">
								<el-input v-model="form.phone_number" inputmode="numeric" autocomplete="tel" placeholder="10 digits" />
							</el-form-item>
							<p v-if="countriesError" class="span-2 field-note">{{ countriesError }}</p>
							<el-form-item label="Email" prop="email" class="span-2">
								<el-input v-model="form.email" type="email" autocomplete="email" />
							</el-form-item>
							<div v-if="emailChanged" class="span-2 code-box">
								<p>Confirm the new address with the code we email to it.</p>
								<div class="code-row">
									<el-input v-model.trim="form.email_code" maxlength="6" inputmode="numeric" autocomplete="one-time-code" placeholder="6-digit code" aria-label="Email change code" />
									<el-button :loading="sendingCode" @click="sendEmailCode">Email code</el-button>
								</div>
							</div>
						</div>
					</section>

					<section class="profile-card" aria-labelledby="signin-title">
						<h2 id="signin-title" class="card-title"><el-icon><Key /></el-icon>Sign-in details</h2>
						<div class="field-grid">
							<el-form-item label="Username" prop="username" class="span-2">
								<el-input v-model="form.username" autocomplete="username" />
							</el-form-item>
							<el-alert
								v-if="usernameChanged"
								class="span-2 mb-3"
								type="info"
								:closable="false"
								show-icon
								title="Changing your username signs you out. Sign in again with the new username."
							/>
							<div class="span-2 password-row">
								<span class="password-icon" aria-hidden="true"><el-icon><Lock /></el-icon></span>
								<div class="password-copy">
									<strong>Password</strong>
									<span>{{ passwordChangedText }}</span>
									<span v-if="!account.email" class="password-warn">Add an email address first. The change is confirmed with an email code.</span>
								</div>
								<el-button :disabled="!account.email" @click="changeOpen = true">Change password</el-button>
							</div>
						</div>
					</section>

					<div class="save-bar">
						<span>Changes apply when you save.</span>
						<el-button type="primary" native-type="submit" :loading="saving" :disabled="saving || pictureBusy">Save profile</el-button>
					</div>
				</div>
			</el-form>

			<AdminSecurity v-if="account" class="profile-security" />
		</div>

		<ChangePasswordDialog
			v-if="account"
			v-model="changeOpen"
			:username="account.username"
			:display-name="heroName"
			:email="account.email || ''"
			@changed="passwordChanged = true"
		/>
	</div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { Camera, Key, Lock, Message, Phone, User } from "@element-plus/icons-vue";
import AdminSecurity from "@/components/admin/AdminSecurity.vue";
import ChangePasswordDialog from "@/components/admin/ChangePasswordDialog.vue";
import ImageUploadField from "@/components/admin/ImageUploadField.vue";
import { adminApi } from "@/services/adminService";
import { useAuthStore } from "@/store/authStore";
import { blankToNull, runAction, unwrap } from "@/utils/adminHelpers";
import { Routes } from "@/utils/constants";
import { adminName, initialsOf } from "@/utils/media";
import { contactNumberError } from "@/utils/contactNumber";

const router = useRouter();
const authStore = useAuthStore();
const loading = ref(true);
const loadError = ref("");
const saving = ref(false);
const sendingCode = ref(false);
const changeOpen = ref(false);
const passwordChanged = ref(false);
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
	email_code: "",
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

const heroName = computed(() => {
	if (!account.value) return authStore.displayName || "My profile";
	return adminName(account.value) || account.value.username;
});
const heroInitial = computed(() => initialsOf(heroName.value) || "A");

const passwordChangedText = computed(() => {
	const raw = account.value?.password_changed_at;
	if (!raw) return "Keep it long and unique to this account.";
	const changed = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(raw) ? raw : `${raw}Z`);
	if (Number.isNaN(changed.getTime())) return "Keep it long and unique to this account.";
	const days = Math.floor((Date.now() - changed.getTime()) / 86400000);
	const ago = days <= 0 ? "today" : new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(-days, "day");
	return `Last changed ${ago}`;
});

watch(changeOpen, async (open) => {
	if (open || !passwordChanged.value) return;
	passwordChanged.value = false;
	await authStore.logout();
	router.push(Routes.LOGIN);
});

const rules = {
	username: [
		{ required: true, message: "Username is required", trigger: "blur" },
		{ pattern: /^[A-Za-z0-9_.-]{3,100}$/, message: "3–100 letters, numbers, dot, dash or underscore", trigger: "blur" },
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
	authStore.avatarUrl = avatar.value;
	if (account.value) account.value = { ...account.value, avatar_url: avatar.value || null };
};

const selectedPhoneCode = () => {
	if (!form.phone_country_id && form.phone_country_id !== 0) return null;
	return phoneChoices.value.find((country) => country.id === form.phone_country_id)?.code || null;
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
	if (emailChanged.value) payload.email_code = form.email_code;
	const signInChanged = usernameChanged.value;
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

<style scoped lang="scss">
.profile-page {
	display: flex;
	flex-direction: column;
	gap: 20px;
	max-width: 1180px;
}

.profile-hero {
	position: relative;
	display: flex;
	align-items: center;
	gap: clamp(14px, 3vw, 24px);
	padding: clamp(20px, 4vw, 32px);
	border-radius: var(--cpl-radius-lg, 18px);
	color: #fff;
	background:
		radial-gradient(80% 140% at 100% 0%, rgba(255, 201, 74, 0.35), transparent 55%),
		radial-gradient(60% 120% at 0% 100%, rgba(93, 140, 255, 0.25), transparent 60%),
		linear-gradient(135deg, #0b1426, #18294d);
	box-shadow: 0 18px 40px rgba(11, 20, 38, 0.25);
	overflow: hidden;
}

.hero-avatar {
	flex: 0 0 auto;
	width: clamp(68px, 12vw, 96px);
	height: clamp(68px, 12vw, 96px);
	display: grid;
	place-items: center;
	border-radius: 50%;
	background: linear-gradient(160deg, #ffe7a8, #e2a01a);
	color: var(--cpl-navy-900);
	font-size: clamp(24px, 4vw, 34px);
	font-weight: 800;
	border: 3px solid rgba(255, 255, 255, 0.85);
	box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
	overflow: hidden;

	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
}

.hero-text {
	min-width: 0;

	h1 {
		margin: 2px 0 0;
		font-family: var(--cpl-font-display);
		font-size: clamp(22px, 3.4vw, 32px);
		font-weight: 800;
		line-height: 1.15;
		overflow-wrap: anywhere;
	}

	p {
		margin: 2px 0 0;
		color: rgba(255, 255, 255, 0.7);
		font-size: 14px;
	}
}

.hero-eyebrow {
	color: var(--cpl-gold-400);
	font-size: 12px;
	font-weight: 700;
	letter-spacing: 0.08em;
	text-transform: uppercase;
}

.hero-chips {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin: 12px 0 0;
	padding: 0;
	list-style: none;

	li {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		max-width: 100%;
		padding: 5px 12px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.16);
		font-size: 13px;
	}

	span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
}

.profile-body {
	display: flex;
	flex-direction: column;
	gap: 20px;
	min-height: 120px;
}

.profile-layout {
	display: grid;
	grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
	gap: 20px;
	align-items: start;
}

.profile-aside {
	position: sticky;
	top: calc(var(--app-header-height) + 20px);
}

.profile-main {
	display: flex;
	flex-direction: column;
	gap: 20px;
	min-width: 0;
}

.profile-card {
	padding: clamp(16px, 2.5vw, 24px);
	background: var(--cpl-surface, #fff);
	border: 1px solid var(--cpl-line);
	border-radius: var(--cpl-radius-md, 14px);
	box-shadow: var(--cpl-shadow-card);
}

.card-title {
	display: flex;
	align-items: center;
	gap: 10px;
	margin: 0 0 14px;
	font-size: 17px;
	font-weight: 700;
	color: var(--cpl-ink-900);

	.el-icon {
		width: 32px;
		height: 32px;
		border-radius: 10px;
		background: #fff4d6;
		color: #9a6a00;
	}
}

.card-lead {
	margin: -8px 0 14px;
	color: var(--cpl-ink-600);
	font-size: 13px;
}

.field-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	column-gap: 16px;

	.span-2 {
		grid-column: span 2;
	}

	.el-select,
	.el-date-editor.el-input {
		width: 100%;
	}
}

.code-box {
	margin-bottom: 18px;
	padding: 12px 14px;
	border-radius: 12px;
	background: #f6f8fc;
	border: 1px dashed #c8d1e3;

	p {
		margin: 0 0 8px;
		color: var(--cpl-ink-600);
		font-size: 13px;
	}
}

.code-row {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;

	.el-input {
		flex: 1 1 160px;
		max-width: 240px;
	}
}

.password-row {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 12px 14px;
	padding: 14px 16px;
	border: 1px solid var(--cpl-line);
	border-radius: 12px;
	background: linear-gradient(180deg, #fff, #fafbfe);

	.el-button {
		margin-left: auto;
	}
}

.password-icon {
	flex: none;
	width: 40px;
	height: 40px;
	display: grid;
	place-items: center;
	border-radius: 12px;
	background: linear-gradient(135deg, var(--cpl-navy-900), var(--cpl-navy-700));
	color: var(--cpl-gold-400);
	font-size: 18px;
}

.password-copy {
	display: grid;
	gap: 2px;
	flex: 1 1 200px;
	min-width: 0;

	strong {
		color: var(--cpl-ink-900);
	}

	span {
		color: var(--cpl-ink-600);
		font-size: 13px;
	}
}

.password-warn {
	color: #9a6a00 !important;
}

.field-note {
	margin: -8px 0 12px;
	color: var(--cpl-ink-600);
	font-size: 13px;
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
	border-radius: 14px;
	background: rgba(255, 255, 255, 0.92);
	backdrop-filter: blur(8px);
	border: 1px solid var(--cpl-line);
	box-shadow: 0 10px 28px rgba(11, 20, 38, 0.12);

	span {
		color: var(--cpl-ink-600);
		font-size: 13px;
	}
}

:global(.admin-shell:has(.striker-launcher)) .save-bar {
	margin-right: 64px;
}

.error-card p {
	margin: 0 0 12px;
}

@media (max-width: 1199.98px) {
	.profile-layout {
		grid-template-columns: minmax(0, 1fr);
	}

	.profile-aside {
		position: static;
	}
}

@media (max-width: 575.98px) {
	.profile-hero {
		flex-direction: column;
		align-items: flex-start;
	}

	.field-grid {
		grid-template-columns: minmax(0, 1fr);

		.span-2 {
			grid-column: auto;
		}
	}

	.code-row .el-input {
		max-width: none;
	}

	.password-row .el-button {
		width: 100%;
		margin-left: 0;
	}

	.save-bar {
		flex-direction: column;
		align-items: stretch;
		text-align: center;

		.el-button {
			width: 100%;
		}
	}
}
</style>
