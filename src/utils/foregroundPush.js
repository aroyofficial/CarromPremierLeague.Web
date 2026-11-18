// The service worker sends a message instead of a system alert when this page is in front
// of the person. Show that message in the page. Returns a function that stops listening.
export function listenForForegroundPush(container, show) {
	if (!container || typeof container.addEventListener !== "function") return () => undefined;
	const onMessage = (event) => {
		const data = event && event.data;
		if (!data || data.type !== "cpl-push" || typeof data.title !== "string") return;
		show(data.body ? `${data.title}: ${data.body}` : data.title);
	};
	container.addEventListener("message", onMessage);
	return () => container.removeEventListener("message", onMessage);
}
