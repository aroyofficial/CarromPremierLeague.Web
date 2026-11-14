<template>
	<img :src="current" :alt="alt" loading="lazy" decoding="async" @error="advance" />
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useMediaStore } from "@/store/mediaStore";
import { initialsImage } from "@/utils/media";

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

const current = computed(
	() => candidates.value.find((url) => !failed.value.has(url)) || initialsImage(props.name, props.kind),
);

const advance = () => {
	if (current.value.startsWith("data:")) return;
	failed.value = new Set([...failed.value, current.value]);
};
</script>
