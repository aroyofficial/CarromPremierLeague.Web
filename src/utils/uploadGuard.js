import { onBeforeUnmount, watch } from "vue";
import { onBeforeRouteLeave } from "vue-router";

export function useUploadLeaveGuard(isBusy) {
	const onBeforeUnload = (event) => {
		event.preventDefault();
		event.returnValue = "";
	};

	watch(
		isBusy,
		(busy, _, onCleanup) => {
			if (!busy) return;
			window.addEventListener("beforeunload", onBeforeUnload);
			onCleanup(() => window.removeEventListener("beforeunload", onBeforeUnload));
		},
		{ immediate: true },
	);

	onBeforeUnmount(() => window.removeEventListener("beforeunload", onBeforeUnload));

	onBeforeRouteLeave(() => {
		if (!isBusy.value) return true;
		return window.confirm("A picture is still uploading. Leave this page anyway?");
	});
}
