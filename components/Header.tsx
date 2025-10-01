import React from 'react';

type HeaderProps = {
  navigate: (page: string) => void;
};

const Header = ({ navigate }: HeaderProps) => {
  const handleNav = (e: React.MouseEvent, page: string) => {
    e.preventDefault();
    navigate(page);
  };

  return (
    <header className="bg-black text-gray-400 text-xs py-1 px-2 border-b-4 border-[#3a3a3a]">
      <div className="flex justify-end items-center space-x-4">
        <span>MUZZARD Network:</span>
        <a href="#" onClick={(e) => handleNav(e, 'home')} className="text-white underline hover:text-amber-400">Home</a>
        <a href="#" onClick={(e) => handleNav(e, 'about')} className="text-white underline hover:text-amber-400">About</a>
        <a href="#" onClick={(e) => handleNav(e, 'contact')} className="text-white underline hover:text-amber-400">Contact</a>
        <a href="#" onClick={(e) => handleNav(e, 'help')} className="text-white underline hover:text-amber-400">FAQ</a>
      </div>
    </header>
  );
};

export default Header;
