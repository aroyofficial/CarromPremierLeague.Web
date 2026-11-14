<template>
	<div class="admin-gallery">
		<header class="admin-page-head">
			<div>
				<span class="page-eyebrow">Media</span>
				<h1>Gallery</h1>
				<p>New photos stay drafts until they are published.</p>
			</div>
		</header>

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
			<el-button v-if="canUpdate" :disabled="!canReorder" @click="selecting = !selecting">
				{{ selecting ? "Done" : "Select" }}
			</el-button>
		</div>

		<section
			v-if="canCreate"
			class="drop-zone"
			:class="{ 'is-over': dragOver }"
			@dragover.prevent="dragOver = true"
			@dragleave="dragOver = false"
			@drop.prevent="onDropFiles"
		>
			<input ref="fileInput" type="file" multiple :accept="IMAGE_ACCEPT" hidden @change="onPickFiles" />
			<div>
				<strong>Drop photos here</strong>
				<p>JPEG, PNG or WebP, up to 5 MB. Three upload at a time.</p>
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
			<label for="gallery-links">Public image links, one per line</label>
			<el-input id="gallery-links" v-model="linkText" type="textarea" :rows="4" placeholder="https://…" />
			<ul v-if="linkDrafts.length" class="link-preview">
				<li v-for="link in linkDrafts" :key="link.url" :class="{ 'is-bad': link.error }">
					<img v-if="link.preview" :src="link.preview" alt="" />
					<span>{{ link.error || `${link.width} × ${link.height}` }}</span>
				</li>
			</ul>
			<el-button :disabled="!readyLinks.length || !seasonId" @click="saveLinks">Save {{ readyLinks.length }} link(s)</el-button>
		</section>

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
		<div v-else class="admin-grid">
			<article
				v-for="(photo, index) in photos"
				:key="photo.id"
				class="admin-card"
				:class="{ 'is-selected': selected.includes(photo.id) }"
				:draggable="canReorder"
				@dragstart="dragId = photo.id"
				@dragover.prevent
				@drop="moveBefore(photo.id)"
			>
				<button type="button" class="admin-thumb" :style="{ aspectRatio: `${photo.width} / ${photo.height}` }" @click="openEditor(photo)">
					<img v-if="!broken.has(photo.id)" :src="photo.thumbnail_url" :alt="photo.alt_text || photo.caption || ''" @error="markBroken(photo.id)" />
					<span v-else>Image unavailable</span>
				</button>
				<div class="card-meta">
					<label v-if="selecting">
						<input type="checkbox" :checked="selected.includes(photo.id)" @change="toggleSelected(photo.id)" />
						Select
					</label>
					<strong>{{ photo.caption || "Untitled" }}</strong>
					<span class="hint">{{ photo.is_published ? "Published" : "Draft" }}<template v-if="photo.is_cover"> · Cover</template></span>
					<div v-if="canReorder" class="nudge">
						<el-button size="small" :disabled="index === 0" @click="nudge(index, -1)">Earlier</el-button>
						<el-button size="small" :disabled="index === photos.length - 1" @click="nudge(index, 1)">Later</el-button>
					</div>
				</div>
			</article>
		</div>
		<GallerySkeleton v-if="loadingMore" compact />
		<div v-if="cursor && !canReorder" class="gallery-more">
			<el-button :loading="loadingMore" @click="load(false)">Load more</el-button>
		</div>

		<el-drawer v-model="editorOpen" title="Edit photo" size="420px" :close-on-click-modal="!saving">
			<template v-if="draft">
				<img class="drawer-preview" :src="draft.thumbnail_url" alt="" />
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
			</template>
		</el-drawer>
	</div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { ElMessageBox } from "element-plus";
import GallerySkeleton from "@/components/GallerySkeleton.vue";
import { adminApi, apiErrorMessage } from "@/services/adminService";
import { useAuthStore } from "@/store/authStore";
import { IMAGE_ACCEPT, imageFileProblem, publicImageLinkProblem } from "@/utils/media";
import { useUploadLeaveGuard } from "@/utils/uploadGuard";

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
const dragId = ref(null);
const fileInput = ref(null);
const linkText = ref("");
const linkDrafts = ref([]);
const editorOpen = ref(false);
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
		job.error = apiErrorMessage(err, "The photo was not saved.");
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

const queueFiles = async (files) => {
	dragOver.value = false;
	if (!seasonId.value) {
		pageError.value = "Choose a season before uploading.";
		return;
	}
	for (const file of files) {
		const problem = imageFileProblem(file);
		if (problem) {
			jobs.value.push({ id: ++jobSeq, name: file.name, status: "error", error: problem, progress: 0, file });
			continue;
		}
		try {
			const size = await measureFile(file);
			enqueue({ name: file.name, file, ...size });
		} catch (err) {
			jobs.value.push({ id: ++jobSeq, name: file.name, status: "error", error: err.message, progress: 0, file });
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
			Object.assign(job, await measureFile(job.file));
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

const saveLinks = () => {
	if (!seasonId.value) return;
	for (const link of readyLinks.value) {
		enqueue({ name: link.url, url: link.url, width: link.width, height: link.height });
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

const moveBefore = (targetId) => {
	if (!canReorder.value || dragId.value == null || dragId.value === targetId) return;
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

const nudge = (index, direction) => {
	const next = photos.value.slice();
	const target = index + direction;
	[next[index], next[target]] = [next[target], next[index]];
	photos.value = next;
	saveOrder(next.map((photo) => photo.id));
};

const toggleSelected = (id) => {
	selected.value = selected.value.includes(id) ? selected.value.filter((item) => item !== id) : selected.value.concat(id);
};

const runBulk = async (action) => {
	if (action === "delete") {
		try {
			await ElMessageBox.confirm(`Delete ${selected.value.length} photo(s)? This cannot be undone.`, "Delete photos", {
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
	editorOpen.value = true;
};

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
		await ElMessageBox.confirm("Delete this photo? This cannot be undone.", "Delete photo", {
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
	flex-wrap: wrap;
	justify-content: space-between;
	gap: 12px;
	align-items: center;
	padding: 16px;
	border: 1px dashed var(--cpl-line);
	border-radius: 16px;
	background: #fff;
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
	columns: 4 180px;
	column-gap: 12px;
}

.admin-card {
	break-inside: avoid;
	margin-bottom: 12px;
	background: #fff;
	border-radius: 14px;
	overflow: hidden;
	border: 1px solid transparent;
}

.admin-card.is-selected {
	border-color: var(--cpl-gold-500);
}

.admin-thumb {
	display: block;
	width: 100%;
	padding: 0;
	border: 0;
	background: #e7edf6;
	position: relative;
	cursor: pointer;
}

.admin-thumb img,
.admin-thumb span {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: grid;
	place-items: center;
}

.admin-thumb img {
	position: absolute;
	inset: 0;
}

.card-meta {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 10px 12px 12px;
}

.drawer-preview {
	width: 100%;
	max-height: 220px;
	object-fit: contain;
	background: #e7edf6;
	border-radius: 12px;
	margin-bottom: 12px;
}

.gallery-status,
.gallery-more {
	padding: 12px 0 24px;
	color: var(--cpl-ink-600);
}
</style>
