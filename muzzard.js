document.addEventListener('DOMContentLoaded', () => {
    const pageContainer = document.getElementById('page-container');
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
        });
    });

    // Downloader logic
    const urlsTextarea = document.getElementById('urls-textarea');
    const downloadBtn = document.getElementById('download-btn');
    const statusBox = document.getElementById('status-box');
    const zipCheckbox = document.getElementById('zip-checkbox');
    let isLoading = false;

    const setStatus = (message) => {
        statusBox.textContent = message;
    };

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const getFilenameFromUrl = (url, blob) => {
        try {
            let filename = new URL(url).pathname.split('/').pop();
            if (!filename) filename = `muzzard-download-${Date.now()}`;
            if (!/\.[^/.]+$/.test(filename)) {
                const extension = blob.type.split('/')[1] || 'jpg';
                filename = `${filename}.${extension}`;
            }
            return filename.replace(/[/\\?%*:|"<>]/g, '-'); // Sanitize filename
        } catch (e) {
            const extension = blob.type.split('/')[1] || 'jpg';
            return `muzzard-download-${Date.now()}.${extension}`;
        }
    };

    const downloadIndividually = async (urlList) => {
        setStatus(`Fetching ${urlList.length} image(s) in parallel...`);

        const downloadPromises = urlList.map(url =>
            fetch(url)
                .then(response => {
                    if (!response.ok) throw new Error(`Server responded with ${response.status}`);
                    return response.blob();
                })
                .then(blob => ({ status: 'fulfilled', value: { blob, filename: getFilenameFromUrl(url, blob) } }))
                .catch(error => ({ status: 'rejected', reason: { url, error: error.message } }))
        );

        const results = await Promise.all(downloadPromises);
        const successfulDownloads = results.filter(r => r.status === 'fulfilled').map(r => r.value);
        const failedDownloads = results.filter(r => r.status === 'rejected').map(r => r.reason);

        if (successfulDownloads.length === 0) {
            setStatus(`Download finished. No images could be fetched. ${failedDownloads.length} failed.`);
            return;
        }

        setStatus(`Fetch complete. Triggering ${successfulDownloads.length} downloads...`);
        await sleep(500);

        for (let i = 0; i < successfulDownloads.length; i++) {
            const { blob, filename } = successfulDownloads[i];
            setStatus(`Downloading ${i + 1} of ${successfulDownloads.length}: ${filename}`);
            saveAs(blob, filename); // Using FileSaver.js for robustness
            await sleep(300);
        }

        let finalMessage = `Finished. ${successfulDownloads.length} image(s) processed.`;
        if (failedDownloads.length > 0) {
            finalMessage += ` ${failedDownloads.length} failed.`;
        }
        setStatus(finalMessage);
    };

    const downloadAsZip = async (urlList) => {
        if (typeof JSZip === 'undefined' || typeof saveAs === 'undefined') {
            setStatus('Error: Zipping library not loaded.');
            return;
        }
        const zip = new JSZip();
        setStatus(`Fetching ${urlList.length} image(s) for zipping...`);

        const fetchPromises = urlList.map(url =>
            fetch(url)
                .then(response => {
                    if (!response.ok) throw new Error(`Server responded with ${response.status}`);
                    return response.blob();
                })
                .then(blob => ({ status: 'fulfilled', value: { blob, filename: getFilenameFromUrl(url, blob) } }))
                .catch(error => ({ status: 'rejected', reason: { url, error: error.message } }))
        );

        const results = await Promise.all(fetchPromises);
        const successfulFetches = results.filter(r => r.status === 'fulfilled').map(r => r.value);
        const failedFetches = results.filter(r => r.status === 'rejected').map(r => r.reason);

        if (successfulFetches.length === 0) {
            setStatus(`Zipping cancelled. No images could be fetched. ${failedFetches.length} failed.`);
            return;
        }

        setStatus(`Fetched ${successfulFetches.length} images. Now creating ZIP file...`);

        successfulFetches.forEach(({ filename, blob }) => zip.file(filename, blob));

        const content = await zip.generateAsync({ type: "blob" }, (metadata) => {
            setStatus(`Zipping... ${metadata.percent.toFixed(0)}%`);
        });

        saveAs(content, `muzzard-pack-${Date.now()}.zip`);

        let finalMessage = `Finished. ${successfulFetches.length} image(s) saved to ZIP.`;
        if (failedFetches.length > 0) {
            finalMessage += ` ${failedFetches.length} failed to fetch.`;
        }
        setStatus(finalMessage);
    };


    const imgurSingleRegex = /^(?:https?:\/\/)?(?:i\.)?imgur\.com\/([a-zA-Z0-9]+)(\.[a-zA-Z]{3,4})?$/i;
    const imgurAlbumRegex = /^(?:https?:\/\/)?(?:imgur\.com\/(?:a|gallery)\/)([a-zA-Z0-9]+)$/i;

    const fetchImgurAlbumImages = async (albumUrl) => {
        try {
            const res = await fetch(albumUrl);
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
        'jpg','jpeg','png','gif','webp','svg','avif','jxl','bmp','tif','tiff',
        'mp4','webm','mov','mkv','mp3','m4a','ogg','wav'
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

    const handleDownload = async () => {
        if (isLoading) return;

        const urls = urlsTextarea.value;
        const allLines = urls.split('\n').map(url => url.trim()).filter(Boolean);

        if (allLines.length === 0) {
            setStatus('Please paste at least one URL.');
            return;
        }

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
                        await sleep(250);
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
            setStatus('Imgur links processed. Proceeding with download...');
            await sleep(400);
        }

        isLoading = true;
        downloadBtn.disabled = true;
        urlsTextarea.disabled = true;
        downloadBtn.textContent = 'Processing...';
        setStatus('Validating URLs...');

        const validUrlList = expandedLines.filter(u => isAllowedUrl(u));
        const invalidUrlList = expandedLines.filter(u => !isAllowedUrl(u));

        if (validUrlList.length === 0) {
            setStatus(`No valid media URLs found. Please check your list.\nInvalid entries:\n${invalidUrlList.join('\n')}`);
            isLoading = false;
            downloadBtn.disabled = false;
            urlsTextarea.disabled = false;
            downloadBtn.textContent = 'Muzzard it';
            return;
        }

        let statusMessage = `Found ${validUrlList.length} valid URLs.`;
        if (invalidUrlList.length > 0) {
            statusMessage += `\nSkipping ${invalidUrlList.length} invalid line(s).`;
        }
        setStatus(statusMessage);
        await sleep(500);

        try {
            if (zipCheckbox.checked) {
                await downloadAsZip(validUrlList);
            } else {
                await downloadIndividually(validUrlList);
            }
        } catch (error) {
            console.error("An unexpected error occurred during download:", error);
            setStatus("An unexpected error occurred. Check the console for details.");
        } finally {
            isLoading = false;
            downloadBtn.disabled = false;
            urlsTextarea.disabled = false;
            downloadBtn.textContent = 'Muzzard It';
            urlsTextarea.value = '';
        }
    };

    const createUploadUI = () => {
        let uploadBtn = document.getElementById('upload-files-btn');
        if (!uploadBtn) {
            uploadBtn = document.createElement('button');
            uploadBtn.type = 'button';
            uploadBtn.id = 'upload-files-btn';
            uploadBtn.textContent = 'Upload files';
            uploadBtn.style.marginRight = '8px';
            downloadBtn.parentNode.insertBefore(uploadBtn, downloadBtn);
        }

        let fileInput = document.getElementById('import-file-input');
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

    const extractUrlsFromText = (text) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const matches = text.match(urlRegex);
        return matches ? matches.map(u => u.trim()) : [];
    }

    const addUrlsToTextarea = (newUrls) => {
        if (!newUrls || newUrls.length === 0) return 0;
        const existingUrls = new Set(urlsTextarea.value.split('\n').map(u => u.trim()).filter(Boolean));
        let addedCount = 0;
        newUrls.forEach(url => {
            if (isAllowedUrl(url) && !existingUrls.has(url)) {
                existingUrls.add(url);
                addedCount++;
            }
        }
        );
        if (addedCount > 0) {
            urlsTextarea.value = Array.from(existingUrls).join('\n');
            downloadBtn.disabled = false;
        }
        return addedCount;
    }

    const fileInput = createUploadUI();

    fileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        setStatus(`Processing ${files.length} file(s)...`);

        let totalAdded = 0;
        for (const file of files) {
            if (file.type.startsWith('image/')) {
                try {
                    const dataUrl = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = () => reject(new Error('FileReader error'));
                        reader.readAsDataURL(file);
                    });
                    const added = addUrlsToTextarea([dataUrl]);
                    if (added) totalAdded += added;
                    setStatus(`Imported image file: ${file.name}`);
                } catch (err) {
                    console.error('Error reading image file:', err);
                    setStatus(`Error reading ${file.name}`);
                }
            } else {
                try {
                    const text = await file.text();
                    const urls = extractUrlsFromText(text);
                    const added = addUrlsToTextarea(urls);
                    if (added) totalAdded += added;
                    setStatus(`Imported ${urls.length} links from ${file.name} (${added} new).`);
                } catch (err) {
                    console.error('Error reading text file:', err);
                    setStatus(`Error reading ${file.name}`);
                }
            }
            await new Promise(r => setTimeout(r, 150));
        }

        if (totalAdded > 0) {
            setStatus(`Import complete: ${totalAdded} new link(s) added.`);
        } else {
            setStatus('Import complete: no new links added.');
        }

        fileInput.value = '';
    });

    downloadBtn.addEventListener('click', handleDownload);

    urlsTextarea.addEventListener('input', () => {
        downloadBtn.disabled = !urlsTextarea.value.trim() || isLoading;
    });
    downloadBtn.disabled = !urlsTextarea.value.trim();
});