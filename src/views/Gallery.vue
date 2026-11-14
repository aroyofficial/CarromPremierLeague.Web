<template>
	<div class="page-container gallery-page">
		<header class="page-heading">
			<div>
				<span class="page-eyebrow">Seasons</span>
				<h1 class="page-title">Gallery</h1>
				<p class="page-subtitle">Photos from each season of the Carrom Premier League.</p>
			</div>
		</header>

		<GallerySkeleton v-if="loading" />

		<div v-else-if="error && !items.length" class="gallery-status">
			<p>{{ error }}</p>
			<el-button type="primary" @click="loadSeasons">Try again</el-button>
		</div>

		<template v-else>
			<div v-if="seasons.length" class="season-chips" role="tablist" aria-label="Seasons">
				<button
					v-for="season in seasons"
					:key="season.id"
					type="button"
					class="season-chip"
					role="tab"
					:aria-selected="season.id === seasonId"
					:class="{ 'is-selected': season.id === seasonId }"
					@click="chooseSeason(season.id)"
				>
					{{ season.name }}
					<span>{{ season.photo_count }}</span>
				</button>
			</div>

			<button
				v-if="cover"
				type="button"
				class="cover-hero"
				:style="{ aspectRatio: `${cover.width} / ${cover.height}` }"
				@click="openPhoto(cover)"
			>
				<img :src="cover.url" :alt="cover.alt_text || cover.caption || currentSeason?.name || 'Season cover'" />
				<span v-if="cover.caption" class="cover-caption">{{ cover.caption }}</span>
			</button>

			<div v-if="!seasons.length" class="gallery-status">
				<p>No season gallery is public yet.</p>
			</div>
			<div v-else-if="!items.length" class="gallery-status">
				<p>No published photos in {{ currentSeason?.name || "this season" }} yet.</p>
			</div>

			<div v-else class="photo-grid">
				<button
					v-for="photo in items"
					:key="photo.id"
					type="button"
					class="photo-tile"
					:style="{ aspectRatio: `${photo.width} / ${photo.height}` }"
					@click="openPhoto(photo)"
				>
					<span
						v-if="photo.placeholder_url && !broken.has(photo.id)"
						class="photo-blur"
						:style="{ backgroundImage: `url(${photo.placeholder_url})` }"
					></span>
					<img
						v-if="!broken.has(photo.id)"
						:src="photo.thumbnail_url"
						:alt="photo.alt_text || photo.caption || 'Season photo'"
						@error="markBroken(photo.id)"
					/>
					<span v-else class="photo-missing">Image unavailable</span>
				</button>
			</div>

			<GallerySkeleton v-if="loadingMore" compact />
			<div v-if="error && items.length" class="gallery-status">
				<p>{{ error }}</p>
				<el-button @click="loadPage(false)">Try again</el-button>
			</div>
			<div v-if="cursor" class="gallery-more">
				<el-button :loading="loadingMore" @click="loadPage(false)">Load more</el-button>
			</div>
			<div ref="sentinel" class="gallery-sentinel" aria-hidden="true"></div>
		</template>

		<Teleport to="body">
			<div v-if="viewer" class="viewer" role="dialog" aria-modal="true" :aria-label="viewer.caption || 'Photo'">
				<button type="button" class="viewer-close" aria-label="Close" @click="closeViewer">×</button>
				<button type="button" class="viewer-arrow is-prev" aria-label="Previous photo" @click="step(-1)">‹</button>
				<figure class="viewer-figure" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
					<img
						v-if="!broken.has(viewer.id)"
						:src="viewer.url"
						:alt="viewer.alt_text || viewer.caption || 'Season photo'"
						@error="markBroken(viewer.id)"
					/>
					<p v-else class="photo-missing">Image unavailable</p>
					<figcaption v-if="viewer.caption || viewer.taken_on">
						<strong v-if="viewer.caption">{{ viewer.caption }}</strong>
						<span v-if="viewer.taken_on">{{ viewer.taken_on }}</span>
					</figcaption>
				</figure>
				<button type="button" class="viewer-arrow is-next" aria-label="Next photo" @click="step(1)">›</button>
			</div>
		</Teleport>
	</div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import GallerySkeleton from "@/components/GallerySkeleton.vue";
