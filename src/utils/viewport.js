import { onMounted, onUnmounted, ref } from "vue";

export const PHONE_QUERY = "(max-width: 575.98px)";

export const useMediaQuery = (query) => {
	const mediaQuery = window.matchMedia(query);
	const matches = ref(mediaQuery.matches);
	const update = (event) => {
		matches.value = event.matches;
	};
	onMounted(() => mediaQuery.addEventListener("change", update));
	onUnmounted(() => mediaQuery.removeEventListener("change", update));
	return matches;
};

export const useIsPhone = () => useMediaQuery(PHONE_QUERY);
