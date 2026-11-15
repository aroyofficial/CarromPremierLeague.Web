<template>
	<div class="view-coin" :class="[`on-${face}`, { compact, flipping }]" role="group" aria-label="Switch view or log out">
		<button
			type="button"
			class="coin-switch"
			:title="compact ? target.label : undefined"
			:aria-label="target.label"
			:disabled="flipping"
			@click="flip"
		>
			<span class="coin" aria-hidden="true">
				<span class="coin-face coin-front">
					<el-icon><component :is="current.icon" /></el-icon>
				</span>
				<span class="coin-face coin-back">
					<el-icon><component :is="target.icon" /></el-icon>
				</span>
			</span>
			<span v-if="!compact" class="coin-text">
				<small>Switch to</small>
				<strong>{{ target.short }}</strong>
			</span>
		</button>
		<button type="button" class="coin-logout" title="Log out" aria-label="Log out" @click="emit('logout')">
			<el-icon><SwitchButton /></el-icon>
			<span v-if="logoutText && !compact" class="logout-text">Log out</span>
		</button>
	</div>
</template>

<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { HomeFilled, Setting, SwitchButton } from "@element-plus/icons-vue";
import { Routes } from "@/utils/constants";

const props = defineProps({
	face: { type: String, default: "admin", validator: (value) => ["admin", "public"].includes(value) },
	compact: { type: Boolean, default: false },
	logoutText: { type: Boolean, default: false },
});
const emit = defineEmits(["logout", "switched"]);

const faces = {
	admin: { icon: Setting, short: "Admin console", label: "View admin console", to: Routes.ADMIN },
	public: { icon: HomeFilled, short: "Public site", label: "View public site", to: Routes.HOME },
};

const router = useRouter();
const flipping = ref(false);
const current = computed(() => faces[props.face]);
const target = computed(() => faces[props.face === "admin" ? "public" : "admin"]);

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const flip = () => {
	if (flipping.value) return;
	const go = () => {
		flipping.value = false;
		emit("switched");
		router.push(target.value.to);
	};
	if (reducedMotion()) {
		go();
		return;
	}
	flipping.value = true;
	setTimeout(go, 420);
};
</script>

<style scoped lang="scss">
.view-coin {
	--coin-size: 34px;
	display: flex;
	align-items: stretch;
	width: 100%;
	min-width: 0;
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.06);
	border: 1px solid rgba(255, 255, 255, 0.14);
	overflow: hidden;
}

.coin-switch,
.coin-logout {
	display: inline-flex;
	align-items: center;
	border: 0;
	background: transparent;
	color: inherit;
	font: inherit;
	cursor: pointer;
	min-height: 44px;

	&:focus-visible {
		outline: 2px solid var(--cpl-gold-400);
		outline-offset: -2px;
	}
}

.coin-switch {
	flex: 1 1 auto;
	min-width: 0;
	gap: 10px;
	padding: 4px 10px 4px 5px;
	color: #fff;
	text-align: left;
	perspective: 400px;

	&:hover {
		background: rgba(255, 255, 255, 0.06);
	}

	&:hover .coin {
		transform: rotateY(28deg);
	}
}

.coin {
	position: relative;
	flex: 0 0 var(--coin-size);
	width: var(--coin-size);
	height: var(--coin-size);
	transform-style: preserve-3d;
	transition: transform 0.42s cubic-bezier(0.45, 0.05, 0.25, 1.3);
}

.flipping .coin,
.flipping .coin-switch:hover .coin {
	transform: rotateY(180deg);
}

.coin-face {
	position: absolute;
	inset: 0;
	display: grid;
	place-items: center;
	border-radius: 50%;
	backface-visibility: hidden;
	font-size: 16px;
	color: var(--cpl-navy-900);
	box-shadow:
		inset 0 1px 0 rgba(255, 255, 255, 0.7),
		inset 0 -2px 0 rgba(0, 0, 0, 0.18),
		0 3px 8px rgba(0, 0, 0, 0.25);
}

.coin-back {
	transform: rotateY(180deg);
}

.on-admin .coin-front,
.on-public .coin-back {
	background: linear-gradient(160deg, #ffe7a8, #e2a01a);
}

.on-admin .coin-back,
.on-public .coin-front {
	background: linear-gradient(160deg, #f4f6fb, #a3afc7);
}

.coin-text {
	display: flex;
	flex-direction: column;
	min-width: 0;
	line-height: 1.2;

	small {
		color: rgba(255, 255, 255, 0.6);
		font-size: 11px;
	}

	strong {
		font-size: 13px;
	}

	small,
	strong {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
}

.coin-logout {
	flex: 0 0 auto;
	justify-content: center;
	gap: 6px;
	min-width: 44px;
	padding: 0 12px;
	border-left: 1px solid rgba(255, 255, 255, 0.14);
	color: rgba(255, 255, 255, 0.85);
	font-size: 13px;
	font-weight: 600;

	&:hover {
		color: #ffb4a8;
		background: rgba(255, 107, 87, 0.14);
	}
}

.compact {
	flex-direction: column;
	width: 48px;
	border-radius: 24px;

	.coin-switch {
		justify-content: center;
		padding: 6px 0;
	}

	.coin-logout {
		padding: 0;
		border-left: 0;
		border-top: 1px solid rgba(255, 255, 255, 0.14);
	}
}

@media (prefers-reduced-motion: reduce) {
	.coin {
		transition: none;
	}
}
</style>
