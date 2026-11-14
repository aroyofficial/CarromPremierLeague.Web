export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export const IMAGE_ACCEPT = IMAGE_TYPES.join(",");
export const VIDEO_ACCEPT = `${VIDEO_TYPES.join(",")},.mp4,.webm,.mov,.m4v`;

const PALETTE = ["#1f6feb", "#8250df", "#bf3989", "#cf222e", "#bc4c00", "#1a7f37", "#0969da", "#6e7781"];

export const playerName = (player) => [player?.first_name, player?.last_name].filter(Boolean).join(" ").trim();

export const initialsOf = (name) => {
	const words = String(name || "")
		.trim()
		.split(/\s+/)
		.filter(Boolean);
	if (!words.length) return "?";
	const letters = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[words.length - 1][0];
	return letters.toUpperCase();
};

const colorFor = (name) => {
	let hash = 0;
	for (const char of String(name || "")) hash = (hash * 31 + char.codePointAt(0)) >>> 0;
	return PALETTE[hash % PALETTE.length];
};

const escapeXml = (value) =>
	value.replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char]);

export const initialsImage = (name, kind = "player") => {
	const text = escapeXml(initialsOf(name));
	const shape =
		kind === "team"
			? `<rect width="128" height="128" rx="24" fill="${colorFor(name)}"/>`
			: `<rect width="128" height="128" fill="${colorFor(name)}"/>`;
	const svg =
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">${shape}` +
		`<text x="64" y="64" dy=".35em" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" ` +
		`font-size="52" font-weight="600" fill="#fff">${text}</text></svg>`;
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export const imageFileProblem = (file) => {
	if (!file) return "Choose an image to upload.";
	if (!IMAGE_TYPES.includes(file.type)) return "Choose a JPEG, PNG or WebP image.";
	if (file.size > MAX_IMAGE_BYTES) return "The image must be 5 MB or smaller.";
	return "";
};

const videoName = (file) => VIDEO_TYPES.includes(file?.type) || /\.(mp4|webm|mov|m4v)$/i.test(file?.name || "");

export const mediaFileProblem = (file) => {
	if (!file) return "Choose a photo or a video to upload.";
	if (IMAGE_TYPES.includes(file.type)) return imageFileProblem(file);
	if (videoName(file)) {
		if (file.size > MAX_VIDEO_BYTES) return "The video must be 50 MB or smaller.";
		return "";
	}
	return "Choose a JPEG, PNG, WebP, MP4, WebM or MOV file.";
};

export const spokenDate = (value) => {
	const text = String(value || "").slice(0, 10);
	const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!match) return text;
	const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
	if (Number.isNaN(date.getTime())) return text;
	return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
};

export const publicImageLinkProblem = (value) => {
	const text = String(value || "").trim();
	if (!text) return "Paste a public image link.";
	let url;
	try {
		url = new URL(text);
	} catch {
		return "Enter a full link starting with http:// or https://.";
	}
	if (url.protocol !== "https:" && url.protocol !== "http:") return "Enter a public http or https link.";
	if (url.username || url.password) return "Enter a public link without a username or password.";
	const host = url.hostname.toLowerCase();
	if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
		return "Enter a public image link.";
	}
	return "";
};
