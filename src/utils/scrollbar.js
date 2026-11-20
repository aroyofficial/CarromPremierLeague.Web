import { OverlayScrollbars } from "overlayscrollbars";

const OPTIONS = {
	scrollbars: {
		theme: "os-theme-cpl",
		autoHide: "move",
		autoHideDelay: 500,
		clickScroll: true,
	},
};

// Element Plus owns .el-scrollbar. Form controls keep a native bar. Both are themed in CSS.
const SKIP = [
	"textarea",
	"input",
	"select",
	"option",
	"[contenteditable='true']",
	".el-scrollbar",
	".os-scrollbar",
	".os-size-observer",
	".viewer-stage",
].join(", ");

const snapshots = new WeakMap();

const scrolls = (style) => {
	const axes = [style.overflowX, style.overflowY];
	return axes.some((value) => value === "auto" || value === "scroll");
};

const remember = (element, style) => {
	const snapshot = {
		display: style.display,
		flexDirection: style.flexDirection,
		flexWrap: style.flexWrap,
		alignItems: style.alignItems,
		overflowX: style.overflowX,
		overflowY: style.overflowY,
		scrollBehavior: style.scrollBehavior,
		position: style.position,
	};
	snapshots.set(element, snapshot);
	return snapshot;
};

const applySnapshot = (element) => {
	const snapshot = snapshots.get(element);
	if (!snapshot || element.style.getPropertyValue("--cpl-os-display") === snapshot.display) return;
	const set = (name, value) => element.style.setProperty(name, value);
	set("--cpl-os-display", snapshot.display);
	set("--cpl-os-flex-direction", snapshot.flexDirection);
	set("--cpl-os-flex-wrap", snapshot.flexWrap);
	set("--cpl-os-align", snapshot.alignItems);
	set("--cpl-os-overflow-x", snapshot.overflowX);
	set("--cpl-os-overflow-y", snapshot.overflowY);
	set("--cpl-os-scroll-behavior", snapshot.scrollBehavior);
	if (snapshot.position !== "static") {
		set("--cpl-os-position", snapshot.position);
		element.setAttribute("data-cpl-os-position", "");
	}
};

const consider = (element) => {
	if (!(element instanceof HTMLElement)) return;
	if (element === document.body || element === document.documentElement) return;
	if (element.closest(SKIP)) return;
	const instance = OverlayScrollbars(element);
	if (instance) {
		if (!instance.state().destroyed) applySnapshot(element);
		return;
	}
	const style = getComputedStyle(element);
	if (!scrolls(style)) return;
	const snapshot = remember(element, style);
	const created = OverlayScrollbars(
		{
			target: element,
			elements: {
				viewport: element,
				padding: false,
				content: false,
			},
			cancel: {
				nativeScrollbarsOverlaid: false,
				body: true,
			},
		},
		OPTIONS,
	);
	if (!created || created.state().destroyed || created.elements().viewport !== element) {
		created?.destroy();
		snapshots.delete(element);
		return;
	}
	applySnapshot(element);
	snapshots.set(element, snapshot);
};

const scan = (root) => {
	if (!(root instanceof Element) || root.closest(".os-scrollbar, .os-size-observer")) return;
	consider(root);
	root.querySelectorAll("*").forEach((element) => consider(element));
};

const destroyTree = (node) => {
	if (!(node instanceof HTMLElement)) return;
	node.querySelectorAll("[data-overlayscrollbars]").forEach((element) => {
		OverlayScrollbars(element)?.destroy();
		snapshots.delete(element);
	});
	OverlayScrollbars(node)?.destroy();
	snapshots.delete(node);
};

export function installScrollbars() {
	let queued = [];
	let frame = 0;
	const flush = () => {
		frame = 0;
		const batch = queued;
		queued = [];
		batch.forEach((job) => (job.scan ? scan(job.node) : consider(job.node)));
	};
	const queue = (node, scanNode) => {
		queued.push({ node, scan: scanNode });
		if (!frame) frame = requestAnimationFrame(flush);
	};

	scan(document.body);

	const observer = new MutationObserver((records) => {
		records.forEach((record) => {
			if (record.type === "attributes") {
				if (record.target instanceof HTMLElement) queue(record.target, false);
				return;
			}
			record.removedNodes.forEach(destroyTree);
			record.addedNodes.forEach((node) => {
				if (node instanceof Element) queue(node, true);
			});
		});
	});
	observer.observe(document.body, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: ["class", "style"],
	});
}
