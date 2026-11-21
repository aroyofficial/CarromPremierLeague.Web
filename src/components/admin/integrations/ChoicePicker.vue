<template>
	<div class="ip-picker">
		<div class="ip-picker-bar">
			<el-input v-model="term" :placeholder="searchPlaceholder" clearable :prefix-icon="Search" :aria-label="searchPlaceholder" />
			<template v-if="!readonly">
				<el-button v-if="allowAll" size="small" @click="$emit('select-all')">Select all</el-button>
				<el-button size="small" :disabled="!selected.length" @click="$emit('clear')">{{ clearLabel }}</el-button>
			</template>
		</div>

		<p class="ip-picker-count" aria-live="polite">{{ countLabel }}</p>

		<p v-if="!groups.length" class="ip-picker-empty">{{ emptyText }}</p>
		<p v-else-if="!visible.length" class="ip-picker-empty">Nothing matches "{{ term }}".</p>

		<section v-for="group in visible" :key="group.key" class="ip-picker-group">
			<div class="ip-picker-group-head">
				<h4>{{ group.title }}</h4>
				<el-checkbox
					v-if="!readonly"
					size="small"
					:model-value="groupState(group).all"
					:indeterminate="groupState(group).some && !groupState(group).all"
					:aria-label="`Select every ${group.title} item`"
					@change="(on) => $emit('toggle-group', group.key, Boolean(on))"
				>
					{{ groupState(group).all ? "Clear group" : "Select group" }}
				</el-checkbox>
			</div>
			<div class="ip-picker-grid">
				<label
					v-for="item in group.items"
					:key="item.code"
					class="ip-picker-option"
					:class="{ 'is-on': selected.includes(item.code) }"
				>
					<el-checkbox
						:model-value="selected.includes(item.code)"
						:disabled="readonly"
						@change="(on) => $emit('toggle', item.code, Boolean(on))"
					/>
					<span>
						<strong>{{ item.name }}</strong>
						<small>{{ item.description }}</small>
					</span>
				</label>
			</div>
		</section>
	</div>
</template>

<script setup>
import { computed, ref } from "vue";
import { Search } from "@element-plus/icons-vue";
import { filterByTerm } from "@/utils/integrations";

// groups: [{ key, title, items: [{ code, name, description }] }]
const props = defineProps({
	groups: { type: Array, default: () => [] },
	selected: { type: Array, default: () => [] },
	noun: { type: String, default: "item" },
	searchPlaceholder: { type: String, default: "Search" },
	emptyText: { type: String, default: "Nothing to choose from." },
	clearLabel: { type: String, default: "Clear" },
	allowAll: { type: Boolean, default: true },
	readonly: { type: Boolean, default: false },
});

defineEmits(["toggle", "toggle-group", "select-all", "clear"]);

const term = ref("");

const total = computed(() => props.groups.reduce((sum, group) => sum + group.items.length, 0));
const visible = computed(() => filterByTerm(props.groups, term.value, ["name", "code", "description"]));

const countLabel = computed(() => {
	const plural = props.selected.length === 1 ? props.noun : `${props.noun}s`;
	return `${props.selected.length} of ${total.value} ${plural} selected`;
});

const groupState = (group) => {
	const on = group.items.filter((item) => props.selected.includes(item.code)).length;
	return { all: on === group.items.length && on > 0, some: on > 0 };
};
</script>
