function toggleMenu() {
	const navLinks = document.getElementById('nav-links');
	const body = document.body;
	navLinks.classList.toggle('open');
	body.classList.toggle('menu-open');
}
