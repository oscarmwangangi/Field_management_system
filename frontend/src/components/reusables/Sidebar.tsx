import React from 'react';
import { Link, NavLink } from 'react-router-dom';

interface SidebarProps {
    isOpen: boolean,
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
}
const sidebar = [
  {lable:"Dashboard", to:"/"},
  {lable:"Report", to:"/reports"},
  {lable:"My fields", to:"/fields"},
  {lable:"Agents", to:"/agents"},
]
const Sidebar = ({ isOpen, setIsOpen }: SidebarProps) => {
  return (
    <aside 
      className={`${
        isOpen ? 'w-64' : 'w-0'
      } bg-gray-800 text-white transition-all duration-300 overflow-hidden shrink-0`}
    >
      <div className="p-4">
        <h2 className="text-xl font-bold mb-6 whitespace-nowrap">My App</h2>
        <nav className="space-y-4">
          {/* <a href="#" className="block hover:text-blue-400 whitespace-nowrap">Dashboard</a>
          <a href="/profile" className="block hover:text-blue-400 whitespace-nowrap">Profile</a>
          <a href="#" className="block hover:text-blue-400 whitespace-nowrap">Settings</a> */}

          {sidebar.map((item , index) => {
          const  isActive = location.pathname === item.to
            return(
              <>
              <div key={index}>
                <Link to={item.to}
                className={`block hover:text-blue-400 whitespace-nowrap 
                  ${isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'

                  }`}


                
                >
                <div className="text-sm font-medium tracking-wide">
                  { item.lable}


                </div>
               
                </Link>
              </div>
              </>
            )

          }
        )}

        

        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;