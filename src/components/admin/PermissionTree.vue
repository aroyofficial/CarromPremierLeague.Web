<template>
	<div class="permission-tree" :class="{ 'is-compact': compact }">
		<div v-if="showRoles && (tree.roles.length || !compact)" class="roles" role="group" aria-label="Start from a role">
			<div class="roles-head">
				<span class="roles-title">Start from a role</span>
				<span class="roles-hint">Applies a ready-made set. You can adjust it afterwards.</span>
			</div>
			<div class="role-list">
				<button
					v-for="role in roleCards"
					:key="role.code"
					type="button"
					class="role-card"
					:class="{ 'is-active': role.active }"
					:disabled="disabled || !role.allowed"
					:aria-pressed="role.active"
					:title="role.allowed ? role.description : 'You do not hold every permission in this role.'"
					@click="applySet(role.permissions)"
				>
					<span class="role-name">
						<el-icon v-if="role.active" class="role-check"><Check /></el-icon>
						{{ role.name }}
					</span>
					<span class="role-meta">{{ role.permissions.length }} permission{{ role.permissions.length === 1 ? "" : "s" }}</span>
					<span v-if="!compact" class="role-description">{{ role.description }}</span>
				</button>
			</div>
		</div>

		<div class="tree-toolbar">
			<el-input
				v-model="query"
				:prefix-icon="Search"
				placeholder="Find a permission"
				clearable
				class="tree-search"
				aria-label="Find a permission"
			/>
			<div class="tree-actions">
				<el-button text size="small" :disabled="disabled || !changeable.length" @click="applySet(changeable)">
					Turn all on
				</el-button>
				<el-button text size="small" :disabled="disabled || !changeable.length" @click="applySet([])">
					Turn all off
				</el-button>
				<el-button v-if="!query" text size="small" @click="toggleAllAreas">
					{{ allExpanded ? "Collapse all" : "Expand all" }}
				</el-button>
			</div>
		</div>

		<p v-if="query && !visibleSections.length" class="tree-empty">No permission matches "{{ query }}".</p>

		<section v-for="section in visibleSections" :key="section.code" class="tree-section">
			<header class="section-head">
				<div class="section-title">
					<h3>{{ section.name }}</h3>
					<p>{{ section.description }}</p>
				</div>
				<div class="section-side">
					<span class="count-pill" :class="{ 'is-full': section.onCount === section.total }">
						{{ section.onCount }} / {{ section.total }}
					</span>
					<el-checkbox
						:model-value="section.onCount === section.total"
						:indeterminate="section.onCount > 0 && section.onCount < section.total"
						:disabled="disabled || !section.changeable.length"
						:aria-label="`All ${section.name} permissions`"
						@change="(value) => setMany(section.changeable, value)"
					>
						All
					</el-checkbox>
				</div>
			</header>

			<div class="area-grid">
				<article
					v-for="area in section.areas"
					:key="area.code"
					class="area-card"
					:class="{ 'is-open': isOpen(area.code), 'is-full': area.onCount === area.total, 'is-some': area.onCount > 0 }"
				>
					<header class="area-head">
						<button
							type="button"
							class="area-toggle"
							:aria-expanded="isOpen(area.code)"
							:aria-controls="`area-${uid}-${area.code}`"
							@click="toggleArea(area.code)"
						>
							<span class="area-icon" aria-hidden="true">
								<el-icon><component :is="iconFor(area.icon)" /></el-icon>
							</span>
							<span class="area-text">
								<span class="area-name">{{ area.name }}</span>
								<span class="area-sub">{{ area.onCount }} of {{ area.total }} on</span>
							</span>
							<el-icon class="area-chevron" aria-hidden="true"><ArrowDown /></el-icon>
						</button>
						<el-checkbox
							class="area-all"
							:model-value="area.onCount === area.total"
							:indeterminate="area.onCount > 0 && area.onCount < area.total"
							:disabled="disabled || !area.changeable.length"
							:aria-label="`All ${area.name} permissions`"
							@change="(value) => setMany(area.changeable, value)"
						/>
						<span class="area-meter" aria-hidden="true">
							<span :style="{ width: `${(area.onCount / area.total) * 100}%` }"></span>
						</span>
					</header>

					<ul v-show="isOpen(area.code)" :id="`area-${uid}-${area.code}`" class="area-rows">
						<li
							v-for="row in area.rows"
							:key="row.code"
							class="perm-row"
							:class="{
								'is-child': Boolean(row.parent),
								'is-on': selected.has(row.code),
								'is-blocked': Boolean(row.blocked),
								'is-context': row.context,
							}"
						>
							<el-switch
								:model-value="selected.has(row.code)"
								:disabled="disabled || Boolean(row.blocked)"
								size="small"
								:aria-label="row.name"
								@change="(value) => toggle(row.code, value)"
							/>
							<div class="perm-text">
								<span class="perm-name">
									{{ row.name }}
									<el-tooltip v-if="row.blocked" :content="row.blocked" placement="top">
										<el-icon class="perm-lock" tabindex="0" :aria-label="row.blocked"><Lock /></el-icon>
									</el-tooltip>
									<span v-if="row.change === 'added'" class="change-tag is-added">Added</span>
									<span v-else-if="row.change === 'removed'" class="change-tag is-removed">Removed</span>
								</span>
								<span class="perm-description">{{ row.description }}</span>
								<span v-if="row.hint" class="perm-hint">{{ row.hint }}</span>
							</div>
						</li>
					</ul>
				</article>
			</div>
		</section>
	</div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import {
	ArrowDown,
	Calendar,
	Check,
	Flag,
	Key,
	List,
	Location,
	Lock,
	Search,
	Setting,
	Trophy,
	User,
	UserFilled,
} from "@element-plus/icons-vue";
import { buildIndex, inOrder, sameSet } from "@/utils/permissionTree";

