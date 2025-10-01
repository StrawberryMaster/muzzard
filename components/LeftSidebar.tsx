import React from 'react';
import { DownloadIcon, LinkIcon, InfoIcon } from './icons';

type LeftSidebarProps = {
    navigate: (page: string) => void;
};

const LeftSidebar = ({ navigate }: LeftSidebarProps) => {
    const handleNav = (e: React.MouseEvent, page: string) => {
        e.preventDefault();
        navigate(page);
    };

    return (
        <aside className="text-white">
            {/* Logo */}
            <a href="#" onClick={(e) => handleNav(e, 'home')} className="block bg-black p-2 border-2 border-gray-400 font-black text-center hover:border-amber-400 transition-colors">
                <div className="text-xl tracking-tighter">muzzard</div>
                <div className="text-[10px] text-gray-400">IMAGE DOWNLOADER</div>
            </a>

            {/* Tools */}
            <div className="mt-8">
                <h3 className="text-sm font-bold tracking-wider text-gray-300">TOOLS</h3>
                <ul className="mt-2 space-y-2 text-xs">
                    <li className="flex items-center">
                        <DownloadIcon className="w-4 h-4 mr-2 text-amber-400" />
                        <a href="#" onClick={(e) => handleNav(e, 'home')} className="text-amber-400 underline hover:text-amber-300">Batch Download</a>
                    </li>
                    <li className="flex items-center">
                        <LinkIcon className="w-4 h-4 mr-2 text-amber-400" />
                        <a href="#" onClick={(e) => handleNav(e, 'help')} className="text-amber-400 underline hover:text-amber-300">Supported Sites</a>
                    </li>
                    <li className="flex items-center">
                        <InfoIcon className="w-4 h-4 mr-2 text-amber-400" />
                        <a href="#" onClick={(e) => handleNav(e, 'about')} className="text-amber-400 underline hover:text-amber-300">About Muzzard</a>
                    </li>
                </ul>
            </div>
        </aside>
    );
};

export default LeftSidebar;
