// Shared decisions for URL query values. A value is usable only when it is a
// positive whole number (or, for a redirect, an in-app path) that names a
// resource the page actually loaded, and that belongs with the other values.

export function positiveId(value) {
	if (typeof value === "number") {
		return Number.isSafeInteger(value) && value > 0 ? value : null;
	}
	if (typeof value !== "string") return null;
	const text = value.trim();
	if (!/^[1-9]\d*$/.test(text)) return null;
	const number = Number(text);
	return Number.isSafeInteger(number) ? number : null;
}

export function matchingId(value, ids) {
	const id = positiveId(value);
	if (id == null || !ids.includes(id)) return null;
	return id;
}

/**
 * Which season and photo a gallery URL may show.
 * photoSeasonIds is null when the photo does not exist.
 * An explicit season that is not in seasonIds is ignored.
 * A photo is shown only when it is published in the season that will be displayed.
 * With no usable season, a real photo selects the first season it belongs to.
 */
export function galleryChoice(season, photo, seasonIds, photoSeasonIds) {
	const explicit = matchingId(season, seasonIds);
	const photoId = positiveId(photo);
	const tagged = Array.isArray(photoSeasonIds)
		? photoSeasonIds.map((id) => Number(id)).filter((id) => seasonIds.includes(id))
		: [];
	const photoKnown = photoId != null && tagged.length > 0;
	if (explicit != null) {
		return { seasonId: explicit, photoId: photoKnown && tagged.includes(explicit) ? photoId : null };
	}
	if (photoKnown) return { seasonId: tagged[0], photoId };
	return { seasonId: seasonIds[0] ?? null, photoId: null };
}

/** Return a new query when a correction changes it, otherwise null. A null correction deletes the key. */
export function correctedQuery(current, corrections) {
	const next = { ...current };
	let changed = false;
	for (const [key, value] of Object.entries(corrections)) {
		if (value == null) {
			if (Object.prototype.hasOwnProperty.call(next, key)) {
				delete next[key];
				changed = true;
			}
		} else if (String(next[key] ?? "") !== String(value)) {
			next[key] = String(value);
			changed = true;
		}
	}
	return changed ? next : null;
}

/**
 * A post-login path. Rejects other sites, the login page itself, unknown routes,
 * and anything that is not a single in-app path. isKnownPath receives the pathname.
 */
export function appRedirect(target, isKnownPath) {
	if (typeof target !== "string") return null;
	const trimmed = target.trim();
	if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
	if (trimmed.includes("\\") || trimmed.includes("://") || /[\u0000-\u001f\u007f]/.test(trimmed)) return null;
	let url;
	try {
		url = new URL(trimmed, "https://cpl.local");
	} catch {
		return null;
	}
	if (url.origin !== "https://cpl.local") return null;
	let path;
	try {
		path = decodeURIComponent(url.pathname);
	} catch {
		return null;
	}
	if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || path.includes("://")) return null;
	if (path === "/login" || path.startsWith("/login/")) return null;
	if (path === "/not-found" || path.startsWith("/not-found/")) return null;
	if (!isKnownPath(path)) return null;
	return `${path}${url.search}${url.hash}`;
}
