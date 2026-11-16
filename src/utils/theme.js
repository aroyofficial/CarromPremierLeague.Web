import { ref } from "vue";
import { THEME_COLORS, THEME_KEY, nextTheme, resolveTheme, savedTheme } from "./themeState.js";

const media = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

const readSaved = () => {
	try {
		return savedTheme(localStorage.getItem(THEME_KEY));
	} catch {
		return null;
	}
};

export const theme = ref(resolveTheme(readSaved(), media?.matches));

function apply(value) {
	const root = document.documentElement;
	root.classList.toggle("dark", value === "dark");
	root.setAttribute("data-bs-theme", value);
	root.style.colorScheme = value;
	root.style.backgroundColor = "";
	let meta = document.querySelector('meta[name="theme-color"]');
	if (!meta) {
		meta = document.createElement("meta");
		meta.name = "theme-color";
		document.head.appendChild(meta);
	}
	meta.content = THEME_COLORS[value];
	theme.value = value;
}

export function setTheme(value) {
	try {
		localStorage.setItem(THEME_KEY, value);
	} catch {
		// Private mode can refuse storage; the choice still applies to this page.
	}
	apply(value);
}

export function toggleTheme() {
	setTheme(nextTheme(theme.value));
}

export function initTheme() {
	apply(theme.value);
	media?.addEventListener?.("change", (event) => {
		if (!readSaved()) apply(event.matches ? "dark" : "light");
	});
	window.addEventListener("storage", (event) => {
		if (event.key === THEME_KEY) apply(resolveTheme(event.newValue, media?.matches));
	});
}
