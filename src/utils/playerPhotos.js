const photoModules = import.meta.glob("../../public/assets/images/players/*.png", {
	eager: true,
	import: "default",
});

const photosBySlug = Object.fromEntries(
	Object.entries(photoModules).map(([filePath, url]) => {
		const slug = filePath.split("/").pop().replace(/\.png$/i, "");
		return [slug, url];
	}),
);

export const playerPhotoSlug = (player) =>
	`${player?.first_name || ""}-${player?.last_name || ""}`.toLowerCase().trim().replace(/\s+/g, "-");

export const localPlayerPhoto = (player) => photosBySlug[playerPhotoSlug(player)] || "";
