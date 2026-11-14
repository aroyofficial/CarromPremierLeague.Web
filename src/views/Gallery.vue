<template>
	<div class="page-container gallery-page">
		<header class="page-heading">
			<div>
				<span class="page-eyebrow">Seasons</span>
				<h1 class="page-title">Gallery</h1>
				<p class="page-subtitle">Photos and videos from every season of the Carrom Premier League.</p>
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
				<img
					v-if="tilePoster(cover)"
					:src="tilePoster(cover)"
					:alt="cover.alt_text || cover.caption || currentSeason?.name || 'Season cover'"
				/>
				<span v-else class="photo-missing">Video</span>
				<span v-if="isVideoItem(cover)" class="play-badge is-hero" aria-hidden="true"></span>
				<span v-if="cover.caption || cover.taken_on" class="cover-caption">
					<strong v-if="cover.caption">{{ cover.caption }}</strong>
					<span v-if="cover.taken_on">{{ spokenDate(cover.taken_on) }}</span>
				</span>
			</button>

			<div v-if="!seasons.length" class="gallery-status">
				<p>No season has published photos or videos yet.</p>
			</div>
			<div v-else-if="!items.length" class="gallery-status">
				<p>No published photos or videos in {{ currentSeason?.name || "this season" }} yet.</p>
			</div>

			<div v-else ref="frameEl" class="photo-grid">
				<div v-for="(row, rowIndex) in mediaRows" :key="rowIndex" class="photo-row">
				<button
					v-for="cell in row"
					:key="cell.photo.id"
					type="button"
					class="photo-tile"
					:style="{ width: `${cell.width}px`, height: `${cell.height}px` }"
					@click="openPhoto(cell.photo)"
				>
					<span
						v-if="cell.photo.placeholder_url && !broken.has(cell.photo.id)"
						class="photo-blur"
						:style="{ backgroundImage: `url(${cell.photo.placeholder_url})` }"
					></span>
					<FramedPicture
						v-if="!isVideoItem(cell.photo) && !broken.has(cell.photo.id)"
						:src="cell.photo.url"
						:alt="cell.photo.alt_text || cell.photo.caption || 'Season media'"
						@error="markBroken(cell.photo.id)"
					/>
					<img
						v-else-if="tilePoster(cell.photo) && !broken.has(cell.photo.id)"
						:src="tilePoster(cell.photo)"
						alt=""
						draggable="false"
						@error="markBroken(cell.photo.id)"
					/>
					<span v-else class="photo-missing">{{ isVideoItem(cell.photo) ? "Video" : "Image unavailable" }}</span>
					<span v-if="isVideoItem(cell.photo)" class="play-badge" aria-hidden="true"></span>
				</button>
				</div>
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
			<div v-if="viewer" class="viewer" role="dialog" aria-modal="true" :aria-label="viewer.caption || 'Gallery item'">
				<header class="viewer-bar">
					<p v-if="viewerIndex >= 0">{{ viewerIndex + 1 }} / {{ items.length }}</p>
					<div class="viewer-tags">
						<span v-for="name in viewerSeasons" :key="name">{{ name }}</span>
					</div>
					<button type="button" class="viewer-icon" aria-label="Close" @click="closeViewer">×</button>
				</header>
				<div ref="stageEl" class="viewer-stage" :class="{ 'is-zoomed': zoom > 1 }" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
					<button type="button" class="viewer-icon is-nav is-prev" aria-label="Previous" :disabled="!canStepBack" @click="step(-1)">‹</button>
					<div v-if="shown" class="viewer-fit" :style="{ width: `${shown.width}px`, height: `${shown.height}px` }">
						<iframe
							v-if="isVideoItem(viewer) && embedUrl(viewer.url)"
							:key="`embed-${viewer.id}`"
							:src="embedUrl(viewer.url, { autoplay: true })"
							:title="viewer.caption || 'Video'"
							allow="autoplay; fullscreen; picture-in-picture"
							allowfullscreen
						></iframe>
						<video
							v-else-if="isVideoItem(viewer)"
							:key="`video-${viewer.id}`"
							ref="videoEl"
							:src="viewer.url"
							:poster="tilePoster(viewer)"
							autoplay
							playsinline
							@play="playing = true"
							@pause="playing = false"
							@loadedmetadata="onVideoMeta"
							@timeupdate="onVideoTime"
						></video>
						<FramedPicture
							v-else-if="!broken.has(viewer.id)"
							:src="viewer.url"
							:alt="viewer.alt_text || viewer.caption || 'Season photo'"
							@error="markBroken(viewer.id)"
						/>
						<p v-else class="photo-missing">Image unavailable</p>
					</div>
					<button type="button" class="viewer-icon is-nav is-next" aria-label="Next" :disabled="!canStepForward" @click="step(1)">›</button>
				</div>
				<footer class="viewer-dock">
					<div class="viewer-tools">
						<button type="button" :disabled="zoom <= 1" @click="zoomBy(-0.25)">Zoom out</button>
						<button type="button" :disabled="zoom >= 4" @click="zoomBy(0.25)">Zoom in</button>
						<button type="button" @click="downloadMedia">Download</button>
					</div>
					<p v-if="viewer.caption || viewer.taken_on" class="viewer-caption">
						<strong v-if="viewer.caption">{{ viewer.caption }}</strong>
						<span v-if="viewer.taken_on">{{ spokenDate(viewer.taken_on) }}</span>
					</p>
					<div v-if="showFilePlayer" class="player-bar">
						<button type="button" @click="togglePlay">{{ playing ? "Pause" : "Play" }}</button>
						<input
							type="range"
							min="0"
							:max="duration || 0"
							step="0.1"
							:value="played"
							aria-label="Seek"
							@input="seek"
						/>
						<span>{{ clock(played) }} / {{ clock(duration) }}</span>
						<button type="button" @click="toggleMute">{{ muted ? "Unmute" : "Mute" }}</button>
						<button type="button" @click="toggleFull">Full screen</button>
					</div>
					<div v-if="items.length" ref="stripEl" class="filmstrip" aria-label="Items in this season">
						<button
							v-for="photo in items"
							:key="photo.id"
							type="button"
							class="film-item"
							:class="{ 'is-current': photo.id === viewer.id }"
							:aria-label="photo.caption || (isVideoItem(photo) ? 'Video' : 'Photo')"
							@click="openPhoto(photo)"
						>
							<FramedPicture v-if="!isVideoItem(photo)" :src="photo.url" alt="" />
							<img v-else-if="tilePoster(photo)" :src="tilePoster(photo)" alt="" />
							<span v-else>{{ isVideoItem(photo) ? "Video" : "Photo" }}</span>
						</button>
					</div>
				</footer>
			</div>
		</Teleport>
	</div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import FramedPicture from "@/components/FramedPicture.vue";