const props = defineProps({
	tree: { type: Object, required: true },
	modelValue: { type: Array, default: () => [] },
	// Codes the signed-in admin holds, and so may grant or revoke.
	editable: { type: Array, default: () => [] },
	// Codes held fixed, with the reason shown in their tooltip.
	locked: { type: Object, default: () => ({}) },
	// The saved set, used to mark rows that will be added or removed.
	baseline: { type: Array, default: null },
	disabled: { type: Boolean, default: false },
	showRoles: { type: Boolean, default: true },
	compact: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);

const icons = { Calendar, Flag, User, Location, List, Trophy, Setting, UserFilled, Lock };
const iconFor = (name) => icons[name] || Key;
const uid = Math.random().toString(36).slice(2, 8);

const index = computed(() => buildIndex(props.tree));
const selected = computed(() => new Set(props.modelValue));
const editableSet = computed(() => new Set(props.editable));
const baselineSet = computed(() => (props.baseline ? new Set(props.baseline) : null));

const canChange = (code) => editableSet.value.has(code) && !props.locked[code];
const changeable = computed(() => index.value.order.filter(canChange));

const lockReason = (code) => {
	if (props.locked[code]) return props.locked[code];
	if (!editableSet.value.has(code)) return "You do not hold this permission, so you cannot change it.";
	return "";
};

// Why a switch cannot move from its current position, or "" when it can.
const blockReason = (code) => {
	const locked = lockReason(code);
	if (locked) return locked;
	const name = index.value.nameOf;
	if (selected.value.has(code)) {
		const stuck = index.value.childrenOf(code).find((child) => selected.value.has(child) && !canChange(child));
		if (stuck) return `'${name(stuck)}' is on and needs this permission, and you cannot change '${name(stuck)}'.`;
		return "";
	}
	const parent = index.value.parentOf(code);
	if (parent && !selected.value.has(parent) && !canChange(parent)) {
		return `This needs '${name(parent)}', which you cannot grant.`;
	}
	return "";
};

const emitSet = (next) => emit("update:modelValue", inOrder(index.value, next));

// Brings a set back in line with the hierarchy without touching codes the editor cannot change.
const normalize = (next) => {
	let changed = true;
	while (changed) {
		changed = false;
		[...next].forEach((code) => {
			const parent = index.value.parentOf(code);
			if (!parent || next.has(parent)) return;
			if (canChange(parent)) next.add(parent);
			else if (canChange(code)) next.delete(code);
			else return;
			changed = true;
		});
	}
	return next;
};

const toggle = (code, on) => {
	if (blockReason(code)) return;
	const next = new Set(selected.value);
	if (on) {
		next.add(code);
		const parent = index.value.parentOf(code);
		if (parent) next.add(parent);
	} else {
		next.delete(code);
		index.value.childrenOf(code).forEach((child) => next.delete(child));
	}
	emitSet(next);
};

const setMany = (codes, on) => {
	const next = new Set(selected.value);
	codes.filter(canChange).forEach((code) => (on ? next.add(code) : next.delete(code)));
	if (!on) {
		// A parent stays on while a child the editor cannot change still needs it.
		codes.forEach((code) => {
			if (index.value.childrenOf(code).some((child) => next.has(child) && !canChange(child))) next.add(code);
		});
	}
	emitSet(normalize(next));
};

const applySet = (codes) => {
	const wanted = new Set(codes);
	const next = new Set([...selected.value].filter((code) => !canChange(code)));
	changeable.value.forEach((code) => wanted.has(code) && next.add(code));
	emitSet(normalize(next));
};

const roleCards = computed(() =>
	props.tree.roles.map((role) => ({
		...role,
		allowed: role.permissions.every(canChange),
		active: sameSet(role.permissions, props.modelValue),
	})),
);

const query = ref("");
const opened = ref(new Set());
const normalizedQuery = computed(() => query.value.trim().toLowerCase());

const isOpen = (code) => Boolean(normalizedQuery.value) || opened.value.has(code);
const toggleArea = (code) => {
	const next = new Set(opened.value);
	if (next.has(code)) next.delete(code);
	else next.add(code);
	opened.value = next;
};
const allAreaCodes = computed(() => props.tree.sections.flatMap((section) => section.areas.map((area) => area.code)));
const allExpanded = computed(() => allAreaCodes.value.every((code) => opened.value.has(code)));
const toggleAllAreas = () => {
	opened.value = allExpanded.value ? new Set() : new Set(allAreaCodes.value);
};

watch(
	allAreaCodes,
	(codes) => {
		if (!props.compact && !opened.value.size) opened.value = new Set(codes);
	},
	{ immediate: true },
);

const matches = (permission, area) => {
	const q = normalizedQuery.value;
	if (!q) return true;
	return [permission.name, permission.description, area.name].some((text) => text.toLowerCase().includes(q));
};

const changeOf = (code) => {
	if (!baselineSet.value) return "";
	const on = selected.value.has(code);
	const was = baselineSet.value.has(code);
	if (on && !was) return "added";
	if (!on && was) return "removed";
	return "";
};

const hintFor = (permission) => {
	if (!permission.parent || selected.value.has(permission.code) || selected.value.has(permission.parent)) return "";
	return `Also turns on '${index.value.nameOf(permission.parent)}'.`;
};

const visibleSections = computed(() =>
	props.tree.sections
		.map((section) => {
			const areas = section.areas
				.map((area) => {
					const hits = new Set(area.permissions.filter((permission) => matches(permission, area)).map((p) => p.code));
					if (!hits.size) return null;
					const rows = area.permissions
						.filter((permission) => hits.has(permission.code) || area.permissions.some((p) => p.parent === permission.code && hits.has(p.code)))
						.map((permission) => ({
							...permission,
							context: !hits.has(permission.code),
							blocked: blockReason(permission.code),
							change: changeOf(permission.code),
							hint: hintFor(permission),
						}));
					const codes = area.permissions.map((permission) => permission.code);
					return {
						...area,
						rows,
						total: codes.length,
						onCount: codes.filter((code) => selected.value.has(code)).length,
						changeable: codes.filter(canChange),
					};
				})
				.filter(Boolean);
			if (!areas.length) return null;
			const codes = section.areas.flatMap((area) => area.permissions.map((permission) => permission.code));
			return {
				...section,
				areas,
				total: codes.length,
				onCount: codes.filter((code) => selected.value.has(code)).length,
				changeable: codes.filter(canChange),
			};
		})
		.filter(Boolean),
);
</script>

<style scoped lang="scss">
.roles {
	margin-bottom: 16px;
}

.roles-head {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: 4px 10px;
	margin-bottom: 8px;
}

.roles-title {
	font-weight: 700;
	color: var(--cpl-ink-900);
}

.roles-hint {
	color: var(--cpl-ink-600);
	font-size: 12.5px;
}

.role-list {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
	gap: 8px;
}

.is-compact .role-list {
	grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
}

.role-card {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 2px;
	min-width: 0;
	padding: 10px 12px;
	border: 1px solid var(--cpl-line);
	border-radius: var(--cpl-radius-md);
	background: var(--cpl-surface);
	text-align: left;
	cursor: pointer;
	transition:
		border-color 0.15s ease,
		box-shadow 0.15s ease,
		transform 0.15s ease;

	&:hover:not(:disabled) {
		border-color: var(--cpl-gold-500);
		box-shadow: 0 4px 14px rgba(245, 184, 46, 0.18);
		transform: translateY(-1px);
	}

	&:focus-visible {
		outline: 2px solid var(--cpl-gold-500);
		outline-offset: 2px;
	}

	&:disabled {
		cursor: not-allowed;
		opacity: 0.55;
	}

	&.is-active {
		border-color: var(--cpl-gold-500);
		background: var(--cpl-gold-100);
	}
}

.role-name {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font-weight: 700;
	font-size: 14px;
	color: var(--cpl-ink-900);
}

.role-check {
	color: var(--cpl-wood-500);
}

.role-meta {
	color: var(--cpl-ink-600);
	font-size: 12px;
	font-weight: 600;
}

.role-description {
	display: -webkit-box;
	overflow: hidden;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	color: var(--cpl-ink-600);
	font-size: 12.5px;
	line-height: 1.35;
}

.tree-toolbar {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 8px 12px;
	margin-bottom: 14px;
}

.tree-search {
	flex: 1 1 240px;
	max-width: 340px;
}

.tree-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 2px;

	.el-button + .el-button {
		margin-left: 0;
	}
}

