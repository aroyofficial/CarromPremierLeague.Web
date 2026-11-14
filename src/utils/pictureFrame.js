const CROP = /^cplcrop=([0-9]*\.?[0-9]+),([0-9]*\.?[0-9]+),([0-9]*\.?[0-9]+),([0-9]*\.?[0-9]+)$/;

const inRange = (value) => Number.isFinite(value) && value >= 0 && value <= 1;

export const pictureParts = (src) => {
	const text = String(src || "");
	const hashAt = text.indexOf("#");
	const base = hashAt >= 0 ? text.slice(0, hashAt) : text;
	const fragment = hashAt >= 0 ? text.slice(hashAt + 1) : "";
	const match = CROP.exec(fragment);
	if (!match) return { src: base, crop: null };
	const [x, y, w, h] = match.slice(1).map(Number);
	if (![x, y, w, h].every(inRange) || w <= 0 || h <= 0 || x + w > 1.001 || y + h > 1.001) {
		return { src: base, crop: null };
	}
	return { src: base, crop: { x, y, w, h } };
};

export const withCrop = (url, crop) => {
	const base = String(url || "").split("#")[0];
	if (!crop) return base;
	const number = (value) => (Math.round(value * 10000) / 10000).toFixed(4);
	return `${base}#cplcrop=${number(crop.x)},${number(crop.y)},${number(crop.w)},${number(crop.h)}`;
};

export const frameFractions = ({ naturalWidth, naturalHeight, viewSize, panX, panY, zoom, circle }) => {
	const cover = Math.max(viewSize / naturalWidth, viewSize / naturalHeight);
	const scale = cover * zoom;
	const width = naturalWidth * scale;
	const height = naturalHeight * scale;
	const left = viewSize / 2 + panX - width / 2;
	const top = viewSize / 2 + panY - height / 2;
	const side = circle.r * 2;
	let x = (circle.cx - circle.r - left) / scale / naturalWidth;
	let y = (circle.cy - circle.r - top) / scale / naturalHeight;
	let w = side / scale / naturalWidth;
	let h = side / scale / naturalHeight;
	x = Math.min(1, Math.max(0, x));
	y = Math.min(1, Math.max(0, y));
	w = Math.min(Math.max(w, 0.01), 1 - x);
	h = Math.min(Math.max(h, 0.01), 1 - y);
	return { x, y, w, h };
};

export const imagePlacement = ({ naturalWidth, naturalHeight, viewSize, panX, panY, zoom }) => {
	const cover = Math.max(viewSize / naturalWidth, viewSize / naturalHeight);
	const scale = cover * zoom;
	const width = naturalWidth * scale;
	const height = naturalHeight * scale;
	return {
		scale,
		width,
		height,
		left: viewSize / 2 + panX - width / 2,
		top: viewSize / 2 + panY - height / 2,
	};
};

export const clampFrame = ({ naturalWidth, naturalHeight, viewSize, panX, panY, zoom, circle }) => {
	const radius = Math.min(Math.max(circle.r, viewSize * 0.18), viewSize * 0.48);
	let cx = Math.min(Math.max(circle.cx, radius), viewSize - radius);
	let cy = Math.min(Math.max(circle.cy, radius), viewSize - radius);
	const place = (nextPanX, nextPanY) => imagePlacement({ naturalWidth, naturalHeight, viewSize, panX: nextPanX, panY: nextPanY, zoom });
	let placed = place(panX, panY);
	const minPanX = cx + radius - viewSize / 2 - placed.width / 2;
	const maxPanX = cx - radius - viewSize / 2 + placed.width / 2;
	const minPanY = cy + radius - viewSize / 2 - placed.height / 2;
	const maxPanY = cy - radius - viewSize / 2 + placed.height / 2;
	const nextPanX = Math.min(Math.max(panX, minPanX), maxPanX);
	const nextPanY = Math.min(Math.max(panY, minPanY), maxPanY);
	placed = place(nextPanX, nextPanY);
	const minCx = placed.left + radius;
	const maxCx = placed.left + placed.width - radius;
	const minCy = placed.top + radius;
	const maxCy = placed.top + placed.height - radius;
	cx = Math.min(Math.max(cx, minCx), maxCx);
	cy = Math.min(Math.max(cy, minCy), maxCy);
	return { panX: nextPanX, panY: nextPanY, circle: { cx, cy, r: radius } };
};

export const cropToFile = (image, fractions, type) =>
	new Promise((resolve, reject) => {
		const canvas = document.createElement("canvas");
		const size = 512;
		canvas.width = size;
		canvas.height = size;
		const context = canvas.getContext("2d");
		if (!context) {
			reject(new Error("Could not prepare the picture."));
			return;
		}
		context.drawImage(
			image,
			fractions.x * image.naturalWidth,
			fractions.y * image.naturalHeight,
			fractions.w * image.naturalWidth,
			fractions.h * image.naturalHeight,
			0,
			0,
			size,
			size,
		);
		const mime = type === "image/png" ? "image/png" : "image/jpeg";
		canvas.toBlob(
			(blob) => {
				if (!blob) {
					reject(new Error("Could not prepare the picture."));
					return;
				}
				resolve(new File([blob], mime === "image/png" ? "picture.png" : "picture.jpg", { type: mime }));
			},
			mime,
			0.92,
		);
	});
