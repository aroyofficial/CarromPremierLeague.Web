<template>
	<div class="admin-gallery">
		<header class="admin-page-head">
			<div>
				<span class="page-eyebrow">Media</span>
				<h1>Gallery</h1>
				<p>Photos and videos stay drafts until they are published.</p>
			</div>
		</header>

		<section
			v-if="canCreate"
			class="drop-zone"
			:class="{ 'is-over': dragOver }"
			@dragover.prevent="dragOver = true"
			@dragleave="dragOver = false"
			@drop.prevent="onDropFiles"
		>
			<input ref="fileInput" type="file" multiple :accept="MEDIA_ACCEPT" hidden @change="onPickFiles" />
			<div class="drop-copy">
				<span class="drop-mark" aria-hidden="true"></span>
				<strong>Drop photos or videos</strong>
				<p>JPEG, PNG, WebP up to 5 MB. MP4, WebM or MOV up to 50 MB. Three at a time.</p>
			</div>
			<el-button type="primary" :disabled="!seasonId" @click="fileInput?.click()">Choose files</el-button>
		</section>
		<p v-if="canCreate && !seasonId" class="hint">Choose a season before uploading.</p>

		<ul v-if="jobs.length" class="upload-queue">
			<li v-for="job in jobs" :key="job.id">
				<span class="job-name">{{ job.name }}</span>
				<el-progress v-if="job.status === 'uploading'" :percentage="job.progress" :stroke-width="8" />
				<span v-else-if="job.status === 'done'" class="job-ok">Saved as a draft</span>
				<span v-else-if="job.status === 'waiting'" class="hint">Waiting</span>
				<span v-else class="job-error">{{ job.error }}</span>
				<el-button v-if="job.status === 'error'" link type="primary" @click="retryJob(job)">Retry</el-button>
				<el-button v-if="job.status === 'error' || job.status === 'done'" link @click="dismissJob(job)">Dismiss</el-button>
			</li>
		</ul>

		<section v-if="canCreate" class="link-box">
			<label for="gallery-links">Public photo or video links, one per line</label>
			<p class="hint">YouTube, Vimeo, or a direct image or video address.</p>
			<el-input id="gallery-links" v-model="linkText" type="textarea" :rows="4" placeholder="https://…" />
			<ul v-if="linkDrafts.length" class="link-preview">
				<li v-for="link in linkDrafts" :key="link.url" :class="{ 'is-bad': link.error }">
					<img v-if="link.preview" :src="link.preview" alt="" />
					<span>{{ link.error || (isVideoUrl(link.url) ? "Video" : `${link.width} × ${link.height}`) }}</span>
				</li>
			</ul>
			<el-button :disabled="!readyLinks.length || !seasonId" @click="saveLinks">Save {{ readyLinks.length }} link(s)</el-button>
		</section>

		<div class="gallery-toolbar">
			<el-select v-model="seasonId" placeholder="Season" clearable @change="reload">
				<el-option v-for="season in seasons" :key="season.id" :label="season.name" :value="season.id" />
			</el-select>
			<el-select v-model="status" @change="reload">
				<el-option label="All" value="all" />
				<el-option label="Drafts" value="draft" />
				<el-option label="Published" value="published" />
			</el-select>
			<el-input v-model="search" placeholder="Search captions" clearable />
			<el-button v-if="canUpdate" :disabled="!canReorder" @click="toggleSelecting">
				{{ selecting ? "Done" : "Select" }}
			</el-button>
			<el-button v-if="canUpdate && photos.length > 1" :disabled="!canReorder" :type="ordering ? 'primary' : 'default'" @click="toggleOrdering">
				{{ ordering ? "Done" : "Reorder" }}
			</el-button>
		</div>

		<div v-if="selecting && selected.length" class="bulk-bar">
			<span>{{ selected.length }} selected</span>
			<el-button v-if="canPublish" :disabled="selected.length > 100" @click="runBulk('publish')">Publish</el-button>
			<el-button v-if="canPublish" :disabled="selected.length > 100" @click="runBulk('hide')">Hide</el-button>
			<el-select v-if="canUpdate" v-model="bulkSeasonId" placeholder="Add to season" style="width: 180px">
				<el-option v-for="season in seasons" :key="season.id" :label="season.name" :value="season.id" />
			</el-select>
			<el-button v-if="canUpdate" :disabled="!bulkSeasonId || selected.length > 100" @click="runBulk('add_seasons')">Add</el-button>
			<el-button v-if="canDelete" type="danger" plain :disabled="selected.length > 100" @click="runBulk('delete')">Delete</el-button>
		</div>

		<p v-if="pageError" class="job-error">
			{{ pageError }}
			<el-button link type="primary" @click="reload">Try again</el-button>
		</p>
		<GallerySkeleton v-if="loading" compact />
		<div v-else-if="!photos.length" class="gallery-status">No photos match this filter.</div>
		<template v-else>
		<p v-if="ordering" class="hint">Drag a card onto another to change the order.</p>
		<div class="admin-grid">
			<article
				v-for="photo in photos"
				:key="photo.id"
				class="gallery-card"
				:class="{ 'is-selected': selected.includes(photo.id), 'is-drop': dropId === photo.id, 'is-ordering': ordering, 'is-dragging': dragId === photo.id }"
				:draggable="ordering"
				@dragstart="onDragStart(photo.id, $event)"
				@dragend="dragId = null; dropId = null"
				@dragover.prevent="onDragOver(photo.id)"
				@drop.prevent="moveBefore(photo.id)"
			>
				<div
					class="gallery-thumb"
					:style="thumbStyle(photo)"
					role="button"
					:tabindex="ordering ? -1 : 0"
					@click="openEditor(photo)"
					@keydown.enter.prevent="openEditor(photo)"
				>
					<FramedPicture
						v-if="!isVideoItem(photo) && !broken.has(photo.id)"
						:src="photo.url"
						:alt="photo.alt_text || photo.caption || ''"
						@error="markBroken(photo.id)"
					/>
					<img v-else-if="tilePoster(photo) && !broken.has(photo.id)" :src="tilePoster(photo)" :alt="photo.alt_text || photo.caption || ''" draggable="false" @error="markBroken(photo.id)" />
					<span v-else class="thumb-fallback">{{ isVideoItem(photo) ? "Video" : "Unavailable" }}</span>
					<span v-if="isVideoItem(photo)" class="play-badge" aria-hidden="true"></span>
					<span class="status-pill" :class="{ 'is-live': photo.is_published }">{{ photo.is_published ? "Published" : "Draft" }}</span>
				</div>
				<div class="card-meta">
					<label v-if="selecting">
						<input type="checkbox" :checked="selected.includes(photo.id)" @change="toggleSelected(photo.id)" />
						Select
					</label>
					<strong class="card-caption" :title="photo.caption || ''">{{ photo.caption || (isVideoItem(photo) ? "Untitled video" : "Untitled") }}</strong>
					<span class="hint">{{ isVideoItem(photo) ? "Video" : "Photo" }}<template v-if="photo.is_cover"> · Cover</template></span>
					<span v-if="photo.taken_on" class="hint">{{ spokenDate(photo.taken_on) }}</span>
				</div>
			</article>
		</div>
		</template>
		<GallerySkeleton v-if="loadingMore" compact />
		<div v-if="cursor && !canReorder" class="gallery-more">
			<el-button :loading="loadingMore" @click="load(false)">Load more</el-button>
		</div>

		<el-drawer v-model="editorOpen" title="Edit item" size="440px" destroy-on-close :close-on-click-modal="!saving" @closed="resetEditor">
			<div v-if="draft" :key="editorKey" class="drawer-body">
				<div class="drawer-stage">
					<iframe
						v-if="isVideoItem(draft) && embedUrl(draft.url)"
						:src="embedUrl(draft.url)"
						title="Video preview"
						allow="autoplay; fullscreen; picture-in-picture"
						allowfullscreen
					></iframe>
					<video v-else-if="isVideoItem(draft)" :src="draft.url" :poster="tilePoster(draft)" controls playsinline></video>
					<FramedPicture v-else :src="draft.url" alt="" />
				</div>
				<el-form label-position="top">
					<el-form-item label="Caption">
						<el-input v-model="draft.caption" maxlength="500" :disabled="!canUpdate" />
					</el-form-item>
					<el-form-item label="Alt text">
						<el-input v-model="draft.alt_text" maxlength="300" :disabled="!canUpdate" />
					</el-form-item>
					<el-form-item label="Taken on">
						<el-date-picker v-model="draft.taken_on" type="date" value-format="YYYY-MM-DD" :disabled="!canUpdate" />
					</el-form-item>
					<el-form-item label="Seasons">
						<el-select v-model="draft.season_ids" multiple :disabled="!canUpdate" style="width: 100%">
							<el-option v-for="season in seasons" :key="season.id" :label="season.name" :value="season.id" />
						</el-select>
					</el-form-item>
					<el-form-item v-if="canPublish" label="Published">
						<el-switch v-model="draft.is_published" />
					</el-form-item>
				</el-form>
				<div class="drawer-actions">
					<el-button type="primary" :loading="saving" :disabled="!canUpdate" @click="saveDraft">Save</el-button>
					<el-button v-if="canUpdate && seasonId" @click="makeCover">Set as cover</el-button>
					<el-button v-if="canDelete" type="danger" plain @click="removeOne">Delete</el-button>
				</div>
				<p v-if="draftError" class="job-error">{{ draftError }}</p>
			</div>
		</el-drawer>
		<GalleryFramePicker
			:model-value="Boolean(cropRequest)"
			:src="cropRequest?.src || ''"
			:source-file="cropRequest?.file || null"
			@confirm="onCropConfirm"
			@cancel="onCropCancel"
		/>
	</div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { ElMessageBox } from "element-plus";
