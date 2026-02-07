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