import GallerySkeleton from "@/components/GallerySkeleton.vue";
import { adminApi, apiErrorMessage } from "@/services/adminService";
import { embedUrl, isVideoItem, tilePoster } from "@/utils/galleryMedia";
import { spokenDate } from "@/utils/media";

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
const frameEl = ref(null);
const frameWidth = ref(0);
const videoEl = ref(null);
const stripEl = ref(null);
const stageEl = ref(null);
const stageBox = ref({ width: 0, height: 0 });
const zoom = ref(1);
const playing = ref(false);
const muted = ref(false);
const played = ref(0);
const duration = ref(0);
let observer;
let frameObserver;
let touchX = 0;

const ROW_GAP = 8;

const aspectOf = (photo) => {
	const width = Number(photo?.width) || 4;
	const height = Number(photo?.height) || 3;
	const ratio = width / Math.max(height, 1);
	return Math.min(Math.max(ratio, 0.75), 1.85);
};

const packRows = (photos, containerWidth) => {
	const width = Math.max(containerWidth || 0, 280);
	const target = width < 640 ? 148 : 220;
	const rows = [];
	let row = [];
	let ratioSum = 0;
	const flush = (last) => {
		if (!row.length) return;
		const gaps = ROW_GAP * Math.max(row.length - 1, 0);
		const fitted = (width - gaps) / ratioSum;
		const height = Math.min(fitted, last ? target : 380);
		rows.push(
			row.map((photo) => ({
				photo,
				width: Math.round(aspectOf(photo) * height),
				height: Math.round(height),
			})),
		);
		row = [];
		ratioSum = 0;
	};
	for (const photo of photos) {
		const ratio = aspectOf(photo);
		const nextSum = ratioSum + ratio;
		const height = (width - ROW_GAP * row.length) / nextSum;
		if (row.length && height < target * 0.78) flush(false);
		row.push(photo);
		ratioSum += ratio;
	}
	flush(true);
	return rows;
};