import FramedPicture from "@/components/FramedPicture.vue";
import GalleryFramePicker from "@/components/admin/GalleryFramePicker.vue";
import GallerySkeleton from "@/components/GallerySkeleton.vue";
import { adminApi, apiErrorMessage } from "@/services/adminService";
import { useAuthStore } from "@/store/authStore";
import { embedUrl, isVideoItem, isVideoUrl, tilePoster, videoPoster } from "@/utils/galleryMedia";
import { IMAGE_ACCEPT, VIDEO_ACCEPT, mediaFileProblem, publicImageLinkProblem, spokenDate } from "@/utils/media";
import { useUploadLeaveGuard } from "@/utils/uploadGuard";

const MEDIA_ACCEPT = `${IMAGE_ACCEPT},${VIDEO_ACCEPT}`;
const authStore = useAuthStore();
const canCreate = computed(() => authStore.canAny(["gallery.create"]));
const canUpdate = computed(() => authStore.canAny(["gallery.update"]));
const canPublish = computed(() => authStore.canAny(["gallery.publish"]));
const canDelete = computed(() => authStore.canAny(["gallery.delete"]));

const seasons = ref([]);
const seasonId = ref(null);
const status = ref("all");
const search = ref("");
const photos = ref([]);
const cursor = ref(null);
const loading = ref(true);
const loadingMore = ref(false);
const pageError = ref("");
const broken = ref(new Set());
const selecting = ref(false);
const selected = ref([]);
const bulkSeasonId = ref(null);
const jobs = ref([]);
const dragOver = ref(false);
const ordering = ref(false);
const dragId = ref(null);
const dropId = ref(null);
const cropRequest = ref(null);
const fileInput = ref(null);
const linkText = ref("");
const linkDrafts = ref([]);
const editorOpen = ref(false);
const editorKey = ref(0);
const draft = ref(null);
const draftError = ref("");
const saving = ref(false);
let jobSeq = 0;
let running = 0;
let linkTimer;
let searchTimer;

