<template>
	<el-tooltip popper-class="cpl-tooltip-popper">
		<slot />
		<template #content>
			<div class="cpl-tooltip-body">
				<slot name="content">{{ content }}</slot>
			</div>
		</template>
	</el-tooltip>
</template>

<script setup>
// The one tooltip for the whole app. Long text stays inside a box of fixed maximum height and scrolls,
// instead of growing past the screen. Other props (placement, show-after, effect) go to el-tooltip.
defineProps({
	content: { type: String, default: "" },
});
</script>

<style>
.cpl-tooltip-popper.el-popper {
	padding: 0;
	max-width: min(320px, calc(100vw - 24px));
}

/* The scrolling lives in the body so the popper arrow, which sits outside the box, is not clipped. */
.cpl-tooltip-popper .cpl-tooltip-body {
	max-height: 140px;
	overflow-y: auto;
	overscroll-behavior: contain;
	padding: 6px 11px;
	line-height: 1.45;
	overflow-wrap: anywhere;
	text-align: left;
	/* Native fallback until the app's overlay scrollbar attaches. */
	scrollbar-width: thin;
	scrollbar-color: color-mix(in srgb, currentColor 55%, transparent) transparent;
}

/* The tooltip colours flip with the theme, so the handle follows the text colour to stay visible on both. */
.cpl-tooltip-popper .os-theme-cpl {
	--os-handle-bg: color-mix(in srgb, currentColor 55%, transparent);
	--os-handle-bg-hover: color-mix(in srgb, currentColor 80%, transparent);
	--os-handle-bg-active: currentColor;
}
</style>
