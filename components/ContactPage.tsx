import React from 'react';

const ContactPage = () => {
  return (
    <section className="bg-[#fcc603] p-6 text-black font-serif border-t-4 border-black">
      <h1 className="text-3xl font-extrabold text-red-800 font-sans" style={{ textShadow: '1px 1px 0 #000' }}>Contact Us</h1>
      <p className="text-sm font-sans mb-6 text-gray-800">Send a signal into the ether</p>

      <div className="space-y-4 text-sm leading-relaxed">
        <p>
          Got a problem? A suggestion? A hot tip on a story about psychic lizards in the athletic commission? Don't call us. We don't have a phone.
        </p>
        
        <p>
          In the spirit of the old guard, communication should be deliberate, not instantaneous. We don't have email. We don't have a Discord. We don't have a "social media presence."
        </p>

        <p className="font-bold mt-6">
          If you must reach us, here's how:
        </p>
        <p>
            Scrawl your message on a cocktail napkin. Hand it to a bartender at a dive bar off the Vegas strip. Tell them it's for "The Doctor." If your message is worthy, it'll find us. Maybe.
        </p>
        <p className="italic text-xs">
            (For bug reports and less esoteric matters, just imagine you're shouting into a fan. It's about as effective and far more therapeutic.)
        </p>
      </div>
    </section>
  );
};

export default ContactPage;
