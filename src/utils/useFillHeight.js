import { onUnmounted, ref, watch } from "vue";

// Pixel height of the box, so Element Plus can scroll the table body inside it.
export function useFillHeight() {
	const box = ref(null);
	const height = ref(320);
	let observer;

	const measure = () => {
		const next = Math.floor(box.value?.clientHeight || 0);
		if (next > 0 && next !== height.value) height.value = next;
	};

	const attach = (element) => {
		observer?.disconnect();
		observer = null;
		if (!element) return;
		observer = new ResizeObserver(measure);
		observer.observe(element);
		measure();
	};

	watch(box, attach, { flush: "post" });
	onUnmounted(() => observer?.disconnect());

	return { box, height };
}
