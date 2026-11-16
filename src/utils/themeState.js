export const THEME_KEY = "cpl_theme";
export const THEMES = ["light", "dark"];

export const THEME_COLORS = { light: "#f6f8fc", dark: "#0b1220" };

export function savedTheme(value) {
	return THEMES.includes(value) ? value : null;
}

export function resolveTheme(saved, systemPrefersDark) {
	return savedTheme(saved) || (systemPrefersDark ? "dark" : "light");
}

export function nextTheme(current) {
	return current === "dark" ? "light" : "dark";
}
