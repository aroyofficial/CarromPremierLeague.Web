const center = { x: 100, y: 100 };
const pockets = [
	{ x: 25, y: 25 },
	{ x: 175, y: 25 },
	{ x: 175, y: 175 },
	{ x: 25, y: 175 },
];
const shotMs = 2400;
const practice = [
	{ side: "bottom", along: 0.18, cut: 0.62 },
	{ side: "right", along: 0.78, cut: -0.62 },
	{ side: "top", along: 0.2, cut: -0.58 },
	{ side: "left", along: 0.48, cut: -0.22 },
	{ side: "bottom", along: 0.84, cut: -0.58 },
	{ side: "left", along: 0.18, cut: 0.62 },
	{ side: "right", along: 0.24, cut: 0.7 },
	{ side: "top", along: 0.82, cut: 0.55 },
];

const clamp = (value) => Math.min(1, Math.max(0, value));
const mix = (from, to, amount) => from + (to - from) * amount;
const smoother = (amount) => {
	const t = clamp(amount);
	return t * t * t * (t * (t * 6 - 15) + 10);
};
const easeInSine = (amount) => 1 - Math.cos((clamp(amount) * Math.PI) / 2);
const easeOutSine = (amount) => Math.sin((clamp(amount) * Math.PI) / 2);
const easeOutQuart = (amount) => 1 - (1 - clamp(amount)) ** 4;
const glide = (amount) => {
	const t = clamp(amount);
	return 0.28 * t + 0.72 * (1 - (1 - t) ** 3);
};

const onBaseline = (side, along) => {
	if (side === "bottom") return { x: mix(72, 128, along), y: 151 };
	if (side === "top") return { x: mix(72, 128, along), y: 49 };
	if (side === "left") return { x: 49, y: mix(72, 128, along) };
	return { x: 151, y: mix(72, 128, along) };
};

const rotate = (vector, angle) => {
	const c = Math.cos(angle);
	const s = Math.sin(angle);
	return { x: vector.x * c - vector.y * s, y: vector.x * s + vector.y * c };
};

const shotOf = (time) => {
	const plan = practice[Math.floor(time / shotMs) % practice.length];
	const start = onBaseline(plan.side, plan.along);
	const inbound = { x: center.x - start.x, y: center.y - start.y };
	const length = Math.hypot(inbound.x, inbound.y);
	const unit = { x: inbound.x / length, y: inbound.y / length };
	const exit = rotate(unit, plan.cut);
	let pocketIndex = 0;
	let best = -Infinity;
	pockets.forEach((pocket, index) => {
		const vx = pocket.x - center.x;
		const vy = pocket.y - center.y;
		const reach = Math.hypot(vx, vy);
		const dot = (vx / reach) * exit.x + (vy / reach) * exit.y;
		if (dot > best) {
			best = dot;
			pocketIndex = index;
		}
	});
	return {
		index: pocketIndex,
		pocket: pockets[pocketIndex],
		start,
		contact: { x: center.x - unit.x * 17, y: center.y - unit.y * 17 },
		local: (time % shotMs) / shotMs,
	};
};

const along = (shot, s) => ({
	x: mix(shot.start.x, shot.contact.x, s),
	y: mix(shot.start.y, shot.contact.y, s),
});

const strikerS = (u) => {
	if (u < 0.14) return mix(0, -0.16, smoother(u / 0.14));
	if (u < 0.17) return -0.16;
	if (u < 0.36) return mix(-0.16, 1, easeInSine((u - 0.17) / 0.19));
	if (u < 0.52) return mix(1, 0.18, easeOutSine((u - 0.36) / 0.16));
	if (u < 0.58) return 0.18;
	if (u < 0.88) return mix(0.18, 0, smoother((u - 0.58) / 0.3));
	return 0;
};

const queenState = (u, pocket) => {
	if (u < 0.36) return { x: center.x, y: center.y, scale: 1, opacity: 1, spin: 0, travel: 0 };
	if (u < 0.86) {
		const travel = glide((u - 0.36) / 0.42);
		const sink = u < 0.74 ? 0 : smoother((u - 0.74) / 0.12);
		return {
			x: mix(center.x, pocket.x, travel),
			y: mix(center.y, pocket.y, travel),
			scale: mix(1, 0.2, sink),
			opacity: 1 - sink * 0.92,
			spin: travel * 180,
			travel,
		};
	}
	if (u < 0.9) return { x: center.x, y: center.y, scale: 0.8, opacity: 0, spin: 0, travel: 1 };
	const fade = smoother((u - 0.9) / 0.1);
	return { x: center.x, y: center.y, scale: mix(0.86, 1, fade), opacity: fade, spin: 0, travel: 0 };
};

export function poseAt(time) {
	const shot = shotOf(Math.max(0, time));
	const u = shot.local;
	const s = strikerS(u);
	const strikerAt = along(shot, s);
	const queen = queenState(u, shot.pocket);
	const impact = clamp((u - 0.36) / 0.16);
	const showImpact = u >= 0.36 && u < 0.52;
	const breathe = 0.45 + 0.4 * (0.5 + 0.5 * Math.sin(time * 0.0032));
	const sweep = (time % 3200) / 3200;

	return {
		striker: { x: strikerAt.x, y: strikerAt.y, spin: s * 28, scale: 1, opacity: 1 },
		queen,
		queenTrail: [1, 2].map((step) => {
			const past = queenState(Math.max(0, u - step * 0.035), shot.pocket);
			const visible = u > 0.38 && u < 0.8 && past.travel > 0.04;
			return {
				x: past.x,
				y: past.y,
				opacity: visible ? (0.28 - (step - 1) * 0.1) * past.opacity : 0,
			};
		}),
		ghosts: [1, 2, 3].map((step) => {
			const past = along(shot, strikerS(Math.max(0, u - step * 0.018)));
			const visible = u > 0.18 && u < 0.48;
			return {
				x: past.x,
				y: past.y,
				opacity: visible ? 0.16 - (step - 1) * 0.04 : 0,
			};
		}),
		flash: {
			x: shot.contact.x,
			y: shot.contact.y,
			r: 7 + impact * 18,
			opacity: showImpact ? (1 - impact) * 0.85 : 0,
		},
		sparks: [0, 1, 2, 3, 4].map((index) => {
			const angle = (index / 5) * Math.PI * 2 + shot.index * 0.6;
			const dist = 4 + easeOutQuart(impact) * 14;
			return {
				x: shot.contact.x + Math.cos(angle) * dist,
				y: shot.contact.y + Math.sin(angle) * dist,
				opacity: showImpact ? (1 - impact) * 0.9 : 0,
			};
		}),
		glows: pockets.map((_, index) => {
			if (index !== shot.index) return 0;
			const travel = u < 0.36 || u > 0.9 ? 0 : glide((Math.min(u, 0.86) - 0.36) / 0.42);
			const sink = u < 0.74 ? 1 : 1 - smoother((u - 0.74) / 0.16);
			return travel * sink * 0.85;
		}),
		halo: { opacity: breathe, offset: -(time * 0.16) },
		haloCool: { opacity: 0.35 + breathe * 0.35, offset: time * 0.11 },
		sheen: { x: -70 + sweep * 280, opacity: Math.sin(sweep * Math.PI) * 0.34 },
	};
}

export function pieceTransform(piece) {
	const spin = piece.spin || 0;
	const scale = piece.scale ?? 1;
	return `translate(${piece.x} ${piece.y}) rotate(${spin}) scale(${scale})`;
}
