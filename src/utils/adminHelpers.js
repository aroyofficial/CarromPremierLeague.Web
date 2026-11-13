import { ElMessage, ElMessageBox } from "element-plus";
import { apiErrorMessage } from "@/services/adminService";
import { resolveAsset } from "@/utils/common";

export const assetUrl = (url) => {
	if (!url) return "";
	return /^(https?:)?\/\//i.test(url) || url.startsWith("data:") ? url : resolveAsset(url);
};

export const unwrap = (response) => response?.data ?? null;

export const runAction = async (action, successMessage) => {
	try {
		const result = await action();
		if (successMessage) ElMessage.success(successMessage);
		return { ok: true, result };
	} catch (error) {
		ElMessage.error(apiErrorMessage(error));
		return { ok: false, error };
	}
};

export const confirmDelete = (label) =>
	ElMessageBox.confirm(`Delete ${label}? This cannot be undone from the admin console.`, "Confirm delete", {
		confirmButtonText: "Delete",
		cancelButtonText: "Cancel",
		type: "warning",
		confirmButtonClass: "el-button--danger",
	})
		.then(() => true)
		.catch(() => false);

export const defaultSeasonId = (seasons) => (seasons.find((season) => season.show) || seasons[0])?.id ?? null;

export const blankToNull = (payload) =>
	Object.fromEntries(
		Object.entries(payload).map(([key, value]) => [key, typeof value === "string" && value.trim() === "" ? null : value]),
	);

export const matchesSearch = (search, ...values) => {
	const term = (search || "").trim().toLowerCase();
	if (!term) return true;
	return values.some((value) => String(value ?? "").toLowerCase().includes(term));
};
