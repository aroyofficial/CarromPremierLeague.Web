import { pauseLoader, startLoader } from "@/utils/common";
import { isLoading } from "./carromLoadingState.js";

const KEY = Symbol("carromLoading");

export { isLoading };

function release(el) {
	if (!el[KEY]) return;
	el[KEY] = false;
	pauseLoader();
}

function sync(el, binding) {
	const active = isLoading(binding.value);
	if (active && !el[KEY]) {
		el[KEY] = true;
		startLoader();
		return;
	}
	if (!active) release(el);
}

export const carromLoading = {
	mounted: sync,
	updated: sync,
	unmounted: release,
};
