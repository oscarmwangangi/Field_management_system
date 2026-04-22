import type { ReactNode } from 'react';
import { useState } from 'react';
import Sidebar from "../components/reusables/Sidebar.tsx";
import { Outlet } from 'react-router-dom';

interface LayoutProps {
    children?: React.ReactNode;
}
const Layout = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />
      
      {/* Main Content Area */}
      <main className="flex-1 p-6 transition-all duration-300">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="mb-4 p-2 bg-blue-600 text-black rounded-md hover:bg-blue-700"
        >
          {isOpen ? 'Close Sidebar' : 'Open Sidebar'}
        </button>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;