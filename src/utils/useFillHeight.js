import { onUnmounted, ref, watch } from "vue";

// Pixel height of the box, so Element Plus can scroll the table body inside it.
export function useFillHeight() {
	const box = ref(null);
	const height = ref(320);
	let observer;

	const measure = () => {
		const element = box.value;
		if (!element) return;
		const main = element.closest(".admin-main");
		const page = element.closest(".admin-page");
		const head = page?.querySelector(":scope > .admin-page-head");
		let next = Math.floor(element.clientHeight);
		if (main && head) {
			const mainStyle = getComputedStyle(main);
			const headStyle = getComputedStyle(head);
			const card = element.closest(".admin-card");
			const cardStyle = card ? getComputedStyle(card) : null;
			const cardChrome = cardStyle
				? parseFloat(cardStyle.paddingTop) + parseFloat(cardStyle.paddingBottom)
					+ parseFloat(cardStyle.borderTopWidth) + parseFloat(cardStyle.borderBottomWidth)
				: 0;
			next = Math.floor(
				main.clientHeight
				- parseFloat(mainStyle.paddingTop)
				- parseFloat(mainStyle.paddingBottom)
				- head.offsetHeight
				- parseFloat(headStyle.marginTop)
				- parseFloat(headStyle.marginBottom)
				- cardChrome,
			);
		}
		if (next > 0 && next !== height.value) height.value = next;
	};

	const attach = (element) => {
		observer?.disconnect();
		observer = null;
		if (!element) return;
		observer = new ResizeObserver(measure);
		observer.observe(element);
		const main = element.closest(".admin-main");
		if (main && main !== element) observer.observe(main);
		measure();
	};

	watch(box, attach, { flush: "post" });
	onUnmounted(() => observer?.disconnect());

	return { box, height };
}
