<template>
	<div v-if="authStore.mustChangePassword" class="admin-activate">
		<ActivateAccount @done="router.push(Routes.LOGIN)" />
	</div>
	<div v-else class="admin-shell" :class="{ 'is-expanded': expanded, 'is-phone': phone }">
		<aside id="admin-sidebar" class="admin-sidebar" aria-label="Admin console">
			<div class="sidebar-head">
				<span class="sidebar-avatar" aria-hidden="true">
					<img v-if="authStore.avatarUrl" :src="authStore.avatarUrl" alt="" @error="authStore.avatarUrl = ''" />
					<template v-else>{{ userInitial }}</template>
				</span>
				<span class="sidebar-who">
					<span class="page-eyebrow">Admin Console</span>
					<strong :title="authStore.username">{{ authStore.displayName }}</strong>
				</span>
				<button
					type="button"
					class="sidebar-collapse"
					aria-controls="admin-sidebar"
					:aria-expanded="expanded"
					:aria-label="expanded ? 'Collapse menu' : 'Expand menu'"
					:title="expanded ? 'Collapse menu' : 'Expand menu'"
					@click="setExpanded(!expanded)"
				>
					<el-icon><DArrowLeft v-if="expanded" /><DArrowRight v-else /></el-icon>
				</button>
			</div>
			<nav class="sidebar-nav" aria-label="Admin sections">
				<router-link
					v-for="section in visibleSections"
					:key="section.name"
					:to="{ name: section.name }"
					class="sidebar-link"
					exact-active-class="is-active"
					:title="expanded ? undefined : section.label"
					@click="closeOnPhone"
				>
					<el-icon><component :is="icons[section.icon]" /></el-icon>
					<span class="sidebar-label">{{ section.label }}</span>
				</router-link>
			</nav>
			<div class="sidebar-foot">
				<ViewCoin face="admin" :compact="!expanded" @logout="logout" />
			</div>
		</aside>
		<div v-if="phone && expanded" class="sidebar-backdrop" @click="setExpanded(false)"></div>

		<section class="admin-main">
			<router-view v-slot="{ Component }">
				<component :is="Component" :key="refreshKey" />
			</router-view>
		</section>
		<StrikerChat
			v-if="showAssistant"
			mode="admin"
			@changed="onAssistantChange"
		/>
	</div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
	Avatar,
	Calendar,
	Connection,
	DArrowLeft,
	DArrowRight,
	DataBoard,
	Flag,
	Lock,
	Picture,
	Setting,
	Trophy,
	User,
	UserFilled,
} from "@element-plus/icons-vue";
import ActivateAccount from "@/components/admin/ActivateAccount.vue";
import ViewCoin from "@/components/admin/ViewCoin.vue";
import StrikerChat from "@/components/striker/StrikerChat.vue";
import { initial } from "@/utils/adminNames";
import { adminAssistantIsVisible } from "@/utils/assistantVisibility";
import { AdminSections, Routes } from "@/utils/constants";
import { SIDEBAR_KEY, initialSidebarExpanded, isPhoneWidth, sidebarPreference } from "@/utils/sidebarState";
import { dismissPageLoader } from "@/utils/common";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/settingsStore";

const icons = { Avatar, Calendar, Connection, DataBoard, Flag, Lock, Picture, Setting, Trophy, User, UserFilled };

const router = useRouter();
const authStore = useAuthStore();

watch(
	() => authStore.mustChangePassword,
	(must) => {
		if (must) dismissPageLoader();
	},
	{ immediate: true },
);
const settingsStore = useSettingsStore();
const refreshKey = ref(0);
const userInitial = computed(() => initial(authStore));

const readStored = () => {
	try {
		return localStorage.getItem(SIDEBAR_KEY);
	} catch {
		return null;
	}
};

const phone = ref(isPhoneWidth(window.innerWidth));
const expanded = ref(initialSidebarExpanded(window.innerWidth, readStored()));

const setExpanded = (value) => {
	expanded.value = value;
	if (phone.value) return;
	try {
		localStorage.setItem(SIDEBAR_KEY, sidebarPreference(value));
	} catch {
		// Private browsing can refuse storage; the choice then lasts for this page only.
	}
};

const closeOnPhone = () => {
	if (phone.value) expanded.value = false;
};

const onResize = () => {
	const nowPhone = isPhoneWidth(window.innerWidth);
	if (nowPhone === phone.value) return;
	phone.value = nowPhone;
	expanded.value = initialSidebarExpanded(window.innerWidth, readStored());
};

