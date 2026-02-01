const tableBody = document.getElementById("leagueTableBody");
const seasonSelect = document.getElementById("seasonSelect");
const loading = document.getElementById("loading");

async function populateSeasons() {
	try {
		const seasons = await fetchSeasons();

		seasonSelect.innerHTML = "";

		seasons.forEach((season) => {
			const option = document.createElement("option");
			option.value = season.id;
			option.textContent = season.name;
			seasonSelect.appendChild(option);
		});

		if (seasons.length > 0) {
			loadLeagueTable(seasons[0].id);
		}
	} catch (error) {
		console.error("Failed to load seasons", error);
	}
}

async function loadLeagueTable(seasonId) {
	try {
		loading.classList.remove("d-none");
		tableBody.innerHTML = "";

		const standings = await fetchLeagueTable(seasonId);

		standings.forEach((team, index) => {
			const row = `
                <tr>
                    <td>${index + 1}</td>
                    <td class="fw-semibold">${team.team_name}</td>
                    <td>${team.matches_played}</td>
                    <td>${team.wins}</td>
                    <td class="fw-bold text-primary">${team.points}</td>
                    <td>${team.net_points ?? 0}</td>
                </tr>
            `;
			tableBody.innerHTML += row;
		});
	} catch (error) {
		tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-danger">
                    Failed to load data
                </td>
            </tr>
        `;
	} finally {
		loading.classList.add("d-none");
	}
}

seasonSelect.addEventListener("change", () => {
	loadLeagueTable(seasonSelect.value);
});

populateSeasons();