const currentSeason = computed(() => seasons.value.find((season) => season.id === seasonId.value));
const cover = computed(() => currentSeason.value?.cover || null);
const viewerIndex = computed(() =>
	viewer.value ? items.value.findIndex((photo) => photo.id === viewer.value.id) : -1,
);
const viewerSeasons = computed(() =>
	(viewer.value?.season_ids || [])
		.map((id) => seasons.value.find((season) => season.id === id)?.name)
		.filter(Boolean),
);
const mediaRows = computed(() => packRows(items.value, frameWidth.value || Math.min(window.innerWidth - 48, 1200)));
const canStepBack = computed(() => viewerIndex.value > 0);
const canStepForward = computed(() => viewerIndex.value >= 0 && viewerIndex.value < items.value.length - 1);
const showFilePlayer = computed(() => Boolean(viewer.value && isVideoItem(viewer.value) && !embedUrl(viewer.value.url)));
const fitted = computed(() => {
	const item = viewer.value;
	const box = stageBox.value;
	if (!item || box.width < 40 || box.height < 40) return null;
	const ratio = Math.max(0.05, (Number(item.width) || 16) / Math.max(1, Number(item.height) || 9));
	let width = box.width;
	let height = width / ratio;
	if (height > box.height) {
		height = box.height;
		width = height * ratio;
	}
	return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) };
});
const shown = computed(() => {
	if (!fitted.value) return null;
	return {
		width: Math.max(1, Math.round(fitted.value.width * zoom.value)),
		height: Math.max(1, Math.round(fitted.value.height * zoom.value)),
	};
});
const zoomBy = (delta) => {
	const next = Math.round((zoom.value + delta) * 100) / 100;
	zoom.value = Math.min(4, Math.max(1, next));
};
const downloadMedia = async () => {
	const item = viewer.value;
	const url = item?.url;
	if (!url) return;
	const base = String(item.caption || (isVideoItem(item) ? "video" : "photo"))
		.replace(/[^\w\- ]+/g, "")
		.trim()
		.slice(0, 80) || "media";
	const extension = url.split("?")[0].match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase() || (isVideoItem(item) ? "mp4" : "jpg");
	const name = `${base}.${extension}`;
	if (embedUrl(url)) {
		window.open(url, "_blank", "noopener");
		return;
	}
	try {
		const response = await fetch(url);
		if (!response.ok) throw new Error("download failed");
		const blob = await response.blob();
		const objectUrl = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = objectUrl;
		link.download = name;
		link.click();
		window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
	} catch {
		const link = document.createElement("a");
		link.href = url;
		link.target = "_blank";
		link.rel = "noopener";
		link.download = name;
		link.click();
	}
};