const onKeydown = (event) => {
	if (event.key === "Escape" && phone.value && expanded.value) expanded.value = false;
};

const onAssistantChange = () => {
	refreshKey.value += 1;
	authStore.loadProfile({ force: true }).catch(() => undefined);
};

const visibleSections = computed(() =>
	AdminSections.filter((section) => !section.permissions.length || authStore.canAny(section.permissions)),
);

const showAssistant = computed(
	() =>
		settingsStore.loaded &&
		adminAssistantIsVisible({
			enabled: settingsStore.assistant_admin_enabled,
			checked: settingsStore.assistantChecked,
			available: settingsStore.assistantAvailable,
			signedIn: authStore.isAuthenticated,
			mustChangePassword: authStore.mustChangePassword,
			hasAccess: authStore.assistantAccess,
		}),
);

onMounted(() => {
	authStore.loadProfile().catch(() => undefined);
	if (!settingsStore.loaded) settingsStore.fetchSettings().catch(() => undefined);
	window.addEventListener("resize", onResize, { passive: true });
	window.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
	window.removeEventListener("resize", onResize);
	window.removeEventListener("keydown", onKeydown);
});

const logout = () => {
	authStore.logout();
	router.push(Routes.HOME);
};
</script>

<style lang="scss">
.admin-activate {
	min-height: calc(100vh - var(--app-header-height, 64px));
	display: grid;
	place-items: center;
	padding: 24px;
}

.admin-activate form {
	width: min(460px, 100%);
	padding: clamp(24px, 5vw, 40px);
	background: var(--cpl-surface);
	border: 1px solid var(--cpl-line);
	border-radius: var(--cpl-radius-lg);
	box-shadow: var(--cpl-shadow-card);
}

.admin-shell,
body:has(.admin-shell) .el-overlay,
body:has(.admin-shell) .el-message-box {
	--el-color-primary: #18294d;
	--el-color-primary-light-3: #5d6a83;
	--el-color-primary-light-5: #8b94a6;
	--el-color-primary-light-7: #babfca;
	--el-color-primary-light-8: #d1d4db;
	--el-color-primary-light-9: #e8eaed;
	--el-color-primary-dark-2: #0b1426;
}

html.dark .admin-shell,
html.dark body:has(.admin-shell) .el-overlay,
html.dark body:has(.admin-shell) .el-message-box,
html.dark body:has(.admin-shell) .el-popper,
html.dark .admin-activate {
	--el-color-primary: #f5b82e;
	--el-color-primary-light-3: #b1892e;
	--el-color-primary-light-5: #846a2e;
	--el-color-primary-light-7: #574b2e;
	--el-color-primary-light-8: #403b2e;
	--el-color-primary-light-9: #2a2c2e;
	--el-color-primary-dark-2: #f7c658;
}

html.dark .admin-shell .el-button--primary:not(.is-plain):not(.is-link):not(.is-text),
html.dark body:has(.admin-shell) .el-overlay .el-button--primary:not(.is-plain):not(.is-link):not(.is-text),
html.dark body:has(.admin-shell) .el-message-box .el-button--primary:not(.is-plain):not(.is-link):not(.is-text),
html.dark .admin-activate .el-button--primary:not(.is-plain):not(.is-link):not(.is-text) {
	--el-button-text-color: var(--cpl-navy-900);
	--el-button-hover-text-color: var(--cpl-navy-900);
	--el-button-active-text-color: var(--cpl-navy-900);
	--el-button-hover-bg-color: #f7c658;
	--el-button-hover-border-color: #f7c658;
	--el-button-active-bg-color: #d99f1f;
	--el-button-active-border-color: #d99f1f;
}

html.dark .admin-shell,
html.dark body:has(.admin-shell) .el-overlay,
html.dark body:has(.admin-shell) .el-popper {
	--el-radio-button-checked-text-color: var(--cpl-navy-900);

	.el-pagination.is-background .el-pager li.is-active,
	.el-switch.is-checked .el-switch__inner,
	.el-switch.is-checked .el-switch__inner span,
	.el-checkbox-button.is-checked .el-checkbox-button__inner,
	.el-tag--dark.el-tag--primary,
	.el-date-table td.current:not(.disabled) .el-date-table-cell__text {
		color: var(--cpl-navy-900);
	}

	.el-checkbox__input.is-checked .el-checkbox__inner::after,
	.el-checkbox__input.is-indeterminate .el-checkbox__inner::before {
		border-color: var(--cpl-navy-900);
		background-color: var(--cpl-navy-900);
	}

	.el-checkbox__input.is-checked .el-checkbox__inner::after {
		background-color: transparent;
	}
}

