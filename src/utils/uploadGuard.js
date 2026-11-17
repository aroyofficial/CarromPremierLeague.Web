import { onBeforeUnmount, watch } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import { ElMessageBox } from "element-plus";

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

	onBeforeRouteLeave(async () => {
		if (!isBusy.value) return true;
		try {
			await ElMessageBox.confirm(
				"The picture is still uploading. If you leave now, the upload stops.",
				"Leave this page?",
				{ confirmButtonText: "Leave", cancelButtonText: "Stay", type: "warning" },
			);
			return true;
		} catch {
			return false;
		}
	});
}
