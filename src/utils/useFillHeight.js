import { onMounted, onUnmounted, ref, watch } from "vue";

// Keeps a pixel height equal to the box, so a table can scroll inside it.
export function useFillHeight() {
	const box = ref(null);
	const height = ref(240);
	let observer;

	const measure = () => {
		const next = box.value?.clientHeight || 0;
		if (next > 0) height.value = next;
	};

	const attach = (element) => {
		observer?.disconnect();
		observer = null;
		if (!element) return;
		observer = new ResizeObserver(measure);
		observer.observe(element);
		measure();
	};

	watch(box, attach);
	onMounted(() => attach(box.value));
	onUnmounted(() => observer?.disconnect());

	return { box, height };
}