.admin-shell {
	--rail-width: 76px;
	--panel-width: 256px;
	display: grid;
	grid-template-columns: var(--rail-width) minmax(0, 1fr);
	grid-template-rows: minmax(0, 1fr);
	height: calc(100dvh - var(--app-header-height));
	max-height: calc(100dvh - var(--app-header-height));
	min-height: 0;
	overflow: hidden;
	background: var(--cpl-surface-muted);
	transition: grid-template-columns 0.25s ease;

	&.is-expanded {
		grid-template-columns: var(--panel-width) minmax(0, 1fr);
	}
}

.admin-sidebar {
	position: sticky;
	top: var(--app-header-height);
	z-index: 20;
	height: calc(100vh - var(--app-header-height));
	height: calc(100dvh - var(--app-header-height));
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 16px 14px;
	background:
		radial-gradient(120% 40% at 0% 0%, rgba(255, 201, 74, 0.12), transparent 60%),
		var(--cpl-navy-900);
	color: #fff;
	overflow: visible;
}

html.dark .admin-sidebar {
	box-shadow: inset -1px 0 0 var(--cpl-line);
}

.sidebar-head {
	flex: 0 0 auto;
	display: grid;
	grid-template-columns: 40px minmax(0, 1fr);
	align-items: center;
	gap: 10px;
	padding: 0 2px 14px;
	border-bottom: 1px solid rgba(255, 255, 255, 0.1);

	.page-eyebrow {
		color: var(--cpl-gold-400);
	}
}

.sidebar-avatar {
	width: 40px;
	height: 40px;
	border-radius: 50%;
	display: grid;
	place-items: center;
	overflow: hidden;
	background: linear-gradient(160deg, #ffe7a8, #e2a01a);
	color: var(--cpl-navy-900);
	font-weight: 800;
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);

	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
}

