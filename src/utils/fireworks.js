export const FIREWORK_COLOURS = ["#f6c445", "#ff4b3a", "#4da3ff", "#3ddc97", "#ff8a1e", "#d56bff", "#fff6d0"];

const SPARKS = 42;
const GRAVITY = 0.015;
const DRAG = 0.993;

/** A later shell waits until every earlier ray has faded to this life. */
export const FADED_BURST = 0.22;

const unit = (index) => {
	const n = Math.sin(index * 12.9898) * 43758.5453;
	return n - Math.floor(n);
};

const frameStep = (dt = 1) => Math.min(Math.max(dt, 0), 2);

/** Keep the burst point and a sampled arc so the drawn ray can bend. */
const rememberPath = (trail, point) => {
	const next = trail.concat(point);
	if (next.length <= 96) return next;
	const kept = [];
	for (let i = 0; i < next.length; i += 2) kept.push(next[i]);
	const last = next[next.length - 1];
	if (kept[kept.length - 1] !== last) kept.push(last);
	return kept;
};

/** A shell launched from the bottom of the page toward its own point in the sky. */
export const rocketLaunch = ({ width, height, index, across }) => {
	const spread = across == null ? (index * 0.61803398875) % 1 : across;
	const lift = (index * 0.41421356237) % 1;
	const margin = Math.min(0.22, Math.max(0.12, 110 / Math.max(width, 1)));
	const hubX = width * (margin + spread * (1 - margin * 2));
	const highest = height / 3;
	const lowest = height * (2 / 3);
	const targetY = highest + lift * (lowest - highest);
	const turn = index % 2 === 0 ? 1 : -1;
	return {
		x: hubX,
		y: height,
		hubX,
		launchY: height,
		targetY,
		vy: -Math.max(8, (height - targetY) / 34),
		spin: Math.PI / 2,
		spinSpeed: turn * ((Math.PI * 2 * 2) / 34),
		coil: 11 + unit(index + 8) * 3,
		colour: FIREWORK_COLOURS[index % FIREWORK_COLOURS.length],
		reach: Math.max(88, Math.min(width, height) * (0.1 + lift * 0.03)),
		trail: [],
	};
};

export const stepRocket = (rocket, dt = 1) => {
	const step = frameStep(dt);
	const samples = Math.max(1, Math.ceil(step * 5));
	const slice = step / samples;
	let spin = rocket.spin || 0;
	let y = rocket.y;
	let x = rocket.x;
	let trail = rocket.trail || [];
	const launchY = rocket.launchY ?? rocket.y;
	const spanY = launchY - rocket.targetY;
	for (let i = 0; i < samples; i += 1) {
		spin += (rocket.spinSpeed || 0) * slice;
		y += rocket.vy * slice;
		const risen = launchY - y;
		const progress = spanY > 0 ? Math.min(1, Math.max(0, risen / spanY)) : 1;
		const radius = (rocket.coil || 0) * (1 - progress * 0.7);
		x = (rocket.hubX ?? x) + Math.cos(spin) * radius;
		trail = trail.concat({ x, y });
	}
	return { ...rocket, x, y, spin, launchY, trail: trail.slice(-200), done: y <= rocket.targetY };
};

/** One even ring of rays. Length varies a little so the flower stays round. */
export const explode = (rocket, count = SPARKS) =>
	Array.from({ length: count }, (_, i) => {
		const angle = (Math.PI * 2 * i) / count;
		const depth = 0.86 + unit(i + 1) * 0.14;
		const speed = 2.15 * depth * ((rocket.reach || 100) / 100);
		const burstX = rocket.x;
		const burstY = rocket.y ?? rocket.targetY;
		return {
			x: burstX,
			y: burstY,
			originX: burstX,
			originY: burstY,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			life: 1,
			decay: 0.0052,
			size: 1.2,
			colour: rocket.colour,
			trail: [{ x: burstX, y: burstY }],
		};
	});

/**
 * One shell at a time. The next one leaves the ground only after the last
 * burst has thinned out, so two flowers never cover the same words.
 */
export const shellsToLaunch = ({ rockets = [], sparks = [] } = {}) => {
	if (rockets.length > 0) return 0;
	if (sparks.some((spark) => spark.life > FADED_BURST)) return 0;
	return 1;
};

export const stepSpark = (spark, dt = 1) => {
	const step = frameStep(dt);
	const drag = Math.pow(DRAG, step);
	const x = spark.x + spark.vx * step;
	const y = spark.y + spark.vy * step;
	return {
		...spark,
		x,
		y,
		vx: spark.vx * drag,
		vy: spark.vy * drag + GRAVITY * step,
		life: spark.life - spark.decay * step,
		trail: rememberPath(spark.trail || [{ x: spark.originX, y: spark.originY }], { x, y }),
	};
};
