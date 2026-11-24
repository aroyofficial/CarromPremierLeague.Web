// Screen sizes the admin can preview a broadcast overlay on. The overlay itself is a fixed 1920x1080 canvas that
// the live widget page scales to fit the window (contain), so each preset is a window size to fit it into.
export const DESIGN_WIDTH = 1920;
export const DESIGN_HEIGHT = 1080;

export const PREVIEW_DEVICES = Object.freeze([
	{ id: "stream", label: "Stream 16:9", width: 1920, height: 1080, frame: "none" },
	{ id: "laptop", label: "Laptop", width: 1366, height: 768, frame: "laptop" },
	{ id: "tablet-landscape", label: "Tablet", width: 1024, height: 768, frame: "tablet", note: "landscape" },
	{ id: "tablet-portrait", label: "Tablet", width: 768, height: 1024, frame: "tablet", note: "portrait" },
	{ id: "phone-landscape", label: "Phone", width: 844, height: 390, frame: "phone", note: "landscape" },
	{ id: "phone-portrait", label: "Phone", width: 390, height: 844, frame: "phone", note: "portrait" },
]);

export const DEFAULT_PREVIEW_DEVICE = "stream";

export const findPreviewDevice = (id) =>
	PREVIEW_DEVICES.find((device) => device.id === id) || PREVIEW_DEVICES.find((device) => device.id === DEFAULT_PREVIEW_DEVICE);

export const deviceTitle = (device) => (device.note ? `${device.label} ${device.note}` : device.label);

/** Largest box with the device's aspect ratio that fits in the free space. Returns whole pixels. */
export const fitBox = (availWidth, availHeight, device) => {
	const w = Number(availWidth);
	const h = Number(availHeight);
	if (!(w > 0) || !(h > 0)) return { width: 0, height: 0 };
	const ratio = Math.min(w / device.width, h / device.height);
	return { width: Math.floor(device.width * ratio), height: Math.floor(device.height * ratio) };
};

/** The overlay is fitted inside the window without cropping, exactly like the live widget page does. */
export const fitScale = (width, height) => {
	const w = Number(width);
	const h = Number(height);
	if (!(w > 0) || !(h > 0)) return 1;
	return Math.min(w / DESIGN_WIDTH, h / DESIGN_HEIGHT);
};
