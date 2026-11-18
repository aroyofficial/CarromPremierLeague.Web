export const FIREWORK_COLOURS = ["#f5b82e", "#ffd166", "#fffdf8", "#e63946", "#ffffff"];

const SPARKS = 36;

/** A shell launched from the bottom of the page toward a point in the sky. */
export const rocketLaunch = ({ width, height, index }) => {
	const slot = index % 5;
	const targetY = height * (0.16 + (index % 3) * 0.08);
	return {
		x: width * (0.16 + slot * 0.17),
		y: height,
		targetY,
		vy: -Math.max(4, (height - targetY) / 36),
		colour: FIREWORK_COLOURS[index % FIREWORK_COLOURS.length],
		reach: Math.max(70, Math.min(width, height) * 0.12),
	};
};

export const stepRocket = (rocket) => {
	const y = rocket.y + rocket.vy;
	return { ...rocket, y, done: y <= rocket.targetY };
};

/** Sparks leave the burst point in every direction, then fall. */
export const explode = (rocket, count = SPARKS) =>
	Array.from({ length: count }, (_, i) => {
		const angle = (Math.PI * 2 * i) / count;
		const speed = (1.4 + (i % 6) * 0.35) * ((rocket.reach || 70) / 70);
		return {
			x: rocket.x,
			y: rocket.targetY,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			life: 1,
			decay: 0.012 + (i % 4) * 0.004,
			colour: i % 7 === 0 ? "#ffffff" : rocket.colour,
		};
	});

export const stepSpark = (spark) => ({
	...spark,
	x: spark.x + spark.vx,
	y: spark.y + spark.vy,
	vx: spark.vx * 0.985,
	vy: spark.vy * 0.985 + 0.035,
	life: spark.life - spark.decay,
});