const clock = (seconds) => {
	if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
	const total = Math.floor(seconds);
	return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

const onVideoMeta = (event) => {
	duration.value = event.target.duration || 0;
	muted.value = event.target.muted;
};

const onVideoTime = (event) => {
	played.value = event.target.currentTime || 0;
	duration.value = event.target.duration || duration.value;
};

const togglePlay = () => {
	const video = videoEl.value;
	if (!video) return;
	if (video.paused) video.play();
	else video.pause();
};

const seek = (event) => {
	const video = videoEl.value;
	if (!video) return;
	video.currentTime = Number(event.target.value);
};

const toggleMute = () => {
	const video = videoEl.value;
	if (!video) return;
	video.muted = !video.muted;
	muted.value = video.muted;
};

const toggleFull = () => {
	const video = videoEl.value;
	if (!video) return;
	if (document.fullscreenElement) document.exitFullscreen();
	else video.requestFullscreen?.();
};

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
		seasons.value = (result.data || []).filter((season) => Number(season.photo_count) > 0);
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
	if (event.key === " " && showFilePlayer.value && event.target?.tagName !== "BUTTON" && event.target?.tagName !== "INPUT") {
		event.preventDefault();
		togglePlay();
	}
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

watch(stageEl, (element, _previous, onCleanup) => {
	if (!element) return;
	const observer = new ResizeObserver((entries) => {
		const rect = entries[0]?.contentRect;
		const width = Math.round(rect?.width || 0);
		const height = Math.round(rect?.height || 0);
		if (width !== stageBox.value.width || height !== stageBox.value.height) stageBox.value = { width, height };
	});
	observer.observe(element);
	onCleanup(() => observer.disconnect());
});

watch(frameEl, (element, _previous, onCleanup) => {
	frameObserver?.disconnect();
	if (!element) return;
	frameObserver = new ResizeObserver((entries) => {
		const next = Math.round(entries[0]?.contentRect?.width || 0);
		if (next > 0 && next !== frameWidth.value) frameWidth.value = next;
	});
	frameObserver.observe(element);
	onCleanup(() => frameObserver?.disconnect());
});

watch(
	() => viewer.value?.id,
	() => {
		zoom.value = 1;
		playing.value = false;
		played.value = 0;
		duration.value = 0;
		nextTick(() => {
			stripEl.value?.querySelector(".is-current")?.scrollIntoView({ inline: "center", block: "nearest" });
		});
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
	frameObserver?.disconnect();
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
	display: flex;
	flex-direction: column;
	gap: 2px;
	padding: 28px 20px 16px;
	color: #fff;
	text-align: left;
	overflow-wrap: anywhere;
	background: linear-gradient(transparent, rgba(11, 20, 38, 0.78));
}

.cover-caption strong {
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	font-weight: 700;
}

.cover-caption span {
	font-size: 13px;
	color: rgba(255, 255, 255, 0.82);
}

.photo-grid {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.photo-row {
	display: flex;
	gap: 8px;
	justify-content: flex-start;
}

.photo-tile {
	position: relative;
	display: block;
	flex: 0 0 auto;
	margin: 0;
	padding: 0;
	border: 0;
	border-radius: 8px;
	overflow: hidden;
	background: #e7edf6;
	cursor: pointer;
}

.photo-tile img,
.photo-tile :deep(.framed),
.photo-blur {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
}

.photo-tile img {
	object-fit: contain;
	transition: transform 0.35s ease;
}

.photo-tile:hover img,
.cover-hero:hover img {
	transform: scale(1.04);
}

.play-badge {
	position: absolute;
	left: 50%;
	top: 50%;
	z-index: 1;
	width: 52px;
	height: 52px;
	border-radius: 50%;
	transform: translate(-50%, -50%);
	background: rgba(11, 20, 38, 0.72);
	box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);
}

.play-badge.is-hero {
	width: 74px;
	height: 74px;
}

.play-badge::after {
	content: "";
	position: absolute;
	left: 20px;
	top: 16px;
	border-style: solid;
	border-width: 10px 0 10px 16px;
	border-color: transparent transparent transparent #fff;
}

.play-badge.is-hero::after {
	left: 29px;
	top: 23px;
	border-width: 14px 0 14px 20px;
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

.photo-tile .photo-missing,
.cover-hero .photo-missing {
	position: absolute;
	inset: 0;
	min-height: 0;
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
	display: flex;
	flex-direction: column;
	background: #070c18;
	color: #fff;
}

.viewer-bar,
.viewer-dock {
	flex: 0 0 auto;
}

.viewer-bar {
	display: flex;
	align-items: center;
	gap: 12px;
	min-height: 56px;
	padding: 8px 16px;
}

.viewer-bar p,
.viewer-caption {
	margin: 0;
}

.viewer-bar p {
	font-variant-numeric: tabular-nums;
	letter-spacing: 0.08em;
}

.viewer-tags {
	display: flex;
	flex: 1;
	gap: 6px;
	overflow-x: auto;
}

.viewer-tags span {
	padding: 4px 10px;
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.12);
	color: var(--cpl-gold-400);
	font-size: 12px;
	white-space: nowrap;
}

.viewer-stage {
	position: relative;
	flex: 1 1 auto;
	min-height: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0 72px;
	overflow: auto;
}

.viewer-stage.is-zoomed {
	align-items: flex-start;
	justify-content: flex-start;
}

.viewer-fit {
	position: relative;
	flex: 0 0 auto;
	overflow: hidden;
	background: transparent;
}

.viewer-fit iframe,
.viewer-fit video,
.viewer-fit :deep(.framed) {
	width: 100%;
	height: 100%;
	border: 0;
	object-fit: contain;
	background: transparent;
}

.viewer-icon.is-nav {
	position: absolute;
	top: 50%;
	z-index: 2;
	transform: translateY(-50%);
}

.viewer-icon.is-prev {
	left: 14px;
}

.viewer-icon.is-next {
	right: 14px;
}

.viewer-icon {
	width: 44px;
	height: 44px;
	border: 0;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.12);
	color: #fff;
	font-size: 28px;
	line-height: 1;
	cursor: pointer;
}

.viewer-icon:disabled {
	opacity: 0.28;
	cursor: default;
}

.viewer-dock {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	padding: 8px 16px 14px;
}

.viewer-tools {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 8px;
}

.viewer-tools button {
	border: 0;
	border-radius: 999px;
	background: #fff;
	color: #0b1426;
	font: inherit;
	font-size: 13px;
	font-weight: 700;
	padding: 6px 12px;
	cursor: pointer;
}

.viewer-tools button:disabled {
	opacity: 0.4;
	cursor: default;
}

.viewer-caption {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4px;
	width: min(720px, 100%);
	max-height: 6.5em;
	overflow: auto;
	text-align: center;
	overflow-wrap: anywhere;
}

.viewer-caption strong {
	font-weight: 700;
}

.viewer-caption span {
	color: rgba(255, 255, 255, 0.78);
	font-size: 13px;
}

.player-bar {
	display: flex;
	align-items: center;
	gap: 8px;
	width: min(720px, 100%);
	padding: 8px 10px;
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.08);
}

