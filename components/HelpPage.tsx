import React from 'react';

const SubHeading = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl font-extrabold text-red-800 font-sans mt-8 mb-2" style={{ textShadow: '1px 1px 0 #000' }}>
    {children}
  </h2>
);

const HelpPage = () => {
  return (
    <section className="bg-[#fcc603] p-6 text-black font-serif border-t-4 border-black">
      <h1 className="text-3xl font-extrabold text-red-800 font-sans" style={{ textShadow: '1px 1px 0 #000' }}>Help & FAQ</h1>
      <p className="text-sm font-sans mb-6 text-gray-800">Knowledge for the People</p>

      <div className="space-y-4 text-sm leading-relaxed">
        <SubHeading>How to use Muzzard</SubHeading>
        <p>
          It's simple, by design.
        </p>
        <ol className="list-decimal list-inside space-y-2 pl-4">
            <li>Find the direct URL to an image you want to download. This usually ends in .jpg, .png, .gif, etc.</li>
            <li>Paste the URL into the big text box on the homepage.</li>
            <li>If you have more than one, paste each URL on a new line.</li>
            <li>Click the "Muzzard It" button.</li>
            <li>Your browser will prompt you to save each image. That's it. No frills.</li>
        </ol>

        <SubHeading>Supported Sites: Imgur, etc.</SubHeading>
        <p>
          Muzzard is built for direct image links. It's not a scraper. It works best with URLs that point directly to an image file.
        </p>
        <p>
          This means sites like <strong>Imgur</strong> (use the "Direct Link", not the gallery page), personal websites, and any other place that gives you a straight-up URL to the image itself will work perfectly. It will NOT work with gallery pages from sites like Flickr, or with images embedded in social media feeds.
        </p>

        <SubHeading>Why are my downloads blocked or failing?</SubHeading>
        <p>
          A few things could be happening here:
        </p>
        <ul className="list-disc list-inside space-y-2 pl-4">
            <li><strong>Invalid URL:</strong> You might have pasted a link to a webpage instead of an image. Muzzard will try to validate this and skip bad URLs.</li>
            <li><strong>CORS / Hotlink Protection:</strong> Some websites are nasty and don't like you linking directly to their images from other places. This is called hotlink protection. If a site has this enabled, Muzzard might not be able to fetch the image. There's not much we can do about that—it's the Wild West out here.</li>
            <li><strong>Browser Pop-up Blockers:</strong> Since Muzzard triggers multiple downloads, your browser might think it's under attack by pop-ups. Make sure you allow this site to download multiple files if your browser asks.</li>
        </ul>
      </div>
    </section>
  );
};

export default HelpPage;
