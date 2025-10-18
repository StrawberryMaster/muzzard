export function initCracita() {
    const cracitaPage = document.getElementById('page-cracita');
    if (!cracitaPage) {
        return;
    }

    const inputText = document.getElementById('cracita-inputText');
    const outputText = document.getElementById('cracita-outputText');
    const loadBtn = document.getElementById('cracita-loadBtn');
    const saveBtn = document.getElementById('cracita-saveBtn');
    const copyBtn = document.getElementById('cracita-copyBtn');
    const fileInput = document.getElementById('cracita-fileInput');
    const statusField = document.getElementById('cracita-statusField');
    const statsField = document.getElementById('cracita-statsField');
    const modeSelect = document.getElementById('cracita-mode-select');
    const regexControls = document.getElementById('cracita-regex-controls');
    const regexInput = document.getElementById('cracita-regex-input');

    let conversionTimer = null;

    const applyTypographicRules = (text) => {
        if (!text) return "";
        let newText = text.replace(/--/g, '—').replace(/\.\.\./g, '…');
        newText = newText.replace(/(^|\W)'/g, '$1‘');
        newText = newText.replace(/'/g, '’');
        const lines = newText.split('\n');
        const processedLines = lines.map(line => {
            let isDoubleOpen = true;
            return line.replace(/[“”"]/g, () => {
                const quote = isDoubleOpen ? '“' : '”';
                isDoubleOpen = !isDoubleOpen;
                return quote;
            });
        });
        return processedLines.join('\n');
    };
    
    const performConversion = () => {
        const mode = modeSelect.value;
        const input = inputText.value;
        let output = "";

        if (mode === 'Normal') {
            output = applyTypographicRules(input);
            statusField.textContent = "Auto-converted";
        } else if (mode === 'Regex') {
            if (!regexInput.value) {
                outputText.value = input;
                statusField.textContent = "Ready for regex pattern...";
                return;
            }
            try {
                const regex = new RegExp(regexInput.value, 'gs');
                output = input.replace(regex, (match, ...groups) => {
                    const captures = groups.slice(0, -2);
                    if (captures.length > 1) {
                        const pre = captures[0] || '';
                        const content = captures[1] || '';
                        const post = captures.slice(2).join('');
                        const convertedContent = applyTypographicRules(content);
                        return `${pre}${convertedContent}${post}`;
                    }
                    return match;
                });
                statusField.textContent = "Targeted conversion complete.";
            } catch (e) {
                output = `Regex Error: ${e.message}\n\n${input}`;
                statusField.textContent = "Zoinks! Error in regex pattern.";
            }
        }
        
        outputText.value = output;
        localStorage.setItem('cracita-text', inputText.value);
    };

    const updateStats = () => {
        const text = inputText.value;
        const wordCount = (text.match(/\b[\w'-]+\b/gu) || []).length;
        statsField.textContent = `Words: ${wordCount} | Chars: ${text.length}`;
    };

    const onTextChange = () => {
        clearTimeout(conversionTimer);
        conversionTimer = setTimeout(() => {
            performConversion();
            updateStats();
        }, 300);
    };

    modeSelect.addEventListener('change', () => {
        if (modeSelect.value === 'Regex') {
            regexControls.classList.remove('hidden');
            regexControls.classList.add('flex');
            if (!regexInput.value) {
                regexInput.value = '("description":\\s*")(.+?)(")';
            }
        } else {
            regexControls.classList.add('hidden');
            regexControls.classList.remove('flex');
        }
        performConversion();
    });

    regexInput.addEventListener('input', onTextChange);

    const loadFile = () => fileInput.click();
    const saveFile = () => {
        const textToSave = outputText.value;
        const blob = new Blob([textToSave], { type: "text/plain" });
        saveAs(blob, "converted_text.txt");
        statusField.textContent = "File saved successfully.";
    };
    const copyToClipboard = () => {
        if (!outputText.value) {
            statusField.textContent = "Nothing to copy.";
            return;
        }
        navigator.clipboard.writeText(outputText.value).then(() => {
            statusField.textContent = "Output copied to clipboard!";
        });
    };
    
    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            inputText.value = e.target.result;
            onTextChange();
            statusField.textContent = `Loaded: ${file.name}`;
        };
        reader.readAsText(file);
    };

    const loadSettings = () => {
        const savedText = localStorage.getItem('cracita-text') || '';
        if (savedText) {
            inputText.value = savedText;
            onTextChange();
        }
    };

    inputText.addEventListener('input', onTextChange);
    loadBtn.addEventListener('click', loadFile);
    saveBtn.addEventListener('click', saveFile);
    copyBtn.addEventListener('click', copyToClipboard);
    fileInput.addEventListener('change', handleFileSelect);

    document.addEventListener('keydown', (e) => {
        if (cracitaPage.classList.contains('hidden')) return;
        if (e.ctrlKey) {
            switch (e.key.toLowerCase()) {
                case 'o': e.preventDefault(); loadFile(); break;
                case 's': e.preventDefault(); saveFile(); break;
                case 'c': e.preventDefault(); copyToClipboard(); break;
            }
        }
    });

    loadSettings();
}