.player-bar button {
	border: 0;
	border-radius: 999px;
	background: #fff;
	color: #0b1426;
	font: inherit;
	font-size: 13px;
	font-weight: 700;
	padding: 6px 12px;
	cursor: pointer;
}

.player-bar input[type="range"] {
	flex: 1;
	min-width: 0;
	accent-color: var(--cpl-gold-400);
}

.player-bar span {
	font-variant-numeric: tabular-nums;
	font-size: 12px;
	white-space: nowrap;
}

.filmstrip {
	display: flex;
	justify-content: safe center;
	gap: 8px;
	width: min(920px, 100%);
	overflow-x: auto;
	padding: 2px;
}

.film-item {
	position: relative;
	flex: 0 0 auto;
	width: 72px;
	height: 52px;
	padding: 0;
	border: 2px solid transparent;
	border-radius: 8px;
	overflow: hidden;
	background: #1b2740;
	color: #fff;
	cursor: pointer;
}

.film-item img,
.film-item :deep(.framed),
.film-item span {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: grid;
	place-items: center;
	font-size: 11px;
}

.film-item :deep(.framed) {
	position: absolute;
	inset: 0;
}

.film-item.is-current {
	border-color: var(--cpl-gold-400);
}

@media (max-width: 720px) {
	.viewer-stage {
		padding: 0 52px;
	}

	.player-bar {
		flex-wrap: wrap;
		border-radius: 16px;
		justify-content: center;
	}

	.player-bar input[type="range"] {
		flex-basis: 100%;
	}
}

@media (prefers-reduced-motion: reduce) {
	.photo-tile img,
	.cover-hero img {
		transition: none;
	}

	.photo-tile:hover img,
	.cover-hero:hover img {
		transform: none;
	}
}
</style>
