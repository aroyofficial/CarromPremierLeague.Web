const DEVICE_KEY = "cpl_admin_device";

export function deviceId() {
	let id = localStorage.getItem(DEVICE_KEY);
	if (!id) {
		id = crypto.randomUUID().replace(/-/g, "");
		localStorage.setItem(DEVICE_KEY, id);
	}
	return id;
}

export function deviceLabel() {
	const agent = navigator.userAgent || "";
	let browser = "Browser";
	if (agent.includes("Edg/")) browser = "Edge";
	else if (agent.includes("Chrome/")) browser = "Chrome";
	else if (agent.includes("Firefox/")) browser = "Firefox";
	else if (agent.includes("Safari/")) browser = "Safari";
	let system = "this device";
	if (agent.includes("Windows")) system = "Windows";
	else if (agent.includes("Mac OS")) system = "Mac";
	else if (agent.includes("Android")) system = "Android";
	else if (agent.includes("iPhone") || agent.includes("iPad")) system = "iOS";
	return `${browser} on ${system}`;
}
