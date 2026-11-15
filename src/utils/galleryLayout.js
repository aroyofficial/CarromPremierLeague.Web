export const GALLERY_ROW_GAP = 4;

export function galleryAspect(photo) {
	const width = Number(photo?.width) || 4;
	const height = Number(photo?.height) || 3;
	return Math.min(Math.max(width / Math.max(height, 1), 0.45), 2.6);
}

// Justified rows shared by the public gallery and the admin gallery.
// A full row is stretched to the container width. The last row keeps the target height.
export function packGalleryRows(list, containerWidth) {
	const width = Math.max(containerWidth || 0, 320);
	const target = width < 720 ? 160 : 200;
	const rows = [];
	let row = [];
	let ratioSum = 0;
	const flush = (last) => {
		if (!row.length) return;
		const gaps = GALLERY_ROW_GAP * Math.max(row.length - 1, 0);
		const fitted = (width - gaps) / ratioSum;
		const height = Math.round(Math.min(fitted, last ? target : 340));
		const cells = row.map((photo) => ({
			photo,
			width: Math.max(72, Math.round(galleryAspect(photo) * height)),
			height,
		}));
		if (!last) {
			const used = cells.reduce((sum, cell) => sum + cell.width, 0);
			let spare = width - gaps - used;
			let index = 0;
			while (spare !== 0 && index < cells.length * 8) {
				const cell = cells[index % cells.length];
				if (spare > 0) {
					cell.width += 1;
					spare -= 1;
				} else if (cell.width > 72) {
					cell.width -= 1;
					spare += 1;
				} else {
					break;
				}
				index += 1;
			}
		}
		rows.push(cells);
		row = [];
		ratioSum = 0;
	};
	for (const photo of list) {
		const ratio = galleryAspect(photo);
		const nextHeight = (width - GALLERY_ROW_GAP * row.length) / (ratioSum + ratio);
		if (row.length && nextHeight < target * 0.82) flush(false);
		row.push(photo);
		ratioSum += ratio;
	}
	flush(true);
	return rows;
}
