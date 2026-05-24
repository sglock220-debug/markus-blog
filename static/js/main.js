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

    if (searchToggle) {
        searchToggle.addEventListener('click', () => {
            searchOverlay.classList.remove('hidden');
            if (searchInput) searchInput.focus();
        });
    }

    if (searchClose) {
        searchClose.addEventListener('click', () => {
            searchOverlay.classList.add('hidden');
        });
    }

    // Sidebar Menu
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar-menu');
    const sidebarClose = document.getElementById('sidebar-close');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    function openSidebar() {
        sidebar.classList.add('active');
        sidebarOverlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }

    function closeSidebar() {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.add('hidden');
        document.body.style.overflow = ''; // Restore scrolling
    }

    if (menuToggle) {
        menuToggle.addEventListener('click', openSidebar);
    }

    if (sidebarClose) {
        sidebarClose.addEventListener('click', closeSidebar);
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }

    // Close on ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (searchOverlay) searchOverlay.classList.add('hidden');
            closeSidebar();
        }
    });
});
