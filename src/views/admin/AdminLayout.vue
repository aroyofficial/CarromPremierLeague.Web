<template>
	<div class="admin-shell">
		<aside class="admin-sidebar" :class="{ 'is-open': sidebarOpen }">
			<div class="sidebar-head">
				<span class="page-eyebrow">Admin Console</span>
				<strong>{{ authStore.username }}</strong>
			</div>
			<nav class="sidebar-nav" aria-label="Admin sections">
				<router-link
					v-for="section in AdminSections"
					:key="section.name"
					:to="{ name: section.name }"
					class="sidebar-link"
					exact-active-class="is-active"
					@click="sidebarOpen = false"
				>
					<el-icon><component :is="icons[section.icon]" /></el-icon>
					<span>{{ section.label }}</span>
				</router-link>
			</nav>
			<div class="sidebar-foot">
				<el-button class="w-100" @click="router.push(Routes.HOME)">
					<el-icon class="me-1"><HomeFilled /></el-icon>View public site
				</el-button>
				<el-button class="w-100 ms-0 mt-2" type="danger" plain @click="logout">
					<el-icon class="me-1"><SwitchButton /></el-icon>Logout
				</el-button>
			</div>
		</aside>
		<div v-if="sidebarOpen" class="sidebar-backdrop" @click="sidebarOpen = false"></div>

		<section class="admin-main">
			<button type="button" class="sidebar-toggle" @click="sidebarOpen = true">
				<el-icon><Menu /></el-icon>Sections
			</button>
			<router-view v-slot="{ Component }">
				<component :is="Component" />
			</router-view>
		</section>
	</div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import {
	Calendar,
	Connection,
	DataBoard,
	Flag,
	HomeFilled,
	Location,
	Lock,
	Menu,
	SwitchButton,
	Trophy,
	User,
} from "@element-plus/icons-vue";
import { AdminSections, Routes } from "@/utils/constants";
import { useAuthStore } from "@/store/authStore";

const icons = { Calendar, Connection, DataBoard, Flag, Location, Lock, Trophy, User };

const router = useRouter();
const authStore = useAuthStore();
const sidebarOpen = ref(false);

const logout = () => {
	authStore.logout();
	router.push(Routes.LOGIN);
};
</script>

<style lang="scss">
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

.admin-shell {
	display: grid;
	grid-template-columns: 240px minmax(0, 1fr);
	min-height: calc(100vh - var(--app-header-height));
	background: var(--cpl-surface-muted);
}

.admin-sidebar {
	position: sticky;
	top: var(--app-header-height);
	height: calc(100vh - var(--app-header-height));
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 20px 14px;
	background: var(--cpl-navy-900);
	color: #fff;
	overflow-y: auto;
}

.sidebar-head {
	display: flex;
	flex-direction: column;
	gap: 2px;
	padding: 0 8px 12px;
	border-bottom: 1px solid rgba(255, 255, 255, 0.1);

	.page-eyebrow {
		color: var(--cpl-gold-400);
	}
}

.sidebar-nav {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.sidebar-link {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 10px 12px;
	border-radius: 10px;
	color: rgba(255, 255, 255, 0.8);
	text-decoration: none;
	font-size: 14px;
	font-weight: 500;

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
	margin-top: auto;
}

.sidebar-toggle,
.sidebar-backdrop {
	display: none;
}

.admin-main {
	min-width: 0;
	padding: 24px clamp(16px, 3vw, 36px) 48px;
}

.admin-page-head {
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

@media (max-width: 991.98px) {
	.admin-shell {
		grid-template-columns: minmax(0, 1fr);
	}

	.admin-sidebar {
		position: fixed;
		left: 0;
		z-index: 1050;
		width: min(260px, 85vw);
		transform: translateX(-100%);
		visibility: hidden;
		transition: transform 0.25s ease, visibility 0s linear 0.25s;

		&.is-open {
			transform: none;
			visibility: visible;
			transition: transform 0.25s ease;
		}
	}

	.sidebar-backdrop {
		display: block;
		position: fixed;
		inset: var(--app-header-height) 0 0 0;
		background: rgba(0, 0, 0, 0.45);
		z-index: 1040;
	}

	.sidebar-toggle {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 14px;
		padding: 8px 14px;
		border: 1px solid var(--cpl-line);
		border-radius: 999px;
		background: #fff;
		font-weight: 600;
		cursor: pointer;
	}
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

	.sidebar-toggle {
		min-height: 40px;
	}
}
</style>
