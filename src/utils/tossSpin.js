// A toss lasts five to eight seconds and lands on one of the two teams.
export function tossPlan(random = Math.random) {
	const duration = 5000 + Math.floor(random() * 3001);
	const winner = random() < 0.5 ? 1 : 2;
	const spins = 10 + Math.floor(random() * 6);
	const endAngle = spins * 360 + (winner === 2 ? 180 : 0);
	return { duration, winner, endAngle };
}

export function tossFrameState(plan, elapsed) {
	const t = Math.min(1, Math.max(0, elapsed / plan.duration));
	const eased = 1 - (1 - t) ** 3;
	return {
		angle: plan.endAngle * eased,
		lift: Math.sin(Math.PI * t) * 28,
		done: t >= 1,
	};
}
