import React, { useState } from 'react';
import { 
  MessageSquare, 
  Phone, 
  Video,       // Added Video
  Users, 
  LayoutGrid,  // Restored Apps
  FileText, 
  Settings, 
  LogOut,
  Moon,
  Sun
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { useNavigate } from 'react-router-dom';

const Sidebar = ({ currentUser, socket }) => {
  const [activeTab, setActiveTab] = useState('messages');
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Top navigation menu items (Added Video and Apps back)
  const navItems = [
    { id: 'messages', icon: MessageSquare, label: 'Messages' },
    { id: 'calls', icon: Phone, label: 'Voice Calls' },
    { id: 'video', icon: Video, label: 'Video Calls' },
    { id: 'contacts', icon: Users, label: 'Contacts' },
    { id: 'apps', icon: LayoutGrid, label: 'Apps' },
    { id: 'files', icon: FileText, label: 'Files' }
  ];

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const handleLogout = () => {
    if (socket) socket.disconnect(); // Kills the socket immediately
    localStorage.removeItem("userInfo"); // Or however you clear your auth token
    localStorage.clear(); 
    sessionStorage.clear();
    window.location.href = "/login"; // Force a hard refresh to clear React state
  };

  return (
    <div className="w-20 lg:w-24 h-full bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col items-center py-6 justify-between transition-colors duration-300 z-10 flex-shrink-0">
      
      {/* TOP: Brand Logo (Horizontal and snug) */}
      <div className="flex flex-col items-center cursor-pointer mb-8 mt-2">
        <div className="flex items-center justify-center font-black text-3xl leading-none">
          <span className="text-[#FF9800]">S</span>
          {/* -ml-1 pulls the C slightly closer to the S */}
          <span className="text-[#4CAF50] -ml-1">C</span>
        </div>
      </div>

      {/* MIDDLE: Primary Navigation Icons */}
      <nav className="flex flex-col gap-2 w-full px-4 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex items-center justify-center p-3 w-full rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-orange-50 dark:bg-gray-800 text-[#FF9800]' 
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
              title={item.label}
            >
              {isActive && (
                <span className="absolute left-0 w-1 h-8 bg-[#FF9800] rounded-r-full -ml-4"></span>
              )}
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            </button>
          );
        })}
      </nav>

      {/* BOTTOM: System Utilities & User Profile */}
      <div className="flex flex-col gap-2 items-center mt-auto pb-2 w-full px-4">
        
        {/* Settings Button */}
        <button 
          onClick={() => setActiveTab('settings')}
          className={`relative flex items-center justify-center p-3 w-full rounded-xl transition-all duration-200 group ${
            activeTab === 'settings' 
              ? 'bg-orange-50 dark:bg-gray-800 text-[#FF9800]' 
              : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
          }`}
          title="Settings"
        >
          {activeTab === 'settings' && (
            <span className="absolute left-0 w-1 h-8 bg-[#FF9800] rounded-r-full -ml-4"></span>
          )}
          <Settings size={22} strokeWidth={activeTab === 'settings' ? 2.5 : 2} />
        </button>

        {/* Theme Toggle Button */}
        <button 
          onClick={toggleTheme}
          className="p-3 w-full flex justify-center text-gray-400 hover:text-[#FF9800] hover:bg-orange-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
          title="Toggle Theme"
        >
          {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
        </button>

        {/* Logout Button */}
        <button 
          onClick={handleLogout}
          className="p-3 w-full flex justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors mb-2"
          title="Logout"
        >
          <LogOut size={22} />
        </button>

        {/* User Avatar */}
        <div className="relative cursor-pointer group mt-2">
          {currentUser?.avatar ? (
            <img 
              src={currentUser.avatar} 
              alt={currentUser.name} 
              className="w-11 h-11 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-sm"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#FF9800] to-[#4CAF50] flex items-center justify-center text-white font-medium shadow-sm border-2 border-white dark:border-gray-800">
              {getInitials(currentUser?.name || currentUser?.username || "User")}
            </div>
          )}
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></span>
        </div>
      </div>

    </div>
  );
};

export default Sidebar;