const uploading = computed(() => jobs.value.some((job) => job.status === "uploading" || job.status === "waiting"));
useUploadLeaveGuard(uploading);
const canReorder = computed(
	() => Boolean(seasonId.value) && status.value === "all" && !search.value.trim() && canUpdate.value && !cursor.value,
);
watch(canReorder, (allowed) => {
	if (!allowed) ordering.value = false;
});
const thumbStyle = (photo) => {
	const width = Number(photo?.width) || 16;
	const height = Number(photo?.height) || 9;
	const ratio = Math.min(Math.max(width / Math.max(height, 1), 0.75), 1.85);
	return { aspectRatio: String(ratio) };
};
const toggleSelecting = () => {
	ordering.value = false;
	selecting.value = !selecting.value;
};
const toggleOrdering = () => {
	selecting.value = false;
	selected.value = [];
	ordering.value = !ordering.value;
};
const readyLinks = computed(() => linkDrafts.value.filter((link) => !link.error && link.width));

const markBroken = (id) => {
	broken.value = new Set(broken.value).add(id);
};

const load = async (reset) => {
	if (reset) {
		loading.value = true;
		photos.value = [];
		cursor.value = null;
		selected.value = [];
	} else if (!cursor.value || loadingMore.value) {
		return;
	} else {
		loadingMore.value = true;
	}
	try {
		const params = {
			status: status.value,
			limit: 48,
			q: search.value.trim() || undefined,
			cursor: reset ? undefined : cursor.value,
		};
		if (seasonId.value) params.season_id = seasonId.value;
		const result = await adminApi.gallery.adminList(params);
		const page = result.data || { items: [], next_cursor: null };
		photos.value = reset ? page.items : photos.value.concat(page.items);
		cursor.value = page.next_cursor;
		pageError.value = "";
		const wantAll = Boolean(seasonId.value) && status.value === "all" && !search.value.trim() && canUpdate.value;
		if (wantAll && cursor.value && page.items.length) await load(false);
	} catch (err) {
		pageError.value = apiErrorMessage(err, "The gallery could not be loaded.");
	} finally {
		loading.value = false;
		loadingMore.value = false;
	}
};

