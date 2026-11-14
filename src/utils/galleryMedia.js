const YOUTUBE_ID = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/;
const VIMEO_ID = /(?:player\.)?vimeo\.com\/(?:video\/)?(\d+)/;
const VIDEO_FILE = /\.(mp4|webm|mov|m4v|ogg)(?:$|\?)/i;
const STILL = /\.(jpe?g|png|webp|gif)(?:$|\?)/i;

export const youtubeId = (url) => String(url || "").match(YOUTUBE_ID)?.[1] || "";

export const vimeoId = (url) => String(url || "").match(VIMEO_ID)?.[1] || "";

export const isVideoUrl = (url) => {
	const text = String(url || "");
	return Boolean(youtubeId(text) || vimeoId(text) || VIDEO_FILE.test(text) || text.toLowerCase().includes("/video/upload/"));
};

export const isVideoItem = (item) => item?.media_type === "video" || isVideoUrl(item?.url);

export const videoPoster = (url) => {
	const id = youtubeId(url);
	return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "";
};

export const embedUrl = (url, { autoplay = false } = {}) => {
	const flag = autoplay ? "1" : "0";
	const youtube = youtubeId(url);
	if (youtube) return `https://www.youtube-nocookie.com/embed/${youtube}?rel=0&autoplay=${flag}`;
	const vimeo = vimeoId(url);
	if (vimeo) return `https://player.vimeo.com/video/${vimeo}?autoplay=${flag}`;
	return "";
};

const stillImage = (url) => {
	if (!url) return "";
	if (isVideoUrl(url) && !STILL.test(url)) return "";
	return url;
};

export const tilePoster = (item) => {
	if (!item) return "";
	if (!isVideoItem(item)) return item.thumbnail_url || item.url || "";
	return videoPoster(item.url) || stillImage(item.thumbnail_url) || stillImage(item.placeholder_url) || "";
};