import { adminApi, apiErrorMessage } from "@/services/adminService";

const route = useRoute();
const router = useRouter();
const seasons = ref([]);
const seasonId = ref(null);
const items = ref([]);
const cursor = ref(null);
const loading = ref(true);
const loadingMore = ref(false);
const error = ref("");
const broken = ref(new Set());
const viewer = ref(null);
const sentinel = ref(null);
let observer;
let touchX = 0;

const currentSeason = computed(() => seasons.value.find((season) => season.id === seasonId.value));
const cover = computed(() => currentSeason.value?.cover || null);

const markBroken = (id) => {
	broken.value = new Set(broken.value).add(id);
};

const loadPage = async (reset) => {
	if (!seasonId.value) {
		loading.value = false;
		return;
	}
	if (!reset && (!cursor.value || loadingMore.value)) return;
	if (reset) {
		loading.value = true;
		items.value = [];
		cursor.value = null;
	} else {
		loadingMore.value = true;
	}
	try {
		const result = await adminApi.gallery.list({
			season_id: seasonId.value,
			cursor: reset ? undefined : cursor.value,
			limit: 24,
		});
		const page = result.data || { items: [], next_cursor: null };
		items.value = reset ? page.items : items.value.concat(page.items);
		cursor.value = page.next_cursor;
		error.value = "";
	} catch (err) {
		error.value = apiErrorMessage(err, "The gallery could not be loaded.");
	} finally {
		loading.value = false;
		loadingMore.value = false;
	}
};

const loadSeasons = async () => {
	loading.value = true;
	error.value = "";
	try {
		const result = await adminApi.gallery.seasons();
		seasons.value = result.data || [];
		const requested = Number(route.query.season);
		const match = seasons.value.find((season) => season.id === requested) || seasons.value[0];
		seasonId.value = match ? match.id : null;
		if (seasonId.value) await loadPage(true);
		else loading.value = false;
		await openFromQuery();
	} catch (err) {
		error.value = apiErrorMessage(err, "The gallery could not be loaded.");
		loading.value = false;
	}
};

const chooseSeason = async (id) => {
	if (id === seasonId.value) return;
	seasonId.value = id;
	const query = { ...route.query, season: String(id) };
	delete query.photo;
	viewer.value = null;
	await router.replace({ query });
	await loadPage(true);
};

const openPhoto = (photo) => {
	viewer.value = photo;
	router.push({ query: { ...route.query, season: String(seasonId.value || ""), photo: String(photo.id) } });
};

const closeViewer = () => {
	viewer.value = null;
	const query = { ...route.query };
	delete query.photo;
	router.push({ query });
};

const openFromQuery = async () => {
	const photoId = route.query.photo;
	if (!photoId) {
		viewer.value = null;
		return;
	}
	const found = items.value.find((photo) => String(photo.id) === String(photoId));
	if (found) {
		viewer.value = found;
		return;
	}
	try {
		const result = await adminApi.gallery.photo(photoId);
		const photo = result.data;
		viewer.value = photo;
		const season = photo?.season_ids?.find((id) => seasons.value.some((item) => item.id === id));
		if (season && season !== seasonId.value) {
			seasonId.value = season;
			await loadPage(true);
		}
	} catch {
		viewer.value = null;
	}
};

const step = (direction) => {
	if (!viewer.value) return;
	const index = items.value.findIndex((photo) => photo.id === viewer.value.id);
	const next = items.value[index + direction];
	if (next) openPhoto(next);
};

const onKey = (event) => {
	if (!viewer.value) return;
	if (event.key === "Escape") closeViewer();
	if (event.key === "ArrowRight") step(1);
	if (event.key === "ArrowLeft") step(-1);
};

const onTouchStart = (event) => {
	touchX = event.changedTouches[0]?.clientX || 0;
};

const onTouchEnd = (event) => {
	const next = event.changedTouches[0]?.clientX || 0;
	if (next - touchX > 50) step(-1);
	if (touchX - next > 50) step(1);
};

