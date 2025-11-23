import React from 'react';
import { Home, Dumbbell, Trophy, User, Bell } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  notificationCount: number;
}

const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, notificationCount }) => {
  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'workout', icon: Dumbbell, label: 'Workout' },
    { id: 'leaderboard', icon: Trophy, label: 'Rank' },
    { id: 'profile', icon: User, label: 'Me' },
    { id: 'inbox', icon: Bell, label: 'Inbox', badge: notificationCount }
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-slate-950 border-t border-slate-800 pb-safe-area z-50">
      <div className="flex justify-around items-center h-16 w-full max-w-md lg:max-w-4xl xl:max-w-6xl mx-auto">
        {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
                <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`relative flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200 ${
                        isActive ? 'text-orange-500' : 'text-slate-500 hover:text-slate-300'
                    }`}
                >
                    <div className="relative">
                        <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                        {item.badge ? (
                            <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                                {item.badge}
                            </span>
                        ) : null}
                    </div>
                    <span className="text-[10px] font-medium">{item.label}</span>
                </button>
            );
        })}
      </div>
    </nav>
  );
};

export default Navbar;
