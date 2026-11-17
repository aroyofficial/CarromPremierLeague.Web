import { createApp, h, ref } from "vue";
import CarromLoader from "@/components/CarromLoader.vue";
import { isLoading, loadingText } from "./carromLoadingState.js";

const KEY = Symbol("carromLoading");

export { isLoading, loadingText };

function clear(el) {
	const state = el[KEY];
	if (!state) return;
	state.app.unmount();
	state.host.remove();
	if (state.restorePosition !== null) el.style.position = state.restorePosition;
	if (state.restoreMin !== null) el.style.minHeight = state.restoreMin;
	el[KEY] = null;
}

function show(el, text) {
	const current = el[KEY];
	if (current) {
		current.label.value = text;
		return;
	}

	const position = getComputedStyle(el).position;
	let restorePosition = null;
	if (position === "static") {
		restorePosition = el.style.position;
		el.style.position = "relative";
	}

	let restoreMin = null;
	if (el.getBoundingClientRect().height < 120) {
		restoreMin = el.style.minHeight;
		el.style.minHeight = "180px";
	}

	const label = ref(text);
	const host = document.createElement("div");
	host.className = "carrom-region-mask";
	el.appendChild(host);
	const app = createApp({
		render: () => h(CarromLoader, { overlay: false, text: label.value }),
	});
	app.mount(host);
	el[KEY] = { app, host, label, restorePosition, restoreMin };
}

function sync(el, binding) {
	if (!isLoading(binding.value)) {
		clear(el);
		return;
	}
	show(el, loadingText(el, binding.value));
}

export const carromLoading = {
	mounted: sync,
	updated: sync,
	unmounted: clear,
};
