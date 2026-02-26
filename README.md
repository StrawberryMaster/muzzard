# muzzard
It downloads files.

## Structure

- `index.html`: UI markup for all pages in the suite.
- `muzzard.js`: app bootstrap/entrypoint.
- `navigation.js`: single-page navigation (`data-page` links).
- `muzzard-downloader.js`: downloader/import logic for the Muzzard page.
- `cracita.js`: typographic converter module.
- `sorbet.js`: text diff/comparison module.
- `utils.js`: shared browser helpers (`byId`, `sleep`, `debounce`, `throttle`, text/status setters).

## Maintenance notes

- Keep page-specific behavior inside its own module.
- Register all module initializers in `muzzard.js`.
- Reuse `data-page` + `#page-*` naming when adding pages.