import { byId, createStatusSetter, debounce, sleep } from './utils.js';

export function initMuzzardDownloader() {
    const urlsTextarea = byId('urls-textarea');
    const downloadBtn = byId('download-btn');
    const statusBox = byId('status-box');
    const zipCheckbox = byId('zip-checkbox');

    if (!urlsTextarea || !downloadBtn || !statusBox || !zipCheckbox) return;

    let isLoading = false;
    let abortController = null;

    const setStatus = createStatusSetter(statusBox);

    const MAX_CONCURRENT_DOWNLOADS = 6;
    const MAX_RETRIES = 2;
    const RETRY_DELAY = 1000;
    const CORS_PROXIES = [
        'https://api.allorigins.win/raw?url=',
        'https://cors-anywhere.herokuapp.com/'
    ];

    const blobCache = new Map();
    const pendingFetches = new Map();

    const getFilenameFromUrl = (url, blob) => {
        try {
            let filename = new URL(url).pathname.split('/').pop();
            if (!filename) filename = `muzzard-download-${Date.now()}`;
            if (!/\.[^/.]+$/.test(filename)) {
                const extension = blob.type.split('/')[1] || 'jpg';
                filename = `${filename}.${extension}`;
            }
            return filename.replace(/[/\\?%*:|"<>]/g, '-');
        } catch (e) {
            const extension = blob.type.split('/')[1] || 'jpg';
            return `muzzard-download-${Date.now()}.${extension}`;
        }
    };

    const fetchWithRetry = async (url, retries = MAX_RETRIES) => {
        if (blobCache.has(url)) {
            return blobCache.get(url);
        }

        if (pendingFetches.has(url)) {
            return pendingFetches.get(url);
        }

        const fetchPromise = (async () => {
            let lastError;
            let corsBlocked = false;
            let proxyIndex = 0;

            for (let attempt = 0; attempt <= retries; attempt++) {
                try {
                    let fetchUrl = url;
                    const fetchOptions = {
                        method: 'GET',
                        mode: 'cors',
                        cache: 'default',
                        credentials: 'omit',
                        signal: abortController?.signal
                    };

                    if (corsBlocked && proxyIndex < CORS_PROXIES.length) {
                        const proxy = CORS_PROXIES[proxyIndex];
                        fetchUrl = proxy.includes('?url=')
                            ? proxy + encodeURIComponent(url)
                            : proxy + url;
                        proxyIndex++;
                    }

                    const response = await fetch(fetchUrl, fetchOptions);

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    const blob = await response.blob();

                    if (blob.size === 0 || (blob.type === 'text/html' && blob.size < 5000)) {
                        throw new Error('Received empty or HTML response (possible proxy block?)');
                    }

                    const result = { blob, filename: getFilenameFromUrl(url, blob) };

                    blobCache.set(url, result);
                    pendingFetches.delete(url);

                    return result;
                } catch (error) {
                    lastError = error;

                    if (error.name === 'AbortError') {
                        throw error;
                    }

                    const isCorsError = error.message.includes('CORS') ||
                        error.message.includes('NetworkError') ||
                        error.message.includes('Failed to fetch') ||
                        error.message.includes('proxy');

                    if (isCorsError && !corsBlocked) {
                        corsBlocked = true;
                        if (attempt < retries && proxyIndex < CORS_PROXIES.length) {
                            await sleep(RETRY_DELAY * Math.pow(2, attempt));
                        } else if (attempt < retries) {
                            await sleep(RETRY_DELAY * Math.pow(2, attempt));
                        }
                    } else if (attempt < retries) {
                        await sleep(RETRY_DELAY * Math.pow(2, attempt));
                    }
                }
            }

            pendingFetches.delete(url);
            console.error(`Failed to fetch ${url}: ${lastError?.message}`);
            throw lastError;
        })();

        pendingFetches.set(url, fetchPromise);
        return fetchPromise;
    };

    const downloadWithConcurrencyLimit = async (urls, concurrency, onProgress) => {
        const results = [];
        const executing = [];

        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];

            const promise = fetchWithRetry(url)
                .then(result => {
                    onProgress?.(i, true, result);
                    return { status: 'fulfilled', value: result, index: i };
                })
                .catch(error => {
                    onProgress?.(i, false, error);
                    return { status: 'rejected', reason: { url, error: error.message }, index: i };
                })
                .then(result => {
                    executing.splice(executing.indexOf(promise), 1);
                    return result;
                });

            results[i] = promise;
            executing.push(promise);

            if (executing.length >= concurrency) {
                await Promise.race(executing);
            }
        }

        return Promise.all(results);
    };

    const downloadIndividually = async (urlList) => {
        setStatus(`Fetching ${urlList.length} file(s) with ${MAX_CONCURRENT_DOWNLOADS} concurrent connections...`);

        let completed = 0;
        const results = await downloadWithConcurrencyLimit(
            urlList,
            MAX_CONCURRENT_DOWNLOADS,
            (index, success, data) => {
                completed++;
                if (success) {
                    setStatus(`Fetched ${completed}/${urlList.length}: ${data.filename}`);
                } else {
                    setStatus(`Progress ${completed}/${urlList.length} (${data.message})`);
                }
            }
        );

        const successfulDownloads = results.filter(r => r.status === 'fulfilled').map(r => r.value);
        const failedDownloads = results.filter(r => r.status === 'rejected').map(r => r.reason);

        if (successfulDownloads.length === 0) {
            setStatus(`Download failed. No files could be fetched. ${failedDownloads.length} failed.`);
            return;
        }

        setStatus(`Fetch complete. Triggering ${successfulDownloads.length} downloads...`);
        await sleep(300);

        for (let i = 0; i < successfulDownloads.length; i++) {
            const { blob, filename } = successfulDownloads[i];
            setStatus(`Downloading ${i + 1}/${successfulDownloads.length}: ${filename}`);

            const objectUrl = URL.createObjectURL(blob);
            try {
                saveAs(blob, filename);
            } finally {
                setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
            }

            if (i < successfulDownloads.length - 1) {
                await sleep(100);
            }
        }

        let finalMessage = `✓ Completed. ${successfulDownloads.length} file(s) downloaded.`;
        if (failedDownloads.length > 0) {
            finalMessage += ` ${failedDownloads.length} failed.`;
            console.warn('Failed downloads:', failedDownloads);
        }
        setStatus(finalMessage);
    };

    const downloadAsZip = async (urlList) => {
        if (typeof JSZip === 'undefined' || typeof saveAs === 'undefined') {
            setStatus('Error: Zipping library not loaded.');
            return;
        }

        const zip = new JSZip();
        setStatus(`Fetching ${urlList.length} file(s) (${MAX_CONCURRENT_DOWNLOADS} concurrent connections)...`);

        let completed = 0;
        const results = await downloadWithConcurrencyLimit(
            urlList,
            MAX_CONCURRENT_DOWNLOADS,
            () => {
                completed++;
                setStatus(`Fetching for ZIP: ${completed}/${urlList.length}...`);
            }
        );

        const successfulFetches = results.filter(r => r.status === 'fulfilled').map(r => r.value);
        const failedFetches = results.filter(r => r.status === 'rejected').map(r => r.reason);

        if (successfulFetches.length === 0) {
            setStatus(`ZIP fetch cancelled. No files could be fetched. ${failedFetches.length} failed.`);
            return;
        }

        setStatus(`Fetched ${successfulFetches.length} files. Creating ZIP...`);

        const filenameCounts = new Map();
        successfulFetches.forEach(({ filename, blob }) => {
            let finalFilename = filename;
            if (filenameCounts.has(filename)) {
                const count = filenameCounts.get(filename);
                filenameCounts.set(filename, count + 1);
                const parts = filename.split('.');
                const ext = parts.pop();
                finalFilename = `${parts.join('.')}_${count}.${ext}`;
            } else {
                filenameCounts.set(filename, 1);
            }
            zip.file(finalFilename, blob);
        });

        const content = await zip.generateAsync(
            {
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            },
            (metadata) => {
                setStatus(`Creating ZIP... ${metadata.percent.toFixed(0)}%`);
            }
        );

        saveAs(content, `muzzard-pack-${Date.now()}.zip`);

        let finalMessage = `ZIP created. ${successfulFetches.length} file(s) archived.`;
        if (failedFetches.length > 0) {
            finalMessage += ` ${failedFetches.length} failed.`;
            console.warn('Failed fetches:', failedFetches);
        }
        setStatus(finalMessage);

        blobCache.clear();
    };

    const imgurSingleRegex = /^(?:https?:\/\/)?(?:i\.)?imgur\.com\/([a-zA-Z0-9]+)(\.[a-zA-Z]{3,4})?$/i;
    const imgurAlbumRegex = /^(?:https?:\/\/)?(?:imgur\.com\/(?:a|gallery)\/)([a-zA-Z0-9]+)$/i;

    const fetchImgurAlbumImages = async (albumUrl) => {
        try {
            const res = await fetch(albumUrl, {
                mode: 'cors',
                credentials: 'omit',
                signal: abortController?.signal
            });
            if (!res.ok) throw new Error(`Server responded ${res.status}`);
            const html = await res.text();

            const directMatches = Array.from(new Set((html.match(/https?:\/\/i\.imgur\.com\/[A-Za-z0-9]+(?:\.[a-zA-Z]{3,4})?/g) || []).map(s => s.split('?')[0])));
            if (directMatches.length) return directMatches;

            const hashExtRegex = /"hash"\s*:\s*"([A-Za-z0-9]+)"(?:\s*,\s*"ext"\s*:\s*"(\.[a-zA-Z0-9]+)")?/g;
            const found = [];
            let m;
            while ((m = hashExtRegex.exec(html)) !== null) {
                const hash = m[1];
                const ext = (m[2] && m[2].startsWith('.')) ? m[2] : (m[2] ? `.${m[2]}` : '.jpg');
                found.push(`https://i.imgur.com/${hash}${ext}`);
            }
            if (found.length) return Array.from(new Set(found)).map(s => s.split('?')[0]);

            const dataSrcMatches = Array.from(new Set(
                (html.match(/https?:\/\/i\.imgur\.com\/[A-Za-z0-9]+(?:\.[a-zA-Z]{3,4})?/g) || [])
                    .map(s => s.split('?')[0])
            ));
            if (dataSrcMatches.length) return dataSrcMatches;

            const dataIdRegex = /data-(?:id|image-id|hash)=["']?([A-Za-z0-9]+)["']?/g;
            const fallback = [];
            while ((m = dataIdRegex.exec(html)) !== null) {
                const hash = m[1];
                fallback.push(`https://i.imgur.com/${hash}.jpg`);
            }
            if (fallback.length) return Array.from(new Set(fallback));

            return [];
        } catch (e) {
            console.error('Imgur album fetch failed', e);
            return [];
        }
    };

    const allowedExtensions = [
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif', 'jxl', 'bmp', 'tif', 'tiff',
        'mp4', 'webm', 'mov', 'mkv', 'mp3', 'm4a', 'ogg', 'wav'
    ];

    const isAllowedUrl = (u) => {
        if (!u) return false;
        if (u.startsWith('data:')) {
            return /^data:(image|video|audio)\//i.test(u);
        }
        try {
            const parsed = new URL(u);
            const pathname = parsed.pathname || '';
            const m = pathname.match(/\.([a-z0-9]+)$/i);
            if (m && m[1]) {
                return allowedExtensions.includes(m[1].toLowerCase());
            }
            return false;
        } catch (e) {
            return false;
        }
    };

    const setLoadingState = (loading) => {
        isLoading = loading;
        downloadBtn.disabled = loading;
        urlsTextarea.disabled = loading;
        downloadBtn.textContent = loading ? 'Processing...' : 'Muzzard It';
    };

    const handleDownload = async () => {
        if (isLoading) return;

        const urls = urlsTextarea.value;
        const allLines = urls.split('\n').map(url => url.trim()).filter(Boolean);

        if (allLines.length === 0) {
            setStatus('Please paste at least one URL.');
            return;
        }

        abortController = new AbortController();

        let anyImgurDetected = false;
        const expandedLines = [];

        for (const url of allLines) {
            const albumMatch = url.match(imgurAlbumRegex);
            const singleMatch = url.match(imgurSingleRegex);

            if (albumMatch) {
                anyImgurDetected = true;
                setStatus('Imgur album/gallery detected. Fetching album contents...');
                try {
                    const imgs = await fetchImgurAlbumImages(url);
                    if (imgs.length > 0) {
                        expandedLines.push(...imgs);
                        setStatus(`Found ${imgs.length} image(s) in album.`);
                        await sleep(200);
                    } else {
                        expandedLines.push(url);
                        setStatus('Could not extract images from album; keeping original link.');
                    }
                } catch (e) {
                    console.error('Error fetching album:', e);
                    expandedLines.push(url);
                }
            } else if (singleMatch) {
                anyImgurDetected = true;
                const id = singleMatch[1];
                const ext = singleMatch[2] || '.jpg';
                expandedLines.push(`https://i.imgur.com/${id}${ext}`);
            } else {
                expandedLines.push(url);
            }
        }

        if (anyImgurDetected) {
            setStatus('Imgur links processed. Proceeding...');
            await sleep(300);
        }

        setLoadingState(true);
        setStatus('Validating URLs...');

        const validUrlList = expandedLines.filter(u => isAllowedUrl(u));
        const invalidUrlList = expandedLines.filter(u => !isAllowedUrl(u));

        if (validUrlList.length === 0) {
            setStatus('No valid media URLs found. Check console for details.');
            console.warn('Invalid URLs:', invalidUrlList);
            setLoadingState(false);
            downloadBtn.disabled = false;
            urlsTextarea.disabled = false;
            downloadBtn.textContent = 'Muzzard it';
            abortController = null;
            return;
        }

        const uniqueUrls = [...new Set(validUrlList)];
        const duplicatesRemoved = validUrlList.length - uniqueUrls.length;

        let statusMessage = `Found ${uniqueUrls.length} valid URL(s).`;
        if (duplicatesRemoved > 0) {
            statusMessage += ` (${duplicatesRemoved} duplicate(s) removed)`;
        }
        if (invalidUrlList.length > 0) {
            statusMessage += ` Skipping ${invalidUrlList.length} invalid.`;
        }
        setStatus(statusMessage);
        await sleep(400);

        try {
            if (zipCheckbox.checked) {
                await downloadAsZip(uniqueUrls);
            } else {
                await downloadIndividually(uniqueUrls);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                setStatus('Download cancelled by user.');
            } else {
                console.error('Download error:', error);
                setStatus(`Error: ${error.message || 'Unknown error occurred'}`);
            }
        } finally {
            setLoadingState(false);
            downloadBtn.disabled = false;
            urlsTextarea.disabled = false;
            downloadBtn.textContent = 'Muzzard It';
            urlsTextarea.value = '';
            abortController = null;
        }
    };

    const createUploadUI = () => {
        let uploadBtn = byId('upload-files-btn');
        if (!uploadBtn) {
            uploadBtn = document.createElement('button');
            uploadBtn.type = 'button';
            uploadBtn.id = 'upload-files-btn';
            uploadBtn.textContent = 'Upload files';
            uploadBtn.style.marginRight = '8px';
            downloadBtn.parentNode.insertBefore(uploadBtn, downloadBtn);
        }

        let fileInput = byId('import-file-input');
        if (!fileInput) {
            fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.multiple = true;
            fileInput.accept = 'text/*,image/*';
            fileInput.style.display = 'none';
            fileInput.id = 'import-file-input';
            downloadBtn.parentNode.insertBefore(fileInput, downloadBtn);
        }

        uploadBtn.addEventListener('click', () => fileInput.click(), { passive: true });
        return fileInput;
    };

    const urlRegex = /(https?:\/\/[^\s'">)]+)/g;
    const htmlTestRegex = /<\/?[a-z][\s\S]*>/i;

    const extractUrlsFromText = (text) => {
        if (!text) return [];

        const rawMatches = text.match(urlRegex) || [];
        const looksLikeHtml = htmlTestRegex.test(text);

        if (looksLikeHtml && typeof DOMParser !== 'undefined') {
            try {
                const doc = new DOMParser().parseFromString(text, 'text/html');
                const urls = new Set(rawMatches.map(u => u.trim()));

                const srcAttrs = ['src', 'data-src', 'data-original', 'data-image', 'data-lazy'];

                doc.querySelectorAll('img,source,video,audio').forEach(el => {
                    srcAttrs.forEach(attr => {
                        const v = el.getAttribute?.(attr);
                        if (v) urls.add(v.split('?')[0].trim());
                    });

                    const srcset = el.getAttribute?.('srcset');
                    if (srcset) {
                        srcset.split(',').forEach(part => {
                            const url = part.trim().split(' ')[0];
                            if (url) urls.add(url.split('?')[0].trim());
                        });
                    }
                });

                doc.querySelectorAll('a[href]').forEach(a => {
                    const href = a.getAttribute('href');
                    if (href && /^https?:\/\//i.test(href)) {
                        urls.add(href.split('?')[0].trim());
                    }
                });

                const meta = doc.querySelector('meta[property="og:image"],meta[name="og:image"],meta[name="twitter:image"]');
                if (meta?.content) urls.add(meta.content.split('?')[0].trim());

                doc.querySelectorAll('[data-id],[data-image-id],[data-image]').forEach(el => {
                    const v = el.getAttribute('data-id') || el.getAttribute('data-image-id') || el.getAttribute('data-image');
                    if (v && /^[A-Za-z0-9]+$/.test(v)) {
                        urls.add(`https://i.imgur.com/${v}.jpg`);
                    }
                });

                return Array.from(urls);
            } catch (e) {
                console.error('extractUrlsFromText parse error', e);
                return Array.from(new Set(rawMatches.map(u => u.trim())));
            }
        }

        return Array.from(new Set(rawMatches.map(u => u.trim())));
    };

    const addUrlsToTextarea = (newUrls) => {
        if (!newUrls?.length) return 0;

        const existingUrls = new Set(urlsTextarea.value.split('\n').map(u => u.trim()).filter(Boolean));
        let addedCount = 0;

        const isImgurPageRegex = /^(?:https?:\/\/)?(?:m\.)?(?:imgur\.com)\/(a\/|gallery\/)?[A-Za-z0-9]+(?:[\/?#].*)?$/i;

        newUrls.forEach(rawUrl => {
            const url = rawUrl?.trim();
            if (!url) return;

            const isImgurPage = isImgurPageRegex.test(url);
            const shouldAdd = isAllowedUrl(url) || isImgurPage || url.startsWith('data:');

            if (shouldAdd && !existingUrls.has(url)) {
                existingUrls.add(url);
                addedCount++;
            }
        });

        if (addedCount > 0) {
            urlsTextarea.value = Array.from(existingUrls).join('\n');
            downloadBtn.disabled = false;
        }
        return addedCount;
    };

    const importTextarea = byId('import-textarea');
    const importTextBtn = byId('import-text-btn');

    if (importTextarea && importTextBtn) {
        importTextBtn.addEventListener('click', () => {
            const text = importTextarea.value;
            if (!text.trim()) {
                setStatus('Paste some text containing links to import.');
                return;
            }
            const urls = extractUrlsFromText(text);
            const added = addUrlsToTextarea(urls);
            setStatus(`Imported ${added} new link(s).`);
            importTextarea.value = '';
        }, { passive: true });
    }

    const fileInput = createUploadUI();

    fileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        setStatus(`Processing ${files.length} file(s)...`);

        let totalAdded = 0;

        const filePromises = files.map(async (file) => {
            if (file.type.startsWith('image/')) {
                try {
                    const dataUrl = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = () => reject(new Error('FileReader error'));
                        reader.readAsDataURL(file);
                    });
                    return { type: 'image', urls: [dataUrl], filename: file.name };
                } catch (err) {
                    console.error('Error reading image file:', err);
                    return { type: 'error', filename: file.name };
                }
            }

            try {
                const text = await file.text();
                const urls = extractUrlsFromText(text);
                return { type: 'text', urls, filename: file.name };
            } catch (err) {
                console.error('Error reading text file:', err);
                return { type: 'error', filename: file.name };
            }
        });

        const results = await Promise.all(filePromises);

        results.forEach(result => {
            if (result.type === 'error') {
                setStatus(`Error reading ${result.filename}`);
            } else {
                const added = addUrlsToTextarea(result.urls);
                totalAdded += added;
            }
        });

        setStatus(totalAdded > 0
            ? `Import complete: ${totalAdded} new link(s) added.`
            : 'Import complete: no new links added.'
        );

        fileInput.value = '';
    }, { passive: true });

    downloadBtn.addEventListener('click', handleDownload);

    const syncDownloadButtonState = debounce(() => {
        downloadBtn.disabled = !urlsTextarea.value.trim() || isLoading;
    }, 150);

    urlsTextarea.addEventListener('input', syncDownloadButtonState, { passive: true });

    downloadBtn.disabled = !urlsTextarea.value.trim();

    window.addEventListener('beforeunload', () => {
        blobCache.clear();
        pendingFetches.clear();
        abortController?.abort();
    });
}
