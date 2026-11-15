<template>
	<div class="code-boxes" @paste="onPaste">
		<input
			v-for="index in 6"
			:key="index"
			:ref="(element) => (boxes[index - 1] = element)"
			:value="digits[index - 1]"
			class="box"
			type="text"
			inputmode="numeric"
			autocomplete="one-time-code"
			maxlength="1"
			:aria-label="`Digit ${index} of 6`"
			:disabled="disabled"
			@input="onInput(index - 1, $event)"
			@keydown="onKeydown(index - 1, $event)"
			@focus="$event.target.select()"
		/>
	</div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from "vue";

const props = defineProps({
	modelValue: { type: String, default: "" },
	disabled: { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue", "complete"]);

const boxes = ref([]);
const digits = computed(() => {
	const chars = String(props.modelValue || "").replace(/\D/g, "").slice(0, 6).split("");
	while (chars.length < 6) chars.push("");
	return chars;
});

const write = (chars) => {
	const next = chars.join("").replace(/\D/g, "").slice(0, 6);
	const wasComplete = String(props.modelValue || "").replace(/\D/g, "").length === 6;
	emit("update:modelValue", next);
	if (next.length === 6 && !wasComplete && !props.disabled) emit("complete");
};

const focusAt = (index) => {
	nextTick(() => boxes.value[Math.min(5, Math.max(0, index))]?.focus());
};

const fillFrom = (start, text) => {
	const chars = digits.value.slice();
	const incoming = text.replace(/\D/g, "").split("");
	let cursor = start;
	for (const digit of incoming) {
		if (cursor > 5) break;
		chars[cursor] = digit;
		cursor += 1;
	}
	write(chars);
	focusAt(Math.min(cursor, 5));
};

const onInput = (index, event) => {
	const text = event.target.value.replace(/\D/g, "");
	if (text.length > 1) {
		fillFrom(index, text);
		return;
	}
	const chars = digits.value.slice();
	chars[index] = text.slice(-1);
	write(chars);
	if (text) focusAt(index + 1);
};

const onKeydown = (index, event) => {
	if (event.key === "Backspace" && !digits.value[index] && index > 0) {
		event.preventDefault();
		const chars = digits.value.slice();
		chars[index - 1] = "";
		write(chars);
		focusAt(index - 1);
	} else if (event.key === "ArrowLeft" && index > 0) {
		event.preventDefault();
		focusAt(index - 1);
	} else if (event.key === "ArrowRight" && index < 5) {
		event.preventDefault();
		focusAt(index + 1);
	}
};

const onPaste = (event) => {
	const text = event.clipboardData?.getData("text") || "";
	if (!/\d/.test(text)) return;
	event.preventDefault();
	const active = boxes.value.indexOf(document.activeElement);
	fillFrom(active < 0 ? 0 : active, text);
};

watch(
	() => props.modelValue,
	(value) => {
		if (!value) focusAt(0);
	},
);

onMounted(() => focusAt(0));
</script>

<style scoped>
.code-boxes {
	display: flex;
	justify-content: space-between;
	gap: 8px;
}

.box {
	width: 100%;
	max-width: 48px;
	height: 52px;
	border: 1.5px solid var(--cpl-line, #d9d3c5);
	border-radius: 12px;
	background: #fff;
	text-align: center;
	font-size: 22px;
	font-weight: 700;
	font-variant-numeric: tabular-nums;
	color: var(--cpl-ink-900, #0b1426);
}

.box:focus {
	outline: 2px solid var(--cpl-gold-400, #ffc94a);
	border-color: transparent;
}

.box:disabled {
	background: #f4f1ea;
	color: var(--cpl-ink-600, #667);
}
</style>
