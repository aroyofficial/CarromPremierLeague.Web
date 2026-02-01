async function loadComponent(id, filePath) {
	const response = await fetch(filePath);
	const html = await response.text();
	document.getElementById(id).innerHTML = html;
}

document.addEventListener("DOMContentLoaded", async () => {
	await loadComponent("navbar", "/assets/components/navbar.html");
	await loadComponent("footer", "/assets/components/footer.html");

	const yearElement = document.getElementById("currentYear");
	if (yearElement) {
		yearElement.textContent = new Date().getFullYear();
	}
});
