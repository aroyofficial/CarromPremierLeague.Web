<template>
	<div class="new-password">
		<el-form-item label="New password" :prop="passwordProp">
			<el-input
				:model-value="password"
				type="password"
				show-password
				autocomplete="new-password"
				:prefix-icon="Lock"
				placeholder="At least 12 characters"
				:aria-describedby="`${uid}-strength ${uid}-checks`"
				@update:model-value="$emit('update:password', $event)"
			/>
		</el-form-item>
		<div :id="`${uid}-strength`" class="strength" :data-score="strength.score" aria-live="polite">
			<div class="strength-bar" aria-hidden="true">
				<span v-for="index in 5" :key="index" :class="{ 'is-on': index <= strength.score }"></span>
			</div>
			<span class="strength-label">{{ strength.label ? `Strength: ${strength.label}` : "Strength" }}</span>
		</div>
		<el-form-item label="Confirm password" :prop="confirmProp">
			<el-input
				:model-value="confirm"
				type="password"
				show-password
				autocomplete="new-password"
				:prefix-icon="Lock"
				placeholder="Type it again"
				@update:model-value="$emit('update:confirm', $event)"
			/>
		</el-form-item>
		<ul :id="`${uid}-checks`" class="checks" aria-label="Password rules">
			<li v-for="check in checks" :key="check.id" :class="{ 'is-met': check.met, 'is-optional': !check.required }">
				<el-icon aria-hidden="true"><CircleCheckFilled v-if="check.met" /><CircleClose v-else /></el-icon>
				<span>{{ check.label }}</span>
				<span class="visually-hidden">{{ check.met ? "done" : check.required ? "required" : "suggested" }}</span>
			</li>
		</ul>
	</div>
</template>

<script setup>
import { computed } from "vue";
import { CircleCheckFilled, CircleClose, Lock } from "@element-plus/icons-vue";
import { passwordChecks, passwordStrength } from "@/utils/passwordRules";

const props = defineProps({
	password: { type: String, default: "" },
	confirm: { type: String, default: "" },
	passwordProp: { type: String, default: "password" },
	confirmProp: { type: String, default: "confirm" },
});
defineEmits(["update:password", "update:confirm"]);

const uid = `np-${Math.random().toString(36).slice(2, 8)}`;
const strength = computed(() => passwordStrength(props.password));
const checks = computed(() => passwordChecks(props.password, props.confirm));
</script>

<style scoped>
.strength {
	display: flex;
	align-items: center;
	gap: 10px;
	margin: -10px 0 16px;
	font-size: 12px;
	color: var(--cpl-ink-600);
}

.strength-bar {
	flex: 1 1 auto;
	display: grid;
	grid-template-columns: repeat(5, 1fr);
	gap: 4px;
}

.strength-bar span {
	height: 5px;
	border-radius: 999px;
	background: var(--cpl-line);
	transition: background 0.2s ease;
}

.strength[data-score="1"] .is-on { background: var(--cpl-red-500); }
.strength[data-score="2"] .is-on { background: #f08c2e; }
.strength[data-score="3"] .is-on { background: var(--cpl-gold-500); }
.strength[data-score="4"] .is-on,
.strength[data-score="5"] .is-on { background: #1f9d55; }

.strength-label {
	min-width: 118px;
	text-align: right;
	font-weight: 600;
}

.checks {
	list-style: none;
	margin: -4px 0 18px;
	padding: 12px 14px;
	display: grid;
	gap: 6px;
	background: var(--cpl-surface-muted);
	border-radius: var(--cpl-radius-md);
	font-size: 13px;
	color: var(--cpl-ink-600);
}

.checks li {
	display: flex;
	align-items: center;
	gap: 8px;
}

.checks li .el-icon {
	color: var(--cpl-ink-400);
}

.checks li.is-met {
	color: var(--cpl-ink-900);
}

.checks li.is-met .el-icon {
	color: #1f9d55;
}

.checks li.is-optional:not(.is-met) {
	opacity: 0.8;
}
</style>
