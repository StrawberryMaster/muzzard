import React from 'react';

type RightSidebarProps = {
  navigate: (page: string) => void;
};


const RightSidebar = ({ navigate }: RightSidebarProps) => {
  const handleNav = (e: React.MouseEvent, page: string) => {
    e.preventDefault();
    navigate(page);
  };

  return (
    <aside className="bg-black text-white p-3 text-xs">
      <div className="border-b border-gray-500 pb-2 mb-2">
        <span className="font-bold text-lg tracking-tighter">MUZZARD</span>
      </div>
      
      <div className="mb-4">
        <a href="#" onClick={(e) => handleNav(e, 'hey-rube')} className="text-blue-400 underline hover:text-blue-300">hey, rube!</a>
      </div>

      <h4 className="font-bold uppercase mb-2 text-amber-400">ALSO SEE:</h4>
      <ul className="space-y-3">
        <li><a href="#" onClick={(e) => handleNav(e, 'help')} className="underline text-amber-400 hover:text-amber-300">How to use Muzzard</a></li>
        <li><a href="#" onClick={(e) => handleNav(e, 'help')} className="underline text-amber-400 hover:text-amber-300">Supported sites: Imgur, etc.</a></li>
        <li><a href="#" onClick={(e) => handleNav(e, 'help')} className="underline text-amber-400 hover:text-amber-300">Why are my downloads blocked?</a></li>
        <li><a href="#" onClick={(e) => handleNav(e, 'about')} className="underline text-amber-400 hover:text-amber-300">About the 2000s web aesthetic</a></li>
        <li><a href="#" onClick={(e) => handleNav(e, 'about')} className="underline text-amber-400 hover:text-amber-300">Tribute to Hunter S. Thompson</a></li>
      </ul>
    </aside>
  );
};

export default RightSidebar;
