import { ElLoading } from "element-plus";

let loaderInstance = null;
const BGM_ID = "cpl-bgm-audio";

export function playBgm() {
	if (document.getElementById(BGM_ID)) return;

	const audio = document.createElement("audio");
	audio.id = BGM_ID;
	audio.src = new URL("../assets/audio/bgm.mp3", import.meta.url).href;
	audio.loop = true;

	document.body.appendChild(audio);
	audio.play().catch((err) => {
		console.warn("Autoplay blocked:", err);
	});
}

export function pauseBgm() {
	const audio = document.getElementById(BGM_ID);

	if (audio) {
		audio.pause();
		audio.remove();
	}
}

export function resolveAsset(url) {
	const env = import.meta.env.VITE_WEB_ENV;
	if (env === "dev") {
		return url;
	}
	return url.replace("public", "");
}

export function startLoader(text = "Loading...") {
	if (loaderInstance) return;

	loaderInstance = ElLoading.service({
		lock: true,
		text: text,
		background: "rgba(0, 0, 0, 0.7)",
	});
}

export function pauseLoader() {
	if (loaderInstance) {
		loaderInstance.close();
		loaderInstance = null;
	}
}

document.addEventListener("DOMContentLoaded", () => {
	const link = document.createElement("link");
	link.rel = "icon";
	link.type = "image/png";
	link.href = resolveAsset("public/assets/images/favicon.png");
	link.sizes = "96x96";

	document.head.appendChild(link);
});
