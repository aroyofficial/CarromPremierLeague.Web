<template>
	<button
		type="button"
		class="theme-toggle"
		:aria-label="label"
		:title="label"
		:aria-pressed="isDark"
		data-theme-toggle
		@click="toggleTheme"
	>
		<el-icon class="theme-icon"><Sunny v-if="isDark" /><Moon v-else /></el-icon>
	</button>
</template>

<script setup>
import { computed } from "vue";
import { Moon, Sunny } from "@element-plus/icons-vue";
import { theme, toggleTheme } from "@/utils/theme";

const isDark = computed(() => theme.value === "dark");
const label = computed(() => (isDark.value ? "Switch to light theme" : "Switch to dark theme"));
</script>

<style scoped>
.theme-toggle {
	flex: 0 0 auto;
	width: 40px;
	height: 40px;
	display: inline-grid;
	place-items: center;
	padding: 0;
	border: 1px solid rgba(255, 255, 255, 0.2);
	border-radius: 12px;
	background: transparent;
	color: var(--cpl-gold-400);
	cursor: pointer;
	transition: background 0.2s ease, border-color 0.2s ease;
}

.theme-toggle:hover {
	background: rgba(255, 255, 255, 0.08);
	border-color: rgba(255, 209, 102, 0.55);
}

.theme-toggle:focus-visible {
	outline: 2px solid var(--cpl-gold-400);
	outline-offset: 2px;
}

.theme-icon {
	font-size: 19px;
}
</style>
