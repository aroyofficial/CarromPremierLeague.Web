import { onMounted, onUnmounted } from "vue";
import { keepFresh } from "@/utils/realtime";
import { ADMIN_FAST_POLL_MS, guarded } from "@/utils/realtimeRules";

/**
 * Keeps a screen current: refetch on a notice for one of `areas`, when the stream opens or drops,
 * when the tab becomes visible again, and on the fallback poll. `paused` skips a refetch while the
 * screen has unsaved edits.
 */
export const useLive = (refresh, { areas, fastMs, slowMs, paused } = {}) => {
	const run = guarded(refresh, paused);
	let stop = null;
	const onVisible = () => {
		if (document.visibilityState === "visible") run();
	};
	onMounted(() => {
		stop = keepFresh(run, { areas, fastMs, slowMs });
		document.addEventListener("visibilitychange", onVisible);
	});
	onUnmounted(() => {
		stop?.();
		stop = null;
		document.removeEventListener("visibilitychange", onVisible);
	});
	return run;
};

export const useAdminLive = (refresh, options = {}) => useLive(refresh, { fastMs: ADMIN_FAST_POLL_MS, ...options });
