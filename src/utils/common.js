import { createApp, h, nextTick, onUnmounted } from "vue";
import { BackgroundMusic } from "./constants";
import CarromLoader from "@/components/CarromLoader.vue";

let loaderApp = null;
let loaderHost = null;
let loaderDepth = 0;
let pageLoaderGen = 0;
let pageLoaderOn = false;
const pageHolds = new Map();
const pageHoldWaiters = new Map();

export async function playBgm(
	type = BackgroundMusic.Match,
	fadeInDuration = 2000,
) {
	let audio = document.getElementById(type);

	if (!audio) {
		audio = document.createElement("audio");
		audio.id = type;

		switch (type) {
			case BackgroundMusic.Countdown:
				audio.src = new URL(
					"../assets/audio/countdown.mp3",
					import.meta.url,
				).href;
				break;

			case BackgroundMusic.Horn:
				audio.src = new URL("../assets/audio/horn.mp3", import.meta.url).href;
				break;

			default:
				audio.src = new URL("../assets/audio/bgm.mp3", import.meta.url).href;
				audio.loop = true;
				break;
		}

		audio.volume = 0;
		document.body.appendChild(audio);
	}

	if (audio.paused) {
		try {
			await audio.play();
		} catch (err) {
			console.warn("Autoplay blocked:", err);
			return;
		}
	}

	await fadeTo(audio, fadeInDuration, 0.6);
}

export async function pauseBgm(
	type = BackgroundMusic.Match,
	fadeOutDuration = 2000,
) {
	const audio = document.getElementById(type);
	if (!audio) return;

	await fadeTo(audio, fadeOutDuration, 0);

	audio.pause();
	audio.currentTime = 0;
	audio.remove();
}

function fadeTo(audio, duration, targetVolume) {
	const startVolume = audio.volume;
	const startTime = performance.now();

	return new Promise((resolve) => {
		function animate(now) {
			const elapsed = now - startTime;
			const progress = Math.min(elapsed / duration, 1);

			let newVolume = startVolume + (targetVolume - startVolume) * progress;
			newVolume = Math.min(1, Math.max(0, newVolume));
			audio.volume = newVolume;

			if (progress < 1) {
				requestAnimationFrame(animate);
			} else {
				audio.volume = Math.min(1, Math.max(0, targetVolume));
				resolve();
			}
		}

		requestAnimationFrame(animate);
	});
}

export function resolveAsset(url) {
	const env = import.meta.env.VITE_WEB_ENV;
	const asset = env === "dev" ? url : url.replace("public", "");
	const path = asset.startsWith("/") ? asset : `/${asset}`;
	const base = import.meta.env.BASE_URL || "/";
	return `${base}${path.slice(1)}`;
}

export function startLoader(options = {}) {
	loaderDepth += 1;
	if (loaderApp) return;

	const theme = typeof options === "string" ? "" : options.theme || "";
	loaderHost = document.createElement("div");
	document.body.appendChild(loaderHost);
	loaderApp = createApp({
		render: () =>
			h(CarromLoader, {
				overlay: true,
				theme,
			}),
	});
	loaderApp.mount(loaderHost);
}

export function pauseLoader() {
	if (loaderDepth === 0) return;
	loaderDepth -= 1;
	if (loaderDepth > 0 || !loaderApp) return;
	loaderApp.unmount();
	loaderHost.remove();
	loaderApp = null;
	loaderHost = null;
}

export function openPageLoader() {
	pageLoaderGen += 1;
	if (!pageLoaderOn) {
		pageLoaderOn = true;
		startLoader();
	}
	return pageLoaderGen;
}

export function closePageLoader(gen) {
	if (!pageLoaderOn || gen !== pageLoaderGen) return;
	pageLoaderOn = false;
	pauseLoader();
}

export function dismissPageLoader() {
	if (!pageLoaderOn) return;
	pageLoaderGen += 1;
	pageLoaderOn = false;
	pauseLoader();
}

export function holdPageData() {
	const gen = pageLoaderGen;
	pageHolds.set(gen, (pageHolds.get(gen) || 0) + 1);
	let released = false;
	const release = () => {
		if (released) return;
		released = true;
		const left = (pageHolds.get(gen) || 1) - 1;
		if (left > 0) {
			pageHolds.set(gen, left);
			return;
		}
		pageHolds.delete(gen);
		const waiting = pageHoldWaiters.get(gen) || [];
		pageHoldWaiters.delete(gen);
		waiting.forEach((resolve) => resolve());
	};
	onUnmounted(release);
	return release;
}

function pageDataSettled(gen) {
	if (!pageHolds.get(gen)) return Promise.resolve();
	return new Promise((resolve) => {
		const waiting = pageHoldWaiters.get(gen) || [];
		waiting.push(resolve);
		pageHoldWaiters.set(gen, waiting);
	});
}

export async function settlePageLoader(work) {
	const gen = pageLoaderGen;
	try {
		if (work) await work();
		await nextTick();
		await pageDataSettled(gen);
	} finally {
		await nextTick();
		closePageLoader(gen);
	}
}

export function takeFullScreen() {
	const element = document.documentElement;

	if (element.requestFullscreen) {
		element.requestFullscreen();
	} else if (element.webkitRequestFullscreen) {
		element.webkitRequestFullscreen();
	} else if (element.msRequestFullscreen) {
		element.msRequestFullscreen();
	}
}

export function exitFullScreen() {
	if (document.fullscreenElement) {
		document.exitFullscreen();
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
