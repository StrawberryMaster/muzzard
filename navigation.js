import { byId } from './utils.js';

export function initPageNavigation() {
    const pageContainer = byId('page-container');
    if (!pageContainer) return;

    const pages = pageContainer.querySelectorAll('section[id^="page-"]');
    const navLinks = document.querySelectorAll('a[data-page]');

    const navigate = (pageName) => {
        pages.forEach(page => {
            if (page.id === `page-${pageName}`) {
                page.classList.remove('hidden');
            } else {
                page.classList.add('hidden');
            }
        });
        window.scrollTo(0, 0);
    };

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageName = link.getAttribute('data-page');
            if (pageName) {
                navigate(pageName);
            }
        }, { passive: false });
    });

    return {
        navigate
    };
}