const reload = () => load(true);

const measureFile = (file) =>
	new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const image = new Image();
		image.onload = () => {
			resolve({ width: image.naturalWidth, height: image.naturalHeight });
			URL.revokeObjectURL(url);
		};
		image.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("That file could not be read as an image."));
		};
		image.src = url;
	});

const measureUrl = (url) =>
	new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
		image.onerror = () => reject(new Error("Image unavailable"));
		image.src = url;
	});

const measureVideoFile = (file) =>
	new Promise((resolve) => {
		const url = URL.createObjectURL(file);
		const video = document.createElement("video");
		video.preload = "metadata";
		const finish = (width, height) => {
			URL.revokeObjectURL(url);
			resolve({ width: width || 1920, height: height || 1080 });
		};
		video.onloadedmetadata = () => finish(video.videoWidth, video.videoHeight);
		video.onerror = () => finish(1920, 1080);
		video.src = url;
	});

const fileIsVideo = (file) => file?.type?.startsWith("video/") || /\.(mp4|webm|mov|m4v)$/i.test(file?.name || "");

const uploadJob = async (job) => {
	job.status = "uploading";
	job.progress = 0;
	job.error = "";
	try {
		const body = new FormData();
		body.append("season_ids", String(seasonId.value));
		body.append("width", String(job.width));
		body.append("height", String(job.height));
		if (job.file) body.append("file", job.file);
		else body.append("url", job.url);
		await adminApi.gallery.create(body, (progress) => {
			job.progress = progress;
		});
		job.status = "done";
		await reload();
	} catch (err) {
		job.status = "error";
		job.error = apiErrorMessage(err, "That item was not saved.");
	}
};

const pump = () => {
	while (running < 3) {
		const job = jobs.value.find((item) => item.status === "waiting");
		if (!job) return;
		running += 1;
		uploadJob(job).finally(() => {
			running -= 1;
			pump();
		});
	}
};

const enqueue = (partial) => {
	jobs.value.push({ id: ++jobSeq, progress: 0, error: "", status: "waiting", ...partial });
	pump();
};

const askCrop = (payload) =>
	new Promise((resolve) => {
		cropRequest.value = { ...payload, resolve, settled: false };
	});

const settleCrop = (result) => {
	const request = cropRequest.value;
	if (!request || request.settled) return;
	request.settled = true;
	cropRequest.value = null;
	request.resolve(result);
};

const onCropConfirm = (result) => settleCrop(result);
const onCropCancel = () => settleCrop(null);

