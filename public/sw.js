self.addEventListener("push", (event) => {
	let payload = {};
	try {
		payload = event.data ? event.data.json() : {};
	} catch (error) {
		payload = { title: "Carrom Premier League", body: event.data ? event.data.text() : "" };
	}
	const title = payload.title || "Carrom Premier League";
	event.waitUntil(
		self.registration.showNotification(title, {
			body: payload.body || "",
			tag: payload.tag || "cpl-match",
			data: { url: payload.url || "./" },
		}),
	);
});

const API_BASE = (new URL(self.location.href).searchParams.get("api") || "").replace(/\/+$/, "");

function keyBytes(value) {
	const padding = "=".repeat((4 - (value.length % 4)) % 4);
	const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
	return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

// The browser can rotate a subscription (expiry, key change). Register the new one and
// retire the old one, so this device keeps getting alerts with the same choices.
async function resubscribe(oldSubscription, newSubscription) {
	if (!API_BASE) return;
	let next = newSubscription;
	if (!next) {
		const response = await fetch(`${API_BASE}/notifications/capabilities`);
		const body = await response.json();
		const publicKey = body && body.data && body.data.push && body.data.push.public_key;
		if (!publicKey) return;
		next = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
	}
	const json = next.toJSON();
	await fetch(`${API_BASE}/notifications/subscriptions`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			endpoint: next.endpoint,
			p256dh: json.keys.p256dh,
			auth: json.keys.auth,
			replaces_endpoint: oldSubscription ? oldSubscription.endpoint : null,
		}),
	});
}

self.addEventListener("pushsubscriptionchange", (event) => {
	event.waitUntil(resubscribe(event.oldSubscription, event.newSubscription));
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const target = (event.notification.data && event.notification.data.url) || "./";
	const wanted = new URL(target, self.location.origin);
	event.waitUntil(
		self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
			const existing = windows.find((item) => {
				try {
					const open = new URL(item.url);
					return open.origin === wanted.origin && open.pathname === wanted.pathname;
				} catch (error) {
					return false;
				}
			});
			if (!existing) return self.clients.openWindow(wanted.href);
			return existing.focus().then((client) => (wanted.hash && client && client.navigate ? client.navigate(wanted.href) : client));
		}),
	);
});
