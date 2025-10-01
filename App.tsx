import React, { useState } from 'react';
import Header from './components/Header';
import LeftSidebar from './components/LeftSidebar';
import MainContent from './components/MainContent';
import RightSidebar from './components/RightSidebar';
import AboutPage from './components/AboutPage';
import HelpPage from './components/HelpPage';
import ContactPage from './components/ContactPage';
import HeyRubePage from './components/HeyRubePage';

function App() {
  const [page, setPage] = useState('home');

  const navigate = (pageName: string) => {
    setPage(pageName);
    window.scrollTo(0, 0);
  };

  const renderPage = () => {
    switch (page) {
      case 'about':
        return <AboutPage />;
      case 'help':
        return <HelpPage />;
      case 'contact':
        return <ContactPage />;
      case 'hey-rube':
        return <HeyRubePage />;
      case 'home':
      default:
        return <MainContent />;
    }
  };

  return (
    <div className="bg-[#585858] min-h-screen font-sans pb-10">
      <div className="container mx-auto max-w-6xl">
        <Header navigate={navigate} />
        <main className="grid grid-cols-1 md:grid-cols-[200px_1fr_250px] gap-4 pt-4 px-2 md:px-0">
          <LeftSidebar navigate={navigate} />
          {renderPage()}
          <RightSidebar navigate={navigate} />
        </main>
      </div>
    </div>
  );
}

export default App;
