<template>
	<div class="permission-picker" :class="{ 'is-compact': compact }">
		<div v-if="showPresets" class="presets" role="group" aria-label="Quick choices">
			<span class="presets-label">Quick choices</span>
			<el-button size="small" :disabled="disabled" @click="applyPreset('full')">Full access</el-button>
			<el-button size="small" :disabled="disabled" @click="applyPreset('matchDay')">Match day operator</el-button>
			<el-button size="small" :disabled="disabled" @click="applyPreset('content')">League content editor</el-button>
			<el-button size="small" :disabled="disabled" @click="applyPreset('none')">Clear</el-button>
		</div>

		<div class="areas">
			<section v-for="area in areas" :key="area.name" class="area">
				<header class="area-head">
					<el-checkbox
						:model-value="area.allOn"
						:indeterminate="area.someOn && !area.allOn"
						:disabled="disabled || !area.editable.length"
						@change="(value) => toggleArea(area, value)"
					>
						<span class="area-name">{{ area.name }}</span>
					</el-checkbox>
					<span class="area-count">{{ area.onCount }} of {{ area.items.length }}</span>
				</header>

				<ul class="area-items">
					<li v-for="item in area.items" :key="item.code" :class="{ 'is-locked': isLocked(item.code) }">
						<el-checkbox
							:model-value="selected.has(item.code)"
							:disabled="disabled || isLocked(item.code)"
							@change="(value) => toggle(item.code, value)"
						>
							<span class="item-name">{{ item.name }}</span>
						</el-checkbox>
						<p class="item-description">{{ item.description }}</p>
						<p v-if="lockReason(item.code)" class="item-lock">{{ lockReason(item.code) }}</p>
					</li>
				</ul>
			</section>
		</div>
	</div>
</template>

<script setup>
import { computed } from "vue";
import { Permission } from "@/utils/constants";

const props = defineProps({
	catalog: { type: Array, required: true },
	modelValue: { type: Array, default: () => [] },
	// Codes the signed-in admin holds, and so may grant or revoke.
	editable: { type: Array, default: () => [] },
	// Codes held fixed with the reason shown under them.
	locked: { type: Object, default: () => ({}) },
	disabled: { type: Boolean, default: false },
	showPresets: { type: Boolean, default: true },
	compact: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);

const presets = {
	matchDay: [Permission.MATCHES_UPDATE, Permission.MATCHES_SCORECARD, Permission.MATCHES_RESET],
	content: [
		Permission.TEAMS_CREATE,
		Permission.TEAMS_UPDATE,
		Permission.PLAYERS_CREATE,
		Permission.PLAYERS_UPDATE,
		Permission.COUNTRIES_CREATE,
		Permission.COUNTRIES_UPDATE,
		Permission.ROSTERS_MANAGE,
	],
};

const selected = computed(() => new Set(props.modelValue));
const editableSet = computed(() => new Set(props.editable));

const isLocked = (code) => !editableSet.value.has(code) || Boolean(props.locked[code]);

const lockReason = (code) => {
	if (props.locked[code]) return props.locked[code];
	if (!editableSet.value.has(code)) return "You do not hold this permission, so you cannot change it.";
	return "";
};

const areas = computed(() => {
	const grouped = new Map();
	props.catalog.forEach((item) => {
		if (!grouped.has(item.area)) grouped.set(item.area, []);
		grouped.get(item.area).push(item);
	});
	return [...grouped.entries()].map(([name, items]) => {
		const editable = items.filter((item) => !isLocked(item.code)).map((item) => item.code);
		const onCount = items.filter((item) => selected.value.has(item.code)).length;
		return {
			name,
			items,
			editable,
			onCount,
			someOn: onCount > 0,
			allOn: onCount === items.length,
		};
	});
});

const emitWith = (next) => {
	const order = props.catalog.map((item) => item.code);
	emit(
		"update:modelValue",
		order.filter((code) => next.has(code)),
	);
};

const toggle = (code, value) => {
	if (isLocked(code)) return;
	const next = new Set(selected.value);
	if (value) next.add(code);
	else next.delete(code);
	emitWith(next);
};

const toggleArea = (area, value) => {
	const next = new Set(selected.value);
	area.editable.forEach((code) => (value ? next.add(code) : next.delete(code)));
	emitWith(next);
};

const applyPreset = (name) => {
	const changeable = props.catalog.map((item) => item.code).filter((code) => !isLocked(code));
	const wanted = new Set(name === "full" ? changeable : name === "none" ? [] : presets[name] || []);
	const next = new Set(selected.value);
	changeable.forEach((code) => (wanted.has(code) ? next.add(code) : next.delete(code)));
	emitWith(next);
};
</script>

<style scoped lang="scss">
.presets {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
	margin-bottom: 14px;

	.el-button + .el-button {
		margin-left: 0;
	}
}

.presets-label {
	margin-right: 4px;
	color: var(--cpl-ink-600);
	font-size: 13px;
	font-weight: 600;
}

.areas {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 12px;
}

.is-compact .areas {
	grid-template-columns: minmax(0, 1fr);
}

.area {
	min-width: 0;
	border: 1px solid var(--cpl-line);
	border-radius: var(--cpl-radius-md);
	background: #fff;
}

.area-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	padding: 10px 14px;
	border-bottom: 1px solid var(--cpl-line);
	background: var(--cpl-surface-muted);
	border-radius: var(--cpl-radius-md) var(--cpl-radius-md) 0 0;
}

.area-name {
	font-weight: 700;
	color: var(--cpl-ink-900);
}

.area-count {
	flex-shrink: 0;
	color: var(--cpl-ink-600);
	font-size: 12px;
	font-weight: 600;
}

.area-items {
	margin: 0;
	padding: 4px 14px 8px;
	list-style: none;

	li {
		padding: 8px 0;

		& + li {
			border-top: 1px dashed var(--cpl-line);
		}
	}

	:deep(.el-checkbox) {
		height: auto;
		align-items: flex-start;
		white-space: normal;
	}

	:deep(.el-checkbox__label) {
		line-height: 1.35;
	}
}

.item-name {
	font-weight: 600;
	color: var(--cpl-ink-900);
}

.item-description,
.item-lock {
	margin: 2px 0 0 24px;
	font-size: 12.5px;
	line-height: 1.4;
	color: var(--cpl-ink-600);
}

.item-lock {
	color: var(--cpl-wood-500);
}

.is-locked .item-name {
	color: var(--cpl-ink-400);
}

@media (max-width: 767.98px) {
	.areas {
		grid-template-columns: minmax(0, 1fr);
	}
}

@media (max-width: 575.98px) {
	.presets {
		.el-button {
			flex: 1 1 calc(50% - 8px);
		}
	}

	.presets-label {
		flex-basis: 100%;
	}
}
</style>