.tree-empty {
	margin: 8px 0;
	color: var(--cpl-ink-600);
}

.tree-section + .tree-section {
	margin-top: 20px;
}

.section-head {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 8px 16px;
	margin-bottom: 10px;
	padding-left: 12px;
	border-left: 4px solid var(--cpl-gold-500);
}

.section-title {
	min-width: 0;

	h3 {
		margin: 0;
		font-family: var(--cpl-font-display);
		font-size: 17px;
		font-weight: 800;
		color: var(--cpl-navy-900);
	}

	p {
		margin: 1px 0 0;
		color: var(--cpl-ink-600);
		font-size: 13px;
	}
}

.section-side {
	display: flex;
	align-items: center;
	gap: 12px;
}

.count-pill {
	padding: 2px 10px;
	border-radius: 999px;
	background: var(--cpl-surface-muted);
	border: 1px solid var(--cpl-line);
	color: var(--cpl-ink-600);
	font-size: 12.5px;
	font-weight: 700;

	&.is-full {
		background: var(--cpl-navy-700);
		border-color: var(--cpl-navy-700);
		color: var(--cpl-gold-400);
	}
}

.area-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
	gap: 12px;
	align-items: start;
}

.is-compact .area-grid {
	grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
}

.area-card {
	min-width: 0;
	border: 1px solid var(--cpl-line);
	border-radius: var(--cpl-radius-md);
	background: var(--cpl-surface);
	overflow: hidden;
	transition: border-color 0.15s ease;

	&.is-some {
		border-color: var(--cpl-wood-300);
	}

	&.is-full {
		border-color: var(--cpl-gold-500);
	}
}

