import { byId, createStatusSetter, debounce } from './utils.js';

export function initCracita() {
    const cracitaPage = byId('page-cracita');
    if (!cracitaPage) return;

    const els = {
        input: byId('cracita-inputText'),
        output: byId('cracita-outputText'),
        loadBtn: byId('cracita-loadBtn'),
        saveBtn: byId('cracita-saveBtn'),
        copyBtn: byId('cracita-copyBtn'),
        fileInput: byId('cracita-fileInput'),
        status: byId('cracita-statusField'),
        stats: byId('cracita-statsField'),
        mode: byId('cracita-mode-select'),
        regexControls: byId('cracita-regex-controls'),
        regexInput: byId('cracita-regex-input')
    };
    const setStatus = createStatusSetter(els.status);

    const isQuoteBoundary = (character) => character === '' || /[\s([\{<:;!?—–-]/.test(character);
    const isWordCharacter = (character) => /[\p{L}\p{N}]/u.test(character);
    const isLowercaseLetter = (character) => /\p{Ll}/u.test(character);

    const getQuoteFamily = (character) => {
        if (character === '"' || character === '“' || character === '”') return 'double';
        if (character === "'" || character === '‘' || character === '’') return 'single';
        return null;
    };

    const hasLaterQuote = (value, startIndex, family) => {
        for (let index = startIndex; index < value.length; index += 1) {
            const quoteFamily = getQuoteFamily(value[index]);
            if (quoteFamily === family) {
                return true;
            }
        }

        return false;
    };

    const htmlParser = typeof DOMParser !== 'undefined' ? new DOMParser() : null;
    const preservedHtmlTags = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'PRE', 'CODE']);
    const textNodeFilter = typeof NodeFilter !== 'undefined' ? NodeFilter.SHOW_TEXT : 4;

    const createTypographicTransformer = () => {
        const quoteState = {
            insideDoubleQuote: false,
            insideSingleQuote: false
        };

        return (text) => {
            if (!text) return "";

            const normalizeSmartQuotes = (value) => {
                let result = "";

                for (let index = 0; index < value.length;) {
                    const character = value[index];
                    const family = getQuoteFamily(character);

                    if (!family) {
                        result += character;
                        index += 1;
                        continue;
                    }

                    while (index < value.length && getQuoteFamily(value[index]) === family) {
                        index += 1;
                    }

                    const previousCharacter = result[result.length - 1] || '';
                    const nextCharacter = value[index] || '';

                    if (family === 'single' && isWordCharacter(previousCharacter) && isWordCharacter(nextCharacter)) {
                        result += '’';
                        continue;
                    }

                    if (family === 'single' && isQuoteBoundary(previousCharacter) && isLowercaseLetter(nextCharacter)) {
                        const looksLikeOpeningQuote = hasLaterQuote(value, index, family);

                        if (looksLikeOpeningQuote) {
                            const opensQuote = !quoteState.insideSingleQuote;

                            result += opensQuote ? '‘' : '’';
                            quoteState.insideSingleQuote = opensQuote;
                        } else {
                            result += '’';
                        }

                        continue;
                    }

                    if (family === 'single') {
                        const opensQuote = !quoteState.insideSingleQuote && isQuoteBoundary(previousCharacter);

                        result += opensQuote ? '‘' : '’';
                        quoteState.insideSingleQuote = opensQuote;
                        continue;
                    }

                    const opensQuote = !quoteState.insideDoubleQuote && isQuoteBoundary(previousCharacter);

                    result += opensQuote ? '“' : '”';
                    quoteState.insideDoubleQuote = opensQuote;
                }

                return result;
            };

            return normalizeSmartQuotes(text)
                .replace(/---/g, '—')
                .replace(/--/g, '—')
                .replace(/\.\.\./g, '…')
                .replace(/'(?=\d{2}s)/g, '’')
                .replace(/((?:^|[\s(\[{>]))'/g, '$1‘')
                .replace(/'/g, '’');
        };
    };

    const applyTypographicRules = (text) => createTypographicTransformer()(text);

    const applyTypographicRulesToHtml = (html) => {
        if (!htmlParser) return applyTypographicRules(html);
        const quoteTransformer = createTypographicTransformer();

        const document = htmlParser.parseFromString(html, 'text/html');
        const walker = document.createTreeWalker(document.body, textNodeFilter);
        const textNodes = [];

        while (walker.nextNode()) {
            const node = walker.currentNode;
            const parentTagName = node.parentElement?.tagName;

            if (parentTagName && preservedHtmlTags.has(parentTagName)) {
                continue;
            }

            textNodes.push(node);
        }

        for (const node of textNodes) {
            node.textContent = quoteTransformer(node.textContent || '');
        }

        return document.body.innerHTML;
    };

    const convertText = (text) => {
        const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(text);
        return looksLikeHtml ? applyTypographicRulesToHtml(text) : applyTypographicRules(text);
    };

    const performConversion = () => {
        const mode = els.mode.value;
        const input = els.input.value;
        let output = "";

        if (mode === 'Normal') {
            output = convertText(input);
            setStatus("Auto-converted");
        } else if (mode === 'Regex') {
            if (!els.regexInput.value) {
                els.output.value = input;
                setStatus("Waiting for pattern...");
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

                        return `${pre}${convertText(content)}${post}`;
                    }
                    return match;
                });
                setStatus("Targeted conversion complete.");
            } catch (e) {
                output = input;
                setStatus(`Regex error: ${e.message}`);
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

    const onTextChange = debounce(() => {
        performConversion();
        updateStats();
    }, 300);

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
            setStatus("File saved.");
        } else {
            console.error("FileSaver.js (saveAs) is missing.");
            setStatus("Error: Save dependency missing.");
        }
    });

    els.copyBtn.addEventListener('click', () => {
        if (!els.output.value) return;
        const originalLabel = els.copyBtn.textContent;

        navigator.clipboard.writeText(els.output.value)
            .then(() => {
                setStatus("Copied to clipboard!");
                els.copyBtn.textContent = "Copied!";
                window.setTimeout(() => {
                    els.copyBtn.textContent = originalLabel;
                }, 1200);
            })
            .catch(() => setStatus("Copy failed."));
    });

    els.fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            els.input.value = ev.target.result;
            onTextChange();
            setStatus(`Loaded: ${file.name}`);
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