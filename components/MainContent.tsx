import React, { useState, useCallback } from 'react';

const MainContent = () => {
  const [urls, setUrls] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('Paste image URLs below, one per line.');

  const handleDownload = useCallback(async () => {
    const urlRegex = /^(https?:\/\/[^\s/$.?#].[^\s]*)$/i;
    const allLines = urls.split('\n').map(url => url.trim()).filter(Boolean);
    
    if (allLines.length === 0) {
      setStatus('Please paste at least one URL.');
      return;
    }

    setIsLoading(true);
    setStatus('Validating URLs...');

    const validUrlList: string[] = [];
    const invalidUrlList: string[] = [];

    for (const url of allLines) {
      if (urlRegex.test(url)) {
        validUrlList.push(url);
      } else {
        invalidUrlList.push(url);
      }
    }

    if (validUrlList.length === 0) {
      setStatus(`No valid URLs found. Please check your list.\nInvalid entries:\n${invalidUrlList.join('\n')}`);
      setIsLoading(false);
      return;
    }
    
    let statusMessage = `Found ${validUrlList.length} valid URLs.`;
    if (invalidUrlList.length > 0) {
        statusMessage += `\nSkipping ${invalidUrlList.length} invalid line(s).`;
    }
    setStatus(statusMessage + '\nStarting downloads...');
    await new Promise(resolve => setTimeout(resolve, 500)); // Give user time to read validation message


    for (let i = 0; i < validUrlList.length; i++) {
      const url = validUrlList[i];
      const shortUrl = url.length > 50 ? `${url.substring(0, 50)}...` : url;
      setStatus(`Downloading image ${i + 1} of ${validUrlList.length}: ${shortUrl}`);
      
      try {
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = objectUrl;

        let filename = new URL(url).pathname.substring(new URL(url).pathname.lastIndexOf('/') + 1);
        if (!filename) {
          filename = `muzzard-download-${Date.now()}`;
        }

        if (!filename.includes('.')) {
          const extension = blob.type.split('/')[1] || 'jpg';
          filename = `${filename}.${extension}`;
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
        
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (error) {
        console.error('Download error:', error);
        setStatus(`Error downloading ${shortUrl}: ${error instanceof Error ? error.message : 'Unknown error'}. Skipping.`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
    }

    setIsLoading(false);
    setStatus(`Finished. ${validUrlList.length} image(s) processed.`);
    setUrls('');
  }, [urls]);

  return (
    <section className="bg-[#fcc603] p-6 text-black font-serif border-t-4 border-black">
      <h1 className="text-3xl font-extrabold text-red-800 font-sans" style={{ textShadow: '1px 1px 0 #000' }}>muzzard</h1>
      <p className="font-bold font-sans">By Team Muzzard</p>
      <p className="text-sm font-sans mb-6 text-gray-800">A Page 2 Joint</p>

      <div className="space-y-4 text-sm leading-relaxed">
        <p>
            Welcome to Muzzard, the premier old-school utility for grabbing images. Paste your direct image URLs into the box below. We're talking Imgur links, direct file links, you name it. One URL per line.
        </p>
        
        <textarea
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            placeholder="e.g. https://i.imgur.com/k33kw88.jpeg&#10;https://i.imgur.com/example.png"
            className="w-full h-48 p-2 border-2 border-black bg-[#fffde7] text-black font-mono text-xs focus:outline-none focus:ring-2 focus:ring-red-700"
            disabled={isLoading}
        />

        <button
            onClick={handleDownload}
            disabled={isLoading || !urls.trim()}
            className="px-6 py-2 bg-red-800 text-white font-bold font-sans uppercase tracking-wider border-2 border-black hover:bg-red-900 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
        >
            {isLoading ? 'Processing...' : 'Muzzard It'}
        </button>

        <div className="mt-4 p-2 border border-black bg-[#fffde7] text-xs font-mono h-24 overflow-y-auto">
            <p className="font-bold">Status:</p>
            <p className="whitespace-pre-wrap break-words">{status}</p>
        </div>
        <p className="text-xs italic">
            This is a tool for the people. No fluff, no nonsense. Just pure, unadulterated image downloading power. Remember to only download images you have the right to.
        </p>
      </div>
    </section>
  );
};

export default MainContent;