const queueFiles = async (files) => {
	dragOver.value = false;
	if (!seasonId.value) {
		pageError.value = "Choose a season before uploading.";
		return;
	}
	for (const file of files) {
		const problem = mediaFileProblem(file);
		if (problem) {
			jobs.value.push({ id: ++jobSeq, name: file.name, status: "error", error: problem, progress: 0, file });
			continue;
		}
		if (fileIsVideo(file)) {
			const size = await measureVideoFile(file);
			enqueue({ name: file.name, file, ...size });
			continue;
		}
		const local = URL.createObjectURL(file);
		try {
			const result = await askCrop({ src: local, file });
			if (result?.file) enqueue({ name: file.name, file: result.file, width: result.width, height: result.height });
		} finally {
			URL.revokeObjectURL(local);
		}
	}
};

const onDropFiles = (event) => queueFiles([...event.dataTransfer.files]);
const onPickFiles = (event) => {
	queueFiles([...event.target.files]);
	event.target.value = "";
};

const retryJob = async (job) => {
	if (!job.width && job.file) {
		try {
			Object.assign(job, fileIsVideo(job.file) ? await measureVideoFile(job.file) : await measureFile(job.file));
		} catch (err) {
			job.error = err.message;
			return;
		}
	}
	job.status = "waiting";
	pump();
};

const dismissJob = (job) => {
	jobs.value = jobs.value.filter((item) => item.id !== job.id);
};

const refreshLinkDrafts = async () => {
	const lines = [...new Set(linkText.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))];
	const drafts = [];
	for (const url of lines) {
		const problem = publicImageLinkProblem(url);
		if (problem) {
			drafts.push({ url, error: problem });
			continue;
		}
		if (isVideoUrl(url)) {
			drafts.push({ url, preview: videoPoster(url), width: 1920, height: 1080, error: "" });
			continue;
		}
		try {
			const size = await measureUrl(url);
			drafts.push({ url, preview: url, ...size, error: "" });
		} catch (err) {
			drafts.push({ url, error: err.message });
		}
	}
	linkDrafts.value = drafts;
};

watch(linkText, () => {
	clearTimeout(linkTimer);
	linkTimer = setTimeout(refreshLinkDrafts, 300);
});

watch(search, () => {
	clearTimeout(searchTimer);
	searchTimer = setTimeout(() => reload(), 300);
});

const saveLinks = async () => {
	if (!seasonId.value) return;
	for (const link of readyLinks.value) {
		if (isVideoUrl(link.url)) {
			enqueue({ name: link.url, url: link.url, width: link.width, height: link.height });
			continue;
		}
		const result = await askCrop({ src: link.url });
		if (result?.url) enqueue({ name: result.url, url: result.url, width: result.width, height: result.height });
	}
	linkText.value = linkDrafts.value
		.filter((link) => link.error)
		.map((link) => link.url)
		.join("\n");
};

const saveOrder = async (ids) => {
	try {
		await adminApi.gallery.order(seasonId.value, ids);
		pageError.value = "";
	} catch (err) {
		pageError.value = apiErrorMessage(err, "The order was not saved.");
		await reload();
	}
};

const onDragStart = (id, event) => {
	if (!ordering.value) {
		event.preventDefault();
		return;
	}
	dragId.value = id;
	event.dataTransfer.effectAllowed = "move";
	event.dataTransfer.setData("text/plain", String(id));
};

const onDragOver = (id) => {
	if (ordering.value) dropId.value = id;
};

const moveBefore = (targetId) => {
	dropId.value = null;
	if (!ordering.value || !canReorder.value || dragId.value == null || dragId.value === targetId) return;
	const next = photos.value.slice();
	const from = next.findIndex((photo) => photo.id === dragId.value);
	const to = next.findIndex((photo) => photo.id === targetId);
	if (from < 0 || to < 0) return;
	const [moved] = next.splice(from, 1);
	next.splice(to, 0, moved);
	photos.value = next;
	dragId.value = null;
	saveOrder(next.map((photo) => photo.id));
};

const toggleSelected = (id) => {
	selected.value = selected.value.includes(id) ? selected.value.filter((item) => item !== id) : selected.value.concat(id);
};

const runBulk = async (action) => {
	if (action === "delete") {
		try {
			await ElMessageBox.confirm(`Delete ${selected.value.length} item(s)? This cannot be undone.`, "Delete items", {
				type: "warning",
				confirmButtonText: "Delete",
			});
		} catch {
			return;
		}
	}
	try {
		const payload = { action, ids: selected.value };
		if (action === "add_seasons") payload.season_ids = [bulkSeasonId.value];
		await adminApi.gallery.bulk(payload);
		await reload();
	} catch (err) {
		pageError.value = apiErrorMessage(err, "That change was not saved.");
	}
};

