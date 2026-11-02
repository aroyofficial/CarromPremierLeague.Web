// Runs API writes one at a time, in the order they were requested.
// A task queued under a key that is still waiting is merged into it, because the task reads
// the latest state when it runs; the newest change is saved once instead of once per click.
export const createRequestQueue = () => {
	let tail = Promise.resolve();
	const waiting = new Map();

	const enqueue = (task, key) => {
		if (key && waiting.has(key)) return waiting.get(key);
		const run = tail.then(() => {
			if (key) waiting.delete(key);
			return task();
		});
		if (key) waiting.set(key, run);
		tail = run.catch(() => undefined);
		return run;
	};

	return {
		enqueue,
		idle: () => tail,
	};
};

const matchQueues = new Map();

// One queue per match outlives the component, so leaving and reopening the page keeps the order.
export const matchQueue = (matchId) => {
	if (!matchQueues.has(matchId)) matchQueues.set(matchId, createRequestQueue());
	return matchQueues.get(matchId);
};
