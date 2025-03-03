// Updates the theme icon based on the current theme.
function updateThemeIcon() {
	const theme = document.documentElement.getAttribute('data-theme');
	const iconElement = document.getElementById('theme-icon');
	if (theme === 'dark') {
		// Moon icon for dark theme.
		iconElement.innerHTML = `
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" class="icon-moon">
				<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"></path>
			</svg>
		`;
	} else {
		// Sun icon for light theme (using your existing SVG code).
		iconElement.innerHTML = `
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 32 32" fill="currentColor" class="icon-theme-toggle">
				<clipPath id="theme-toggle-cutout">
					<path d="M0-11h25a1 1 0 0017 13v30H0Z"></path>
				</clipPath>
				<g clip-path="url(#theme-toggle-cutout)">
					<circle cx="16" cy="16" r="8.4"></circle>
					<path d="M18.3 3.2c0 1.3-1 2.3-2.3 2.3s-2.3-1-2.3-2.3S14.7.9 16 .9s2.3 1 2.3 2.3zm-4.6 25.6c0-1.3 1-2.3 2.3-2.3s2.3 1 2.3 2.3-1 2.3-2.3 2.3-2.3-1-2.3-2.3zm15.1-10.5c-1.3 0-2.3-1-2.3-2.3s1-2.3 2.3-2.3 2.3 1 2.3 2.3-1 2.3-2.3 2.3zM3.2 13.7c1.3 0 2.3 1 2.3 2.3s-1 2.3-2.3 2.3S.9 17.3.9 16s1-2.3 2.3-2.3zm5.8-7C9 7.9 7.9 9 6.7 9S4.4 8 4.4 6.7s1-2.3 2.3-2.3S9 5.4 9 6.7zm16.3 21c-1.3 0-2.3-1-2.3-2.3s1-2.3 2.3-2.3 2.3 1 2.3 2.3-1 2.3-2.3 2.3zm2.4-21c0 1.3-1 2.3-2.3 2.3S23 7.9 23 6.7s1-2.3 2.3-2.3 2.4 1 2.4 2.3zM6.7 23C8 23 9 24 9 25.3s-1 2.3-2.3 2.3-2.3-1-2.3-2.3 1-2.3 2.3-2.3z"></path>
				</g>
			</svg>
		`;
	}
}

// Check for a saved theme on load (default to dark if none)
const storedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', storedTheme);
document.addEventListener('DOMContentLoaded', updateThemeIcon);

// Toggle theme and update icon
function toggleTheme() {
	const currentTheme = document.documentElement.getAttribute('data-theme');
	const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
	document.documentElement.setAttribute('data-theme', newTheme);
	localStorage.setItem('theme', newTheme);
	updateThemeIcon();
}