const openEditor = (photo) => {
	if (ordering.value) return;
	if (selecting.value) {
		toggleSelected(photo.id);
		return;
	}
	draft.value = {
		...photo,
		caption: photo.caption || "",
		alt_text: photo.alt_text || "",
		taken_on: photo.taken_on,
		season_ids: [...(photo.season_ids || [])],
	};
	draftError.value = "";
	editorKey.value += 1;
	editorOpen.value = true;
};

const resetEditor = () => {
	draft.value = null;
	draftError.value = "";
	editorKey.value += 1;
	releasePageScroll();
};

let scrollRelease;
const releasePageScroll = () => {
	window.clearTimeout(scrollRelease);
	scrollRelease = window.setTimeout(() => {
		const open = [...document.querySelectorAll(".el-overlay")].some((node) => {
			const style = window.getComputedStyle(node);
			return style.display !== "none" && style.visibility !== "hidden";
		});
		if (open) return;
		document.body.classList.remove("el-popup-parent--hidden");
		document.body.style.removeProperty("width");
		document.body.style.removeProperty("overflow");
		document.body.style.removeProperty("padding-right");
	}, 400);
};

watch(editorOpen, (open) => {
	if (!open) releasePageScroll();
});
watch(cropRequest, (request) => {
	if (!request) releasePageScroll();
});

const saveDraft = async () => {
	saving.value = true;
	draftError.value = "";
	try {
		const payload = {
			caption: draft.value.caption,
			alt_text: draft.value.alt_text,
			season_ids: draft.value.season_ids,
			clear_taken_on: !draft.value.taken_on,
		};
		if (draft.value.taken_on) payload.taken_on = draft.value.taken_on;
		if (canPublish.value) payload.is_published = draft.value.is_published;
		await adminApi.gallery.update(draft.value.id, payload);
		editorOpen.value = false;
		await reload();
	} catch (err) {
		draftError.value = apiErrorMessage(err, "The photo was not saved.");
	} finally {
		saving.value = false;
	}
};

const makeCover = async () => {
	draftError.value = "";
	try {
		await adminApi.gallery.cover(seasonId.value, draft.value.id);
		await reload();
		const fresh = photos.value.find((photo) => photo.id === draft.value.id);
		if (fresh) draft.value = { ...draft.value, ...fresh };
	} catch (err) {
		draftError.value = apiErrorMessage(err, "The cover was not saved.");
	}
};

const removeOne = async () => {
	try {
		await ElMessageBox.confirm("Delete this item? This cannot be undone.", "Delete item", {
			type: "warning",
			confirmButtonText: "Delete",
		});
	} catch {
		return;
	}
	try {
		await adminApi.gallery.remove(draft.value.id);
		editorOpen.value = false;
		await reload();
	} catch (err) {
		draftError.value = apiErrorMessage(err, "The photo was not deleted.");
	}
};

onMounted(async () => {
	try {
		const result = await adminApi.seasons.list();
		seasons.value = result.data || [];
		seasonId.value = seasons.value[0]?.id ?? null;
	} catch (err) {
		pageError.value = apiErrorMessage(err, "Seasons could not be loaded.");
	}
	await load(true);
});
</script>

<style scoped>
.admin-gallery {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.gallery-toolbar,
.bulk-bar,
.drawer-actions,
.nudge {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	align-items: center;
}

.gallery-toolbar .el-select,
.gallery-toolbar .el-input {
	width: 220px;
}

.drop-zone,
.link-box {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 12px;
	padding: 18px;
	border: 1px dashed var(--cpl-line);
	border-radius: 18px;
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.4), #fff 40%),
		#fff;
	box-shadow: 0 10px 30px rgba(11, 20, 38, 0.04);
}

