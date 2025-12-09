export function initCracita() {
    const cracitaPage = document.getElementById('page-cracita');
    if (!cracitaPage) return;

    const els = {
        input: document.getElementById('cracita-inputText'),
        output: document.getElementById('cracita-outputText'),
        loadBtn: document.getElementById('cracita-loadBtn'),
        saveBtn: document.getElementById('cracita-saveBtn'),
        copyBtn: document.getElementById('cracita-copyBtn'),
        fileInput: document.getElementById('cracita-fileInput'),
        status: document.getElementById('cracita-statusField'),
        stats: document.getElementById('cracita-statsField'),
        mode: document.getElementById('cracita-mode-select'),
        regexControls: document.getElementById('cracita-regex-controls'),
        regexInput: document.getElementById('cracita-regex-input')
    };

    let conversionTimer = null;

    const applyTypographicRules = (text) => {
        if (!text) return "";

        return text
            .replace(/---/g, '—')
            .replace(/--/g, '—')
            .replace(/\.\.\./g, '…')

            .replace(/((?:^|[\s(\[{]))"/g, '$1“')
            .replace(/"/g, '”')

            .replace(/'(?=\d{2}s)/g, '’')

            .replace(/((?:^|[\s(\[{]))'/g, '$1‘')
            .replace(/'/g, '’');
    };

    const performConversion = () => {
        const mode = els.mode.value;
        const input = els.input.value;
        let output = "";

        if (mode === 'Normal') {
            output = applyTypographicRules(input);
            els.status.textContent = "Auto-converted";
        } else if (mode === 'Regex') {
            if (!els.regexInput.value) {
                els.output.value = input;
                els.status.textContent = "Waiting for pattern...";
                return;
            }
            try {
                const regex = new RegExp(els.regexInput.value, 'gs');

                output = input.replace(regex, (match, ...args) => {
                    const captures = args.slice(0, -2);

                    if (captures.length >= 2) {
                        const pre = captures[0] || '';
                        const content = captures[1] || '';
                        const post = captures.slice(2).join('');

                        return `${pre}${applyTypographicRules(content)}${post}`;
                    }
                    return match;
                });
                els.status.textContent = "Targeted conversion complete.";
            } catch (e) {
                output = input;
                els.status.textContent = `Regex error: ${e.message}`;
            }
        }

        els.output.value = output;
        localStorage.setItem('cracita-text', els.input.value);
    };

    const updateStats = () => {
        const text = els.input.value;
        const wordCount = (text.match(/\b[\w'-]+\b/gu) || []).length;
        els.stats.textContent = `Words: ${wordCount} | Chars: ${text.length}`;
    };

    const onTextChange = () => {
        clearTimeout(conversionTimer);
        conversionTimer = setTimeout(() => {
            performConversion();
            updateStats();
        }, 300);
    };

    els.mode.addEventListener('change', () => {
        const isRegex = els.mode.value === 'Regex';
        els.regexControls.classList.toggle('hidden', !isRegex);
        els.regexControls.classList.toggle('flex', isRegex);

        if (isRegex && !els.regexInput.value) {
            els.regexInput.value = '("description":\\s*")(.+?)(")';
        }
        performConversion();
    });

    els.regexInput.addEventListener('input', onTextChange);
    els.input.addEventListener('input', onTextChange);

    els.loadBtn.addEventListener('click', () => els.fileInput.click());

    els.saveBtn.addEventListener('click', () => {
        const blob = new Blob([els.output.value], { type: "text/plain" });
        if (typeof saveAs !== 'undefined') {
            saveAs(blob, "converted_text.txt");
            els.status.textContent = "File saved.";
        } else {
            console.error("FileSaver.js (saveAs) is missing.");
            els.status.textContent = "Error: Save dependency missing.";
        }
    });

    els.copyBtn.addEventListener('click', () => {
        if (!els.output.value) return;
        navigator.clipboard.writeText(els.output.value)
            .then(() => els.status.textContent = "Copied to clipboard!")
            .catch(() => els.status.textContent = "Copy failed.");
    });

    els.fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            els.input.value = ev.target.result;
            onTextChange();
            els.status.textContent = `Loaded: ${file.name}`;
            els.fileInput.value = '';
        };
        reader.readAsText(file);
    });

    document.addEventListener('keydown', (e) => {
        if (cracitaPage.classList.contains('hidden')) return;
        if ((e.ctrlKey || e.metaKey) && ['s', 'o', 'c'].includes(e.key.toLowerCase())) {
            e.preventDefault();
            if (e.key.toLowerCase() === 's') els.saveBtn.click();
            if (e.key.toLowerCase() === 'o') els.loadBtn.click();
        }
    });

    const savedText = localStorage.getItem('cracita-text');
    if (savedText) {
        els.input.value = savedText;
        onTextChange();
    }
}