import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Map,
  Users,
  LogOut,
} from "lucide-react";
import logout from "../constants/logout";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

interface SidebarItem {
  label: string;
  to: string;
  icon: React.ReactNode;
}

const sidebar: SidebarItem[] = [
  { label: "Dashboard", to: "/admin/dashboard", icon: <LayoutDashboard size={18} /> },
  { label: "Reports", to: "/admin/reports", icon: <FileText size={18} /> },
  { label: "My Fields", to: "/admin/fields", icon: <Map size={18} /> },
  { label: "Agents", to: "/admin/agents", icon: <Users size={18} /> },
];

const Sidebar = ({ isOpen }: SidebarProps) => {
  const location = useLocation();

  return (
    <aside
      className={`${
        isOpen ? "w-64" : "w-0"
      } bg-slate-900 border-r border-slate-800 h-screen sticky top-0  text-white transition-all duration-300 overflow-hidden flex flex-col`}
    >
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-800">
        <h2 className="text-xl font-semibold tracking-wide text-emerald-400">
          CropProgress
        </h2>
        <p className="text-xs text-slate-400">Admin Panel</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {sidebar.map((item) => {
          const isActive = location.pathname === item.to;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200
              ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className="opacity-80">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;