.area-head {
	position: relative;
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 10px 12px 12px;
	background: var(--cpl-surface-muted);
}

.area-toggle {
	display: flex;
	flex: 1;
	align-items: center;
	gap: 10px;
	min-width: 0;
	padding: 0;
	border: 0;
	background: transparent;
	text-align: left;
	cursor: pointer;

	&:focus-visible {
		outline: 2px solid var(--cpl-gold-500);
		outline-offset: 3px;
		border-radius: 8px;
	}
}

.area-icon {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: 34px;
	height: 34px;
	border-radius: 10px;
	background: var(--cpl-navy-700);
	color: var(--cpl-gold-400);
	font-size: 17px;
	transition:
		background 0.15s ease,
		color 0.15s ease;
}

.is-full .area-icon {
	background: var(--cpl-gold-500);
	color: var(--cpl-navy-900);
}

.area-text {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.area-name {
	font-weight: 700;
	color: var(--cpl-ink-900);
}

.area-sub {
	color: var(--cpl-ink-600);
	font-size: 12px;
	font-weight: 600;
}

.area-chevron {
	margin-left: auto;
	color: var(--cpl-ink-400);
	transition: transform 0.2s ease;
}

.is-open .area-chevron {
	transform: rotate(180deg);
}

.area-all {
	flex-shrink: 0;
	height: auto;
}

.area-meter {
	position: absolute;
	right: 0;
	bottom: 0;
	left: 0;
	height: 3px;
	background: var(--cpl-line);

	span {
		display: block;
		height: 100%;
		background: linear-gradient(90deg, var(--cpl-gold-500), var(--cpl-wood-500));
		transition: width 0.25s ease;
	}
}

.area-rows {
	margin: 0;
	padding: 6px 12px 10px;
	list-style: none;
}

.perm-row {
	position: relative;
	display: flex;
	align-items: flex-start;
	gap: 10px;
	padding: 8px 0;

	& + & {
		border-top: 1px solid var(--cpl-line);
	}

	.el-switch {
		flex-shrink: 0;
		margin-top: 1px;
	}

	&.is-child {
		margin-left: 18px;
		padding-left: 14px;
		border-top: 0;

		&::before {
			content: "";
			position: absolute;
			top: 0;
			bottom: 0;
			left: 0;
			border-left: 2px solid var(--cpl-line);
		}

		&::after {
			content: "";
			position: absolute;
			top: 17px;
			left: 0;
			width: 9px;
			border-top: 2px solid var(--cpl-line);
		}

		&.is-on::before,
		&.is-on::after {
			border-color: var(--cpl-wood-300);
		}
	}

	&.is-context {
		opacity: 0.6;
	}
}

.perm-text {
	display: flex;
	flex-direction: column;
	gap: 1px;
	min-width: 0;
}

.perm-name {
	display: inline-flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 6px;
	font-weight: 600;
	font-size: 14px;
	color: var(--cpl-ink-900);
	line-height: 1.3;
}

.is-blocked .perm-name {
	color: var(--cpl-ink-600);
}

.perm-lock {
	color: var(--cpl-wood-500);
	cursor: help;
}

.perm-description {
	color: var(--cpl-ink-600);
	font-size: 12.5px;
	line-height: 1.4;
}

.perm-hint {
	color: var(--cpl-ink-400);
	font-size: 12px;
	line-height: 1.35;
}

.change-tag {
	padding: 0 7px;
	border-radius: 999px;
	font-size: 11px;
	font-weight: 700;
	line-height: 18px;

	&.is-added {
		background: #dcfce7;
		color: #166534;
	}

	&.is-removed {
		background: #fee2e2;
		color: #991b1b;
	}
}

@media (max-width: 575.98px) {
	.tree-search {
		max-width: none;
	}

	.area-grid,
	.is-compact .area-grid {
		grid-template-columns: minmax(0, 1fr);
	}

	.role-list,
	.is-compact .role-list {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.role-description {
		display: none;
	}
}
</style>
