import { ElLoading } from "element-plus";
import { BackgroundMusic } from "./constants";

let loaderInstance = null;

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
