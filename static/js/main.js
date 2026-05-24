document.addEventListener('DOMContentLoaded', () => {
    // Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const html = document.documentElement;

    const savedTheme = localStorage.getItem('theme') || 'light';
    html.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
        });
    }

    function updateThemeIcon(theme) {
        if (!themeIcon) return;
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
    const searchInput = searchOverlay ? searchOverlay.querySelector('.search-input') : null;

    if (searchToggle && searchOverlay) {
        searchToggle.addEventListener('click', () => {
            searchOverlay.classList.remove('hidden');
            if (searchInput) searchInput.focus();
        });
    }

    if (searchClose && searchOverlay) {
        searchClose.addEventListener('click', () => {
            searchOverlay.classList.add('hidden');
        });
    }

    // Sidebar Menu
    const menuToggle = document.getElementById('menuToggle');
    const sideMenu = document.getElementById('sideMenu');
    const sideOverlay = document.getElementById('sideOverlay');
    const sideClose = document.getElementById('sidebar-close');

    if (!menuToggle || !sideMenu || !sideOverlay) {
        console.warn("Side menu elements not found");
    } else {
        function openMenu() {
            sideMenu.classList.add("active");
            sideOverlay.classList.add("active");
            document.body.classList.add("menu-open");
        }

        function closeMenu() {
            sideMenu.classList.remove("active");
            sideOverlay.classList.remove("active");
            document.body.classList.remove("menu-open");
        }

        function toggleMenu(event) {
            event.stopPropagation();
            if (sideMenu.classList.contains("active")) {
                closeMenu();
            } else {
                openMenu();
            }
        }

        menuToggle.addEventListener("click", toggleMenu);
        sideOverlay.addEventListener("click", closeMenu);
        if (sideClose) sideClose.addEventListener("click", closeMenu);

        sideMenu.addEventListener("click", function (event) {
            event.stopPropagation();
        });

        document.querySelectorAll(".side-menu a").forEach(function (link) {
            link.addEventListener("click", closeMenu);
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                if (searchOverlay) searchOverlay.classList.add('hidden');
                closeMenu();
            }
        });
    }
});
