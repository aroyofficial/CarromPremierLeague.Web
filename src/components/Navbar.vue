<template>
	<header class="app-header" :class="{ 'is-scrolled': isScrolled }">
		<nav class="nav-inner" aria-label="Main navigation">
			<router-link :to="Routes.HOME" class="brand" @click="closeMenu">
				<img :src="logoSrc" alt="" class="brand-logo" />
				<span class="brand-text">
					<span class="brand-short">CPL</span>
					<span class="brand-full">Carrom Premier League</span>
				</span>
			</router-link>

			<ul class="nav-links desktop-only">
				<li v-for="item in NavItems" :key="item.path">
					<router-link :to="item.path" class="nav-link" exact-active-class="is-active">
						{{ item.label }}
					</router-link>
				</li>
			</ul>

			<div class="nav-actions desktop-only">
				<template v-if="authStore.isAuthenticated">
					<span class="admin-chip">
						<el-icon><UserFilled /></el-icon>{{ authStore.username }}
					</span>
					<button type="button" class="btn-outline" @click="logout">Logout</button>
				</template>
				<router-link v-else :to="Routes.LOGIN" class="btn-gold">
					<el-icon><Lock /></el-icon>Admin Login
				</router-link>
			</div>

			<button
				type="button"
				class="menu-toggle mobile-only"
				:class="{ 'is-open': isMenuOpen }"
				:aria-expanded="isMenuOpen"
				aria-controls="mobile-menu"
				aria-label="Toggle navigation menu"
				@click="isMenuOpen = !isMenuOpen"
			>
				<span></span><span></span><span></span>
			</button>
		</nav>

		<Transition name="drawer">
			<div v-if="isMenuOpen" id="mobile-menu" class="mobile-panel mobile-only">
				<ul>
					<li v-for="(item, index) in NavItems" :key="item.path" :style="{ '--i': index }">
						<router-link
							:to="item.path"
							class="mobile-link"
							exact-active-class="is-active"
							@click="closeMenu"
						>
							{{ item.label }}
						</router-link>
					</li>
				</ul>
				<div class="mobile-actions">
					<template v-if="authStore.isAuthenticated">
						<span class="admin-chip">
							<el-icon><UserFilled /></el-icon>{{ authStore.username }}
						</span>
						<button type="button" class="btn-outline" @click="logout">Logout</button>
					</template>
					<router-link v-else :to="Routes.LOGIN" class="btn-gold w-100" @click="closeMenu">
						<el-icon><Lock /></el-icon>Admin Login
					</router-link>
				</div>
			</div>
		</Transition>
		<Transition name="fade">
			<div v-if="isMenuOpen" class="backdrop mobile-only" @click="closeMenu"></div>
		</Transition>
	</header>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Lock, UserFilled } from "@element-plus/icons-vue";
import { NavItems, Routes } from "@/utils/constants";
import { resolveAsset } from "@/utils/common";
import { useAuthStore } from "@/store/authStore";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const isMenuOpen = ref(false);
const isScrolled = ref(false);
const logoSrc = resolveAsset("public/assets/images/favicon.png");

const closeMenu = () => {
	isMenuOpen.value = false;
};

const logout = () => {
	authStore.logout();
	closeMenu();
	router.push(Routes.HOME);
};

const onScroll = () => {
	isScrolled.value = window.scrollY > 8;
};

const onKeydown = (event) => {
	if (event.key === "Escape") closeMenu();
};

watch(() => route.fullPath, closeMenu);

watch(isMenuOpen, (open) => {
	document.body.style.overflow = open ? "hidden" : "";
});

onMounted(() => {
	window.addEventListener("scroll", onScroll, { passive: true });
	window.addEventListener("keydown", onKeydown);
	onScroll();
});

onUnmounted(() => {
	window.removeEventListener("scroll", onScroll);
	window.removeEventListener("keydown", onKeydown);
	document.body.style.overflow = "";
});
</script>

<style scoped lang="scss">
.app-header {
	position: fixed;
	inset: 0 0 auto 0;
	height: var(--app-header-height);
	z-index: 1100;
	background: rgba(11, 20, 38, 0.92);
	backdrop-filter: blur(10px);
	border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	transition: box-shadow 0.25s ease, background 0.25s ease;

	&.is-scrolled {
		background: rgba(11, 20, 38, 0.98);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
	}
}

.nav-inner {
	height: 100%;
	max-width: 1280px;
	margin: 0 auto;
	padding: 0 var(--page-gutter);
	display: flex;
	align-items: center;
	gap: 24px;
}

.brand {
	display: flex;
	align-items: center;
	gap: 10px;
	text-decoration: none;
	color: #fff;
	margin-right: auto;
	min-width: 0;
}

