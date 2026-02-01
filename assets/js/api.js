const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function setCache(key, data) {
	const payload = {
		data: data,
		expiry: Date.now() + CACHE_DURATION,
	};
	localStorage.setItem(key, JSON.stringify(payload));
}

function getCache(key) {
	const cached = localStorage.getItem(key);
	if (!cached) return null;

	const payload = JSON.parse(cached);

	if (Date.now() > payload.expiry) {
		localStorage.removeItem(key);
		return null;
	}

	return payload.data;
}

async function fetchSeasons() {
	const cached = getCache("seasons");
	if (cached) return cached;

	const response = await fetch(`${API_BASE_URL}/seasons`);
	const result = await response.json();

	if (!result.success) {
		throw new Error(result.message);
	}

	setCache("seasons", result.data);
	return result.data;
}

async function fetchLeagueTable(seasonId) {
	const response = await fetch(
		`${API_BASE_URL}/seasons/${seasonId}/league-table`,
	);
	const result = await response.json();

	if (!result.success) {
		throw new Error(result.message);
	}

	return result.data.standings;
}