.sidebar-who {
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;

	strong {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
}

.sidebar-collapse {
	position: absolute;
	top: 36px;
	right: 0;
	z-index: 2;
	width: 32px;
	height: 32px;
	display: grid;
	place-items: center;
	padding: 6px;
	border: 1px solid var(--cpl-line);
	border-radius: 50%;
	background: var(--cpl-surface-raised);
	color: var(--cpl-heading);
	box-shadow: 0 4px 12px rgba(11, 20, 38, 0.28);
	transform: translate(50%, -50%);
	cursor: pointer;

	&:hover {
		background: var(--cpl-gold-100);
		color: var(--cpl-heading);
	}

	&:focus-visible {
		outline: 2px solid var(--cpl-gold-400);
		outline-offset: 2px;
	}
}

.admin-shell:not(.is-expanded) {
	.admin-sidebar {
		align-items: center;
		padding-inline: 10px;
	}

	.sidebar-head {
		grid-template-columns: 40px;
		justify-items: center;
	}

	.sidebar-who,
	.sidebar-label {
		display: none;
	}

	.sidebar-nav {
		width: 100%;
		align-items: center;
	}

	.sidebar-link {
		justify-content: center;
		width: 48px;
		padding: 12px 0;
	}

	.sidebar-foot {
		display: flex;
		justify-content: center;
		width: 100%;
	}
}

.sidebar-nav {
	flex: 1 1 auto;
	min-height: 0;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
	overflow-x: hidden;
	overflow-y: auto;
	overscroll-behavior: contain;
}

.sidebar-link {
	display: flex;
	align-items: center;
	gap: 12px;
	min-height: 44px;
	padding: 10px 12px;
	border-radius: 12px;
	color: rgba(255, 255, 255, 0.8);
	text-decoration: none;
	font-size: 14px;
	font-weight: 500;
	white-space: nowrap;
	transition: background 0.15s ease, color 0.15s ease;

	.el-icon {
		flex: 0 0 auto;
		font-size: 18px;
	}

	&:focus-visible {
		outline: 2px solid var(--cpl-gold-400);
		outline-offset: 1px;
	}

	&:hover {
		background: rgba(255, 255, 255, 0.08);
		color: #fff;
	}

	&.is-active {
		background: var(--cpl-gold-400);
		color: var(--cpl-navy-900);
		font-weight: 600;
	}
}

.sidebar-foot {
	flex: 0 0 auto;
	padding-top: 12px;
	border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.admin-main {
	grid-column: 2;
	height: 100%;
	min-width: 0;
	min-height: 0;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	padding: 24px clamp(16px, 3vw, 36px) 16px;
}

.admin-main > * {
	flex: 1 1 auto;
	min-height: 0;
	overflow: auto;
}

.admin-main > .profile-page {
	flex: 1 1 0;
	min-height: 0;
	overflow: hidden;
}

.admin-main > .admin-page,
.admin-main > .users-page {
	flex: 1 1 0;
	height: 100%;
	min-height: 0;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.admin-page-head {
	flex: 0 0 auto;
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 18px;

	h1 {
		margin: 0;
		font-family: var(--cpl-font-display);
		font-size: clamp(22px, 3vw, 28px);
		font-weight: 800;
		color: var(--cpl-ink-900);
	}

	p {
		margin: 4px 0 0;
		color: var(--cpl-ink-600);
		font-size: 14px;
	}
}

.admin-toolbar {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
	align-items: center;

	.el-button + .el-button {
		margin-left: 0;
	}
}

.admin-card {
	background: var(--cpl-surface);
	border: 1px solid var(--cpl-line);
	border-radius: var(--cpl-radius-md);
	box-shadow: var(--cpl-shadow-card);
	padding: 16px;
}

.admin-card + .admin-card {
	margin-top: 16px;
}

.admin-table-card {
	flex: 1 1 0;
	min-height: 0;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.admin-table-fill {
	flex: 1 1 0;
	min-height: 0;
	overflow: hidden;
}

.admin-table-fill > .el-table {
	height: 100%;
}

.admin-page-rest {
	flex: 1 1 auto;
	min-height: 0;
}

.admin-card-title {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	margin: 0 0 12px;
	font-size: 16px;
	font-weight: 700;
	color: var(--cpl-ink-900);
}

.admin-thumb {
	width: 36px;
	height: 36px;
	border-radius: 50%;
	object-fit: cover;
	background: var(--cpl-line);
}

.admin-form-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	column-gap: 16px;

	.span-2 {
		grid-column: span 2;
	}

	.el-select,
	.el-date-editor.el-input,
	.el-input-number {
		width: 100%;
	}
}

.admin-shell.is-phone {
	--rail-width: 64px;
	grid-template-columns: var(--rail-width) minmax(0, 1fr);

	.admin-sidebar {
		position: fixed;
		left: 0;
		z-index: 1050;
		width: var(--rail-width);
		transition: width 0.25s ease, box-shadow 0.25s ease;
	}

	&.is-expanded .admin-sidebar {
		width: min(var(--panel-width), 85vw);
		box-shadow: 12px 0 32px rgba(0, 0, 0, 0.35);
	}

	&:not(.is-expanded) .admin-sidebar {
		padding-inline: 8px;
	}

	&:not(.is-expanded) .sidebar-avatar {
		width: 34px;
		height: 34px;
	}

	.admin-main {
		padding-left: 28px;
	}
}

.sidebar-backdrop {
	position: fixed;
	inset: var(--app-header-height) 0 0 0;
	background: rgba(0, 0, 0, 0.45);
	z-index: 1040;
}

@media (max-width: 575.98px) {
	.admin-main {
		padding: 18px 12px 36px;
	}

	.admin-card {
		padding: 12px;
	}

	.admin-form-grid {
		grid-template-columns: minmax(0, 1fr);

		.span-2 {
			grid-column: auto;
		}
	}

	.admin-card .el-table__body-wrapper {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.admin-card .el-table .el-button--small {
		min-height: 40px;
		padding-right: 10px;
		padding-left: 10px;
	}

	.admin-card .el-table .actions-col {
		.btn-label {
			display: none;
		}

		.el-icon.me-1 {
			margin-right: 0 !important;
		}

		.el-button + .el-button {
			margin-left: 8px;
		}
	}

	.admin-page-head > .el-button {
		width: 100%;
	}

	.admin-toolbar {
		width: 100%;

		> .el-select,
		> .el-input,
		> .el-button {
			flex: 1 1 100%;
			width: auto !important;
			min-width: 0;
		}
	}

	.admin-card .el-pagination__total,
	.admin-card .el-pager {
		display: none;
	}
}

@media (prefers-reduced-motion: reduce) {
	.admin-shell,
	.admin-shell .admin-sidebar {
		transition: none;
	}
}
</style>
