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


    const handleDownload = async () => {
        if (isLoading) return;

        const urls = urlsTextarea.value;
        const urlRegex = /^(https?:\/\/[^\s/$.?#].[^\s]*)$/i;
        const allLines = urls.split('\n').map(url => url.trim()).filter(Boolean);

        if (allLines.length === 0) {
            setStatus('Please paste at least one URL.');
            return;
        }

        const normalizedImgurRegex = /^(?:https?:\/\/)?(?:i\.)?imgur\.com\/([a-zA-Z0-9]+)(\.[a-zA-Z]{3,4})?$/i;
        let imgurFound = false;

        const converted = allLines.map(url => {
            const m = url.match(normalizedImgurRegex);
            if (!m) return url;
            imgurFound = true;
            const id = m[1];
            const ext = m[2] || '.jpg';
            return `https://i.imgur.com/${id}${ext}`;
        });

        if (imgurFound) {
            setStatus('Note: Imgur links detected. Converting to direct image links...');
            await sleep(600);
            allLines.splice(0, allLines.length, ...converted);
            setStatus('Imgur links converted. Proceeding with download...');
            await sleep(400);
        }

        isLoading = true;
        downloadBtn.disabled = true;
        urlsTextarea.disabled = true;
        downloadBtn.textContent = 'Processing...';
        setStatus('Validating URLs...');

        const validUrlList = allLines.filter(url => urlRegex.test(url));
        const invalidUrlList = allLines.filter(url => !urlRegex.test(url));

        if (validUrlList.length === 0) {
            setStatus(`No valid URLs found. Please check your list.\nInvalid entries:\n${invalidUrlList.join('\n')}`);
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

    downloadBtn.addEventListener('click', handleDownload);

    urlsTextarea.addEventListener('input', () => {
        downloadBtn.disabled = !urlsTextarea.value.trim() || isLoading;
    });
    downloadBtn.disabled = !urlsTextarea.value.trim();
});