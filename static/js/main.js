document.addEventListener('DOMContentLoaded', () => {
    // Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const html = document.documentElement;

    const savedTheme = localStorage.getItem('theme') || 'light';
    html.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });

    function updateThemeIcon(theme) {
        if (theme === 'dark') {
            themeIcon.setAttribute('data-lucide', 'moon');
        } else {
            themeIcon.setAttribute('data-lucide', 'sun');
        }
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    // Search Overlay
    const searchToggle = document.getElementById('search-toggle');
    const searchOverlay = document.getElementById('search-overlay');
    const searchClose = document.getElementById('search-close');
    const searchInput = searchOverlay.querySelector('.search-input');

    searchToggle.addEventListener('click', () => {
        searchOverlay.classList.remove('hidden');
        searchInput.focus();
    });

    searchClose.addEventListener('click', () => {
        searchOverlay.classList.add('hidden');
    });

    // Mobile Menu
    const menuToggle = document.getElementById('menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    const menuClose = document.getElementById('menu-close');

    menuToggle.addEventListener('click', () => {
        mobileMenu.classList.remove('hidden');
    });

    menuClose.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
    });

    // Close on ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchOverlay.classList.add('hidden');
            mobileMenu.classList.add('hidden');
        }
    });
});