watch(
	() => route.query.photo,
	() => {
		if (!loading.value) openFromQuery();
	},
);

onMounted(async () => {
	window.addEventListener("keydown", onKey);
	observer = new IntersectionObserver(
		(entries) => {
			if (entries.some((entry) => entry.isIntersecting)) loadPage(false);
		},
		{ rootMargin: "480px" },
	);
	await loadSeasons();
	if (sentinel.value) observer.observe(sentinel.value);
});

watch(sentinel, (element) => {
	if (!observer) return;
	observer.disconnect();
	if (element) observer.observe(element);
});

onBeforeUnmount(() => {
	window.removeEventListener("keydown", onKey);
	observer?.disconnect();
});
</script>

<style scoped>
.gallery-page {
	display: flex;
	flex-direction: column;
	gap: 18px;
	padding-bottom: 64px;
}

.season-chips {
	display: flex;
	gap: 8px;
	overflow-x: auto;
	padding-bottom: 4px;
}

.season-chip {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	border: 1px solid var(--cpl-line);
	background: #fff;
	color: var(--cpl-ink-900);
	border-radius: 999px;
	padding: 8px 14px;
	font: inherit;
	cursor: pointer;
	white-space: nowrap;
}

.season-chip span {
	color: var(--cpl-ink-400);
	font-size: 12px;
}

.season-chip.is-selected {
	background: var(--cpl-navy-900);
	color: #fff;
	border-color: var(--cpl-navy-900);
}

.season-chip.is-selected span {
	color: var(--cpl-gold-400);
}

.cover-hero {
	position: relative;
	display: block;
	width: 100%;
	padding: 0;
	border: 0;
	border-radius: 18px;
	overflow: hidden;
	cursor: pointer;
	background: var(--cpl-navy-900);
	max-height: 68vh;
}

.cover-hero img {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
}

.cover-caption {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	padding: 28px 20px 16px;
	color: #fff;
	text-align: left;
	background: linear-gradient(transparent, rgba(11, 20, 38, 0.78));
}

.photo-grid {
	columns: 4 180px;
	column-gap: 12px;
}

.photo-tile {
	position: relative;
	display: block;
	width: 100%;
	margin: 0 0 12px;
	padding: 0;
	border: 0;
	border-radius: 14px;
	overflow: hidden;
	background: #e7edf6;
	cursor: pointer;
	break-inside: avoid;
}

.photo-tile img,
.photo-blur {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
}

.photo-tile img {
	object-fit: cover;
}

.photo-blur {
	background-size: cover;
	background-position: center;
	filter: blur(12px);
	transform: scale(1.08);
}

.photo-missing {
	display: grid;
	place-items: center;
	min-height: 140px;
	height: 100%;
	padding: 16px;
	color: var(--cpl-ink-600);
	background: #eef2f7;
}

.gallery-status,
.gallery-more {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 12px;
	padding: 28px 0;
	color: var(--cpl-ink-600);
}

.gallery-sentinel {
	height: 1px;
}

.viewer {
	position: fixed;
	inset: 0;
	z-index: 4000;
	display: grid;
	grid-template-columns: auto 1fr auto;
	align-items: center;
	gap: 8px;
	padding: 24px;
	background: rgba(11, 20, 38, 0.92);
}

.viewer-figure {
	margin: 0;
	min-width: 0;
	text-align: center;
}

.viewer-figure img {
	max-width: 100%;
	max-height: calc(100vh - 140px);
	object-fit: contain;
}

.viewer-figure figcaption {
	display: flex;
	justify-content: center;
	gap: 12px;
	margin-top: 12px;
	color: #fff;
}

.viewer-close,
.viewer-arrow {
	border: 0;
	background: transparent;
	color: #fff;
	font-size: 40px;
	line-height: 1;
	cursor: pointer;
}

@media (max-width: 720px) {
	.viewer {
		grid-template-columns: 1fr;
		padding: 56px 12px 16px;
	}

	.viewer-arrow {
		position: absolute;
		top: 50%;
	}

	.viewer-arrow.is-prev {
		left: 4px;
	}

	.viewer-arrow.is-next {
		right: 4px;
	}
}
</style>
