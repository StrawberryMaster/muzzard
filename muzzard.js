import { initPageNavigation } from './navigation.js';
import { initMuzzardDownloader } from './muzzard-downloader.js';
import { initCracita } from './cracita.js';
import { initSorbet } from './sorbet.js';

document.addEventListener('DOMContentLoaded', () => {
    initPageNavigation();
    initMuzzardDownloader();
    initCracita();
    initSorbet();
});
