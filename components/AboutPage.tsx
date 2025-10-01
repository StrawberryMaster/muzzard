import React from 'react';

const SubHeading = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl font-extrabold text-red-800 font-sans mt-8 mb-2" style={{ textShadow: '1px 1px 0 #000' }}>
    {children}
  </h2>
);

const AboutPage = () => {
  return (
    <section className="bg-[#fcc603] p-6 text-black font-serif border-t-4 border-black">
      <h1 className="text-3xl font-extrabold text-red-800 font-sans" style={{ textShadow: '1px 1px 0 #000' }}>About Muzzard</h1>
      <p className="text-sm font-sans mb-6 text-gray-800">The Digital Gonzo Spirit</p>

      <div className="space-y-4 text-sm leading-relaxed">
        <p>
          Muzzard isn't just a tool; it's a statement. It's a throwback to a wilder, less polished internet. An era of function over form, of raw power in the hands of the user. We were inspired by the chaotic, brilliant energy of ESPN's Page 2 and the literary madness of Hunter S. Thompson. This is a tool built with that same spirit.
        </p>

        <SubHeading>The 2000s Web Aesthetic</SubHeading>
        <p>
          Remember when the web was a frontier? When pages were a glorious clash of bold colors, system fonts, and stark layouts? We do. This design is a deliberate homage to that time. The grays, the vibrant yellow, the pixelated edges—it's all meant to evoke a sense of nostalgia for a web that was less about sleek minimalism and more about unbridled information and personality.
        </p>
        <p>
          It’s not broken. It’s authentic.
        </p>

        <SubHeading>A Tribute to Hunter S. Thompson</SubHeading>
        <p>
          "When the going gets weird, the weird turn pro."
        </p>
        <p>
          Hunter S. Thompson was a master of chaos, a purveyor of truth through a distorted lens. His work on ESPN's Page 2, particularly his "Hey, Rube!" column, was a perfect marriage of sports, culture, and gonzo journalism. Muzzard is our digital nod to that legacy. It’s fast, a little bit weird, and it gets the job done without asking too many questions. It's a tool for the savage journey to the heart of the American dream... or at least for downloading some JPEGs.
        </p>
      </div>
    </section>
  );
};

export default AboutPage;
