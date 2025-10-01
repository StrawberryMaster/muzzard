import React from 'react';

const HeyRubePage = () => {
  return (
    <section className="bg-[#fcc603] p-6 text-black font-serif border-t-4 border-black">
      <h1 className="text-3xl font-extrabold text-red-800 font-sans" style={{ textShadow: '1px 1px 0 #000' }}>Hey, Rube!</h1>
      <p className="text-sm font-sans mb-6 text-gray-800">A Call to the Weird</p>

      <div className="space-y-4 text-sm leading-relaxed">
        <p className="text-base">
          "The sports world is a carnival, a rolling circus of freaks and heroes, and it's our job to be the ones shouting in the back of the tent."
        </p>
        
        <p>
          That was the ethos. "Hey, Rube!" wasn't just a column title; it was a carny's call to arms. A signal that things were about to get ugly, and help was needed from your fellow carnies to fight off the hostile townies. A call for solidarity among the strange.
        </p>

        <p>
          In the digital age, we're all townies, and we're all carnies. This corner of the web is for the carnies. For the ones who remember the noise, the chaos, and the sheer, unadulterated thrill of the game—any game.
        </p>
        <p className="font-bold">
          So, welcome. You heard the call.
        </p>
      </div>
    </section>
  );
};

export default HeyRubePage;