.drop-copy {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.drop-mark {
	width: 42px;
	height: 42px;
	border-radius: 14px;
	margin-bottom: 4px;
	background:
		radial-gradient(circle at 50% 50%, var(--cpl-gold-400) 0 7px, transparent 8px),
		var(--cpl-navy-900);
}

.drop-zone.is-over {
	border-color: var(--cpl-gold-500);
	background: var(--cpl-gold-100);
}

.drop-zone p,
.hint {
	margin: 4px 0 0;
	color: var(--cpl-ink-600);
	font-size: 13px;
}

.upload-queue,
.link-preview {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.upload-queue li,
.link-preview li {
	display: flex;
	gap: 10px;
	align-items: center;
	background: #fff;
	border-radius: 12px;
	padding: 8px 12px;
}

.job-name {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.job-error {
	color: var(--cpl-red-500);
}

.job-ok {
	color: #1a7f37;
}

.link-preview img {
	width: 48px;
	height: 48px;
	object-fit: cover;
	border-radius: 8px;
}

.link-preview .is-bad {
	color: var(--cpl-red-500);
}

.admin-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
	gap: 14px;
	align-items: start;
}

.gallery-card {
	background: #fff;
	border-radius: 16px;
	overflow: hidden;
	border: 1px solid transparent;
	box-shadow: 0 10px 24px rgba(11, 20, 38, 0.06);
	transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.gallery-card:hover {
	transform: translateY(-2px);
	box-shadow: 0 16px 32px rgba(11, 20, 38, 0.1);
}

.gallery-card.is-ordering {
	cursor: grab;
}

.gallery-card.is-ordering:hover {
	transform: none;
}

.gallery-card.is-dragging {
	opacity: 0.55;
}

.gallery-card.is-selected,
.gallery-card.is-drop {
	border-color: var(--cpl-gold-500);
}

.gallery-thumb {
	display: block;
	width: 100%;
	min-height: 200px;
	padding: 0;
	border: 0;
	background: #e7edf6;
	border-radius: 0;
	position: relative;
	cursor: pointer;
}

.gallery-thumb img,
.thumb-fallback {
	width: 100%;
	height: 100%;
	object-fit: contain;
	display: grid;
	place-items: center;
}

.play-badge,
.status-pill {
	position: absolute;
	z-index: 1;
}

.play-badge {
	left: 50%;
	top: 50%;
	width: 46px;
	height: 46px;
	border-radius: 50%;
	transform: translate(-50%, -50%);
	background: rgba(11, 20, 38, 0.72);
	box-shadow: 0 8px 20px rgba(0, 0, 0, 0.28);
}

.play-badge::after {
	content: "";
	position: absolute;
	left: 18px;
	top: 14px;
	border-style: solid;
	border-width: 9px 0 9px 14px;
	border-color: transparent transparent transparent #fff;
}

.status-pill {
	top: 10px;
	left: 10px;
	padding: 3px 8px;
	border-radius: 999px;
	background: rgba(11, 20, 38, 0.72);
	color: #fff;
	font-size: 11px;
	font-weight: 700;
	letter-spacing: 0.04em;
	text-transform: uppercase;
}

.status-pill.is-live {
	background: var(--cpl-gold-400);
	color: var(--cpl-navy-900);
}

.gallery-thumb img,
.gallery-thumb :deep(.framed),
.thumb-fallback {
	position: absolute;
	inset: 0;
}

.link-box :deep(.el-textarea) {
	width: 100%;
}

.card-meta {
	display: flex;
	flex-direction: column;
	gap: 4px;
	min-width: 0;
	padding: 10px 12px 12px;
}

.card-caption {
	display: -webkit-box;
	-webkit-line-clamp: 3;
	-webkit-box-orient: vertical;
	overflow: hidden;
	overflow-wrap: anywhere;
}

.drawer-stage {
	margin-bottom: 12px;
	border-radius: 14px;
	overflow: hidden;
	background: #0b1426;
	aspect-ratio: 16 / 9;
	min-height: 240px;
}

.drawer-stage img,
.drawer-stage video,
.drawer-stage iframe,
.drawer-stage :deep(.framed) {
	width: 100%;
	height: 100%;
	border: 0;
	object-fit: contain;
	background: #0b1426;
}

@media (prefers-reduced-motion: reduce) {
	.gallery-card,
	.gallery-card:hover {
		transition: none;
		transform: none;
	}
}

.gallery-status,
.gallery-more {
	padding: 12px 0 24px;
	color: var(--cpl-ink-600);
}
</style>
