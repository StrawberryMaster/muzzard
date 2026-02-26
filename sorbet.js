import { byId, debounce, throttle } from './utils.js';

export function initSorbet() {
    const sorbetPage = byId('page-sorbet');
    if (!sorbetPage) return;

    const text1El = byId('sorbet-text1');
    const text2El = byId('sorbet-text2');
    const file1InfoEl = byId('sorbet-file1Info');
    const file2InfoEl = byId('sorbet-file2Info');
    const diffPanelEl = byId('sorbet-diffPanel');
    const diffViewportEl = byId('sorbet-diffViewport');
    const diffContentEl = byId('sorbet-diffContent');
    const compareBtn = byId('sorbet-compareBtn');
    const swapBtn = byId('sorbet-swapBtn');
    const clearBtn = byId('sorbet-clearBtn');
    const perfStatsEl = byId('sorbet-performanceStats');
    const addedStatsEl = byId('sorbet-addedStats');
    const removedStatsEl = byId('sorbet-removedStats');
    const loadingOverlayEl = byId('sorbet-loadingOverlay');
    const loadingTextEl = byId('sorbet-loadingText');
    const progressBarEl = byId('sorbet-progressBar');

    const workerCode = `
        class OptimizedDiff {
            constructor() {
                this.hashCache = new Map();
            }

            hashLine(line) {
                if (this.hashCache.has(line)) {
                    return this.hashCache.get(line);
                }
                
                let hash = 5381;
                for (let i = 0; i < line.length; i++) {
                    hash = ((hash << 5) + hash) + line.charCodeAt(i);
                }
                
                this.hashCache.set(line, hash);
                return hash;
            }

            computeDiff(lines1, lines2, chunkSize = 1000) {
                const chunks = [];
                const totalChunks = Math.ceil(Math.max(lines1.length, lines2.length) / chunkSize);
                
                for (let chunk = 0; chunk < totalChunks; chunk++) {
                    const start1 = chunk * chunkSize;
                    const end1 = Math.min(start1 + chunkSize, lines1.length);
                    const start2 = chunk * chunkSize;
                    const end2 = Math.min(start2 + chunkSize, lines2.length);
                    
                    const chunk1 = lines1.slice(start1, end1);
                    const chunk2 = lines2.slice(start2, end2);
                    
                    const chunkDiff = this.myersDiff(chunk1, chunk2);
                    chunks.push({
                        diff: chunkDiff,
                        start1,
                        start2
                    });
                    
                    self.postMessage({
                        type: 'progress',
                        value: ((chunk + 1) / totalChunks) * 100
                    });
                }
                
                return this.mergeChunks(chunks);
            }

            myersDiff(a, b) {
                const n = a.length;
                const m = b.length;
                const max = n + m;
                const v = new Int32Array(2 * max + 1);
                const trace = [];
                
                for (let d = 0; d <= max; d++) {
                    trace.push(v.slice());
                    
                    for (let k = -d; k <= d; k += 2) {
                        let x;
                        if (k === -d || (k !== d && v[k - 1 + max] < v[k + 1 + max])) {
                            x = v[k + 1 + max];
                        } else {
                            x = v[k - 1 + max] + 1;
                        }
                        
                        let y = x - k;
                        
                        while (x < n && y < m && this.hashLine(a[x]) === this.hashLine(b[y])) {
                            x++;
                            y++;
                        }
                        
                        v[k + max] = x;
                        
                        if (x >= n && y >= m) {
                            return this.backtrack(a, b, trace, d);
                        }
                    }
                }
                
                return [];
            }

            backtrack(a, b, trace, d) {
                const result = [];
                let x = a.length;
                let y = b.length;
                
                for (let i = d; i >= 0; i--) {
                    const v = trace[i];
                    const k = x - y;
                    const max = a.length + b.length;
                    
                    let prevK;
                    if (k === -i || (k !== i && v[k - 1 + max] < v[k + 1 + max])) {
                        prevK = k + 1;
                    } else {
                        prevK = k - 1;
                    }
                    
                    const prevX = v[prevK + max];
                    const prevY = prevX - prevK;
                    
                    while (x > prevX && y > prevY) {
                        x--;
                        y--;
                        result.unshift({ type: 'equal', line: a[x], oldIndex: x, newIndex: y });
                    }
                    
                    if (i > 0) {
                        if (x > prevX) {
                            x--;
                            result.unshift({ type: 'delete', line: a[x], oldIndex: x });
                        } else if (y > prevY) {
                            y--;
                            result.unshift({ type: 'insert', line: b[y], newIndex: y });
                        }
                    }
                }
                
                return result;
            }

            mergeChunks(chunks) {
                const merged = [];
                for (const chunk of chunks) {
                    for (const item of chunk.diff) {
                        if (item.oldIndex !== undefined) {
                            item.oldIndex += chunk.start1;
                        }
                        if (item.newIndex !== undefined) {
                            item.newIndex += chunk.start2;
                        }
                        merged.push(item);
                    }
                }
                return merged;
            }
        }

        self.addEventListener('message', (e) => {
            const { text1, text2 } = e.data;
            
            try {
                const lines1 = text1.split('\\n');
                const lines2 = text2.split('\\n');
                
                self.postMessage({
                    type: 'status',
                    message: \`Comparing \${lines1.length} vs \${lines2.length} lines...\`
                });
                
                const differ = new OptimizedDiff();
                const diff = differ.computeDiff(lines1, lines2);
                
                let added = 0, removed = 0;
                diff.forEach(item => {
                    if (item.type === 'insert') added++;
                    else if (item.type === 'delete') removed++;
                });
                
                self.postMessage({
                    type: 'complete',
                    diff,
                    stats: { added, removed }
                });
            } catch (error) {
                self.postMessage({
                    type: 'error',
                    message: error.message
                });
            }
        });
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    let worker = null;

    class VirtualRenderer {
        constructor(container, viewport) {
            this.container = container;
            this.viewport = viewport;
            this.lineHeight = 18;
            this.visibleRange = { start: 0, end: 50 };
            this.diffData = [];
            this.renderBuffer = 20;
            this.viewport.addEventListener('scroll', throttle(this.render.bind(this), 16));
        }
        setDiff(diff) {
            this.diffData = diff;
            this.updateVisibleRange(true);
            this.render();
        }
        updateVisibleRange(forceFullRender = false) {
            const scrollTop = this.viewport.scrollTop;
            const viewportHeight = this.viewport.clientHeight;
            const newStart = Math.max(0, Math.floor(scrollTop / this.lineHeight) - this.renderBuffer);
            const newEnd = Math.min(this.diffData.length, Math.ceil((scrollTop + viewportHeight) / this.lineHeight) + this.renderBuffer);
            if (forceFullRender || newStart !== this.visibleRange.start || newEnd !== this.visibleRange.end) {
                this.visibleRange = { start: newStart, end: newEnd };
                return true;
            }
            return false;
        }
        render() {
            if (!this.updateVisibleRange() && this.container.children.length > 1) return;
            
            const fragment = document.createDocumentFragment();
            const topSpacer = document.createElement('div');
            topSpacer.style.height = `${this.visibleRange.start * this.lineHeight}px`;
            fragment.appendChild(topSpacer);

            for (let i = this.visibleRange.start; i < this.visibleRange.end; i++) {
                fragment.appendChild(this.createLineElement(this.diffData[i]));
            }

            const bottomSpacer = document.createElement('div');
            bottomSpacer.style.height = `${Math.max(0, (this.diffData.length - this.visibleRange.end) * this.lineHeight)}px`;
            fragment.appendChild(bottomSpacer);
            
            requestAnimationFrame(() => {
                this.container.innerHTML = '';
                this.container.appendChild(fragment);
            });
        }
        createLineElement(item) {
            const lineDiv = document.createElement('div');
            lineDiv.className = 'flex whitespace-pre';
            const numberSpan = document.createElement('span');
            numberSpan.className = 'w-12 text-right pr-4 text-gray-500 select-none flex-shrink-0';
            const contentSpan = document.createElement('span');
            contentSpan.className = 'flex-grow break-words whitespace-pre-wrap';

            if (item.type === 'delete') {
                lineDiv.classList.add('bg-red-100');
                contentSpan.classList.add('text-red-700', 'line-through');
                numberSpan.textContent = item.oldIndex + 1;
            } else if (item.type === 'insert') {
                lineDiv.classList.add('bg-green-100');
                contentSpan.classList.add('text-green-800');
                numberSpan.textContent = item.newIndex + 1;
            } else { // 'equal'
                numberSpan.textContent = item.oldIndex + 1;
            }
            contentSpan.textContent = item.line || '';
            lineDiv.appendChild(numberSpan);
            lineDiv.appendChild(contentSpan);
            return lineDiv;
        }
    }
    const virtualRenderer = new VirtualRenderer(diffContentEl, diffViewportEl);

    function updateFileInfo() {
        const text1 = text1El.value;
        const text2 = text2El.value;
        file1InfoEl.textContent = `${(text1.match(/\n/g) || []).length + 1} lines, ${(new Blob([text1]).size / 1024).toFixed(1)} KB`;
        file2InfoEl.textContent = `${(text2.match(/\n/g) || []).length + 1} lines, ${(new Blob([text2]).size / 1024).toFixed(1)} KB`;
    }

    function startComparison() {
        if (!text1El.value && !text2El.value) { return; }
        updateFileInfo();
        
        loadingOverlayEl.classList.remove('hidden');
        loadingOverlayEl.classList.add('flex');
        compareBtn.disabled = true;
        progressBarEl.style.width = '0%';
        const startTime = performance.now();
        if (worker) worker.terminate();
        worker = new Worker(workerUrl);
        
        worker.addEventListener('message', ({ data }) => {
            switch (data.type) {
                case 'progress':
                    progressBarEl.style.width = `${data.value}%`;
                    break;
                case 'status':
                    loadingTextEl.textContent = data.message;
                    break;
                case 'complete':
                    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
                    perfStatsEl.textContent = `${duration}s`;
                    addedStatsEl.textContent = `${data.stats.added} added`;
                    removedStatsEl.textContent = `${data.stats.removed} removed`;
                    diffPanelEl.classList.remove('hidden');
                    virtualRenderer.setDiff(data.diff);
                    loadingOverlayEl.classList.add('hidden');
                    loadingOverlayEl.classList.remove('flex');
                    compareBtn.disabled = false;
                    break;
                case 'error':
                    alert(`Worker error: ${data.message}`);
                    loadingOverlayEl.classList.add('hidden');
                    loadingOverlayEl.classList.remove('flex');
                    compareBtn.disabled = false;
                    break;
            }
        });
        
        worker.postMessage({ text1: text1El.value, text2: text2El.value });
    }

    function swapTexts() {
        [text1El.value, text2El.value] = [text2El.value, text1El.value];
        updateFileInfo();
    }

    function clearAll() {
        text1El.value = '';
        text2El.value = '';
        diffPanelEl.classList.add('hidden');
        perfStatsEl.textContent = 'Ready';
        addedStatsEl.textContent = '0 added';
        removedStatsEl.textContent = '0 removed';
        updateFileInfo();
    }

    compareBtn.addEventListener('click', startComparison);
    swapBtn.addEventListener('click', swapTexts);
    clearBtn.addEventListener('click', clearAll);
    text1El.addEventListener('input', debounce(updateFileInfo, 300));
    text2El.addEventListener('input', debounce(updateFileInfo, 300));

    document.addEventListener('keydown', (e) => {
        if (sorbetPage.classList.contains('hidden')) return;
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'Enter') { e.preventDefault(); startComparison(); }
        }
    });

    updateFileInfo();
}