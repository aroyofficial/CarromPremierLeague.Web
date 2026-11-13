import { useAuthStore } from "@/store/authStore";
import { Permission } from "@/utils/constants";

export const usePermissions = () => {
	const authStore = useAuthStore();
	return {
		Permission,
		can: (code) => authStore.can(code),
		canAny: (codes) => authStore.canAny(codes),
		canAll: (codes) => authStore.canAll(codes),
	};
};
