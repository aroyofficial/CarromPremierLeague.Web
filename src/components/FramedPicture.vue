<template>
	<span class="framed" :class="{ 'has-frame': crop }">
		<img :src="parts.src" :alt="alt" :style="frameStyle" draggable="false" @error="$emit('error')" />
	</span>
</template>

<script setup>
import { computed } from "vue";
import { pictureParts } from "@/utils/pictureFrame";

const props = defineProps({
	src: { type: String, default: "" },
	alt: { type: String, default: "" },
});

defineEmits(["error"]);

const parts = computed(() => pictureParts(props.src));
const crop = computed(() => parts.value.crop);
const frameStyle = computed(() => {
	const frame = crop.value;
	if (!frame) return null;
	return {
		position: "absolute",
		width: `${100 / frame.w}%`,
		height: `${100 / frame.h}%`,
		left: `${(-frame.x / frame.w) * 100}%`,
		top: `${(-frame.y / frame.h) * 100}%`,
		maxWidth: "none",
		maxHeight: "none",
		objectFit: "fill",
	};
});
</script>

<style scoped>
.framed {
	position: relative;
	display: block;
	width: 100%;
	height: 100%;
	overflow: hidden;
}

.framed img {
	width: 100%;
	height: 100%;
	object-fit: contain;
	display: block;
}

.framed.has-frame img {
	object-fit: fill;
}
</style>
