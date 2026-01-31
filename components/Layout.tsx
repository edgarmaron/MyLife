import React from 'react';
import { Home, Wallet, TrendingUp, Activity, Settings } from 'lucide-react';
import { Section } from '../types';

interface LayoutProps {
  children?: React.ReactNode;
  activeTab: Section;
  onTabChange: (tab: Section) => void;
}

const NavItem = ({ 
  icon: Icon, 
  label, 
  isActive, 
  onClick 
}: { 
  icon: React.ElementType; 
  label: string; 
  isActive: boolean; 
  onClick: () => void; 
}) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full h-full space-y-1.5 transition-all duration-300 group ${
      isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
    }`}
  >
    <div className={`transition-transform duration-300 ${isActive ? 'scale-110 -translate-y-0.5' : 'group-hover:scale-105'}`}>
      <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
    </div>
    <span className={`text-[10px] font-semibold tracking-wide transition-opacity ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>
      {label}
    </span>
  </button>
);

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100">
      {/* Content */}
      <main className="min-h-screen">
        {children}
      </main>

      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-[88px] bg-white/90 backdrop-blur-lg border-t border-slate-200/50 flex items-start pt-2 justify-around z-40 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
        <NavItem icon={Home} label="Home" isActive={activeTab === Section.DASHBOARD} onClick={() => onTabChange(Section.DASHBOARD)} />
        <NavItem icon={Wallet} label="Cash" isActive={activeTab === Section.CASH} onClick={() => onTabChange(Section.CASH)} />
        <NavItem icon={TrendingUp} label="Invest" isActive={activeTab === Section.INVEST} onClick={() => onTabChange(Section.INVEST)} />
        <NavItem icon={Activity} label="Health" isActive={activeTab === Section.HEALTH} onClick={() => onTabChange(Section.HEALTH)} />
        <NavItem icon={Settings} label="Settings" isActive={activeTab === Section.SETTINGS} onClick={() => onTabChange(Section.SETTINGS)} />
      </div>
    </div>
  );
};