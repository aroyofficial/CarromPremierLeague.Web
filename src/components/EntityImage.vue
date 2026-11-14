<template>
	<span class="entity-image">
		<img
			:src="shown.src"
			:alt="alt"
			:class="{ 'is-framed': shown.crop }"
			:style="frameStyle"
			loading="lazy"
			decoding="async"
			@error="advance"
		/>
	</span>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useMediaStore } from "@/store/mediaStore";
import { initialsImage } from "@/utils/media";
import { pictureParts } from "@/utils/pictureFrame";

const props = defineProps({
	src: { type: String, default: "" },
	name: { type: String, default: "" },
	kind: { type: String, default: "player", validator: (value) => ["player", "team"].includes(value) },
	alt: { type: String, default: "" },
});

const mediaStore = useMediaStore();
mediaStore.ensureDefaults();

const candidates = computed(() => {
	const fallback = props.kind === "team" ? mediaStore.team : mediaStore.player;
	return [props.src, fallback].filter(Boolean);
});

const failed = ref(new Set());
watch(
	() => props.src,
	() => {
		failed.value = new Set();
	},
);

const current = computed(() => candidates.value.find((url) => !failed.value.has(url)) || initialsImage(props.name, props.kind));
const shown = computed(() => pictureParts(current.value));
const frameStyle = computed(() => {
	const crop = shown.value.crop;
	if (!crop) return null;
	return {
		position: "absolute",
		width: `${100 / crop.w}%`,
		height: `${100 / crop.h}%`,
		left: `${(-crop.x / crop.w) * 100}%`,
		top: `${(-crop.y / crop.h) * 100}%`,
		maxWidth: "none",
		objectFit: "fill",
	};
});

const advance = () => {
	if (String(current.value).startsWith("data:")) return;
	failed.value = new Set([...failed.value, current.value]);
};
</script>

<style scoped>
.entity-image {
	display: inline-block;
	position: relative;
	overflow: hidden;
	line-height: 0;
	vertical-align: middle;
}

.entity-image img {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
}
</style>