.brand-logo {
	width: 36px;
	height: 36px;
	border-radius: 50%;
	box-shadow: 0 0 0 2px var(--cpl-gold-500);
}

.brand-text {
	display: flex;
	flex-direction: column;
	line-height: 1.1;
	min-width: 0;
}

.brand-short {
	font-family: var(--cpl-font-display);
	font-weight: 800;
	font-size: 20px;
	letter-spacing: 0.08em;
	color: var(--cpl-gold-400);
}

.brand-full {
	font-size: 11px;
	color: rgba(255, 255, 255, 0.7);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.nav-links {
	display: flex;
	gap: 4px;
	list-style: none;
	margin: 0;
	padding: 0;
}

.nav-link {
	position: relative;
	display: block;
	padding: 8px 14px;
	color: rgba(255, 255, 255, 0.78);
	text-decoration: none;
	font-size: 14px;
	font-weight: 500;
	border-radius: 999px;
	transition: color 0.2s ease, background 0.2s ease;

	&:hover {
		color: #fff;
		background: rgba(255, 255, 255, 0.08);
	}

	&.is-active {
		color: var(--cpl-navy-900);
		background: var(--cpl-gold-400);
		font-weight: 600;
	}
}

.nav-actions {
	display: flex;
	align-items: center;
	gap: 10px;
}

.btn-gold,
.btn-outline {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	padding: 8px 16px;
	border-radius: 999px;
	font-size: 14px;
	font-weight: 600;
	text-decoration: none;
	cursor: pointer;
	transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn-gold {
	color: var(--cpl-navy-900);
	background: linear-gradient(135deg, var(--cpl-gold-400), var(--cpl-gold-500));
	border: none;
	box-shadow: 0 6px 16px rgba(245, 184, 46, 0.35);

	&:hover {
		transform: translateY(-1px);
		box-shadow: 0 10px 22px rgba(245, 184, 46, 0.45);
	}
}

.btn-outline {
	color: #fff;
	background: transparent;
	border: 1px solid rgba(255, 255, 255, 0.35);

	&:hover {
		border-color: var(--cpl-gold-400);
		color: var(--cpl-gold-400);
	}
}

.admin-chip {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	color: rgba(255, 255, 255, 0.85);
	font-size: 13px;
}

.menu-toggle {
	width: 44px;
	height: 44px;
	display: none;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	gap: 5px;
	background: transparent;
	border: 1px solid rgba(255, 255, 255, 0.2);
	border-radius: 12px;
	cursor: pointer;

	span {
		width: 20px;
		height: 2px;
		background: #fff;
		border-radius: 2px;
		transition: transform 0.3s ease, opacity 0.2s ease;
	}

	&.is-open span:nth-child(1) {
		transform: translateY(7px) rotate(45deg);
	}
	&.is-open span:nth-child(2) {
		opacity: 0;
	}
	&.is-open span:nth-child(3) {
		transform: translateY(-7px) rotate(-45deg);
	}
}

.mobile-panel {
	position: fixed;
	top: var(--app-header-height);
	right: 0;
	width: min(320px, 85vw);
	height: calc(100dvh - var(--app-header-height));
	background: var(--cpl-navy-900);
	padding: 20px;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	gap: 20px;
	z-index: 2;
	overflow-y: auto;

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	li {
		animation: slide-in 0.35s ease both;
		animation-delay: calc(var(--i) * 45ms);
	}
}

.mobile-link {
	display: block;
	padding: 14px 16px;
	border-radius: 12px;
	color: rgba(255, 255, 255, 0.85);
	text-decoration: none;
	font-size: 16px;
	font-weight: 500;

	&.is-active {
		color: var(--cpl-navy-900);
		background: var(--cpl-gold-400);
		font-weight: 600;
	}
}

.mobile-actions {
	margin-top: auto;
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.backdrop {
	position: fixed;
	inset: var(--app-header-height) 0 0 0;
	background: rgba(0, 0, 0, 0.5);
	z-index: 1;
}

.mobile-only {
	display: none;
}

@media (max-width: 991.98px) {
	.desktop-only {
		display: none !important;
	}
	.mobile-only {
		display: flex;
	}
	.backdrop.mobile-only {
		display: block;
	}
}

@media (max-width: 359.98px) {
	.brand-full {
		display: none;
	}
}

@keyframes slide-in {
	from {
		opacity: 0;
		transform: translateX(16px);
	}
	to {
		opacity: 1;
		transform: none;
	}
}

.drawer-enter-active,
.drawer-leave-active {
	transition: transform 0.3s ease;
}
.drawer-enter-from,
.drawer-leave-to {
	transform: translateX(100%);
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>
