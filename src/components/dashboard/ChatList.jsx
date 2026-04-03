import React, { useState } from 'react';
import { Search, Edit, UserPlus } from 'lucide-react';
import SearchModal from './SearchModal.jsx'; 
import GroupModal from './GroupModal.jsx';

const ChatList = ({ conversations, selectedChatId, setSelectedChatId, notifications, setChats, socket }) => {
  const [filter, setFilter] = useState('All');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false); // <-- ADD THIS
  
  // FIX 1: Explicitly initialize as empty string to prevent uncontrolled input warning
  const [searchQuery, setSearchQuery] = useState(''); 

  // Helper for Initials
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

return (
    <div className="w-80 h-full bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col transition-colors duration-300 flex-shrink-0">
      
      {/* 1. HEADER SECTION */}
      <div className="p-6 pb-2">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Messages</h2>
          <div className="flex gap-1">
            <button 
              onClick={() => setIsGroupModalOpen(true)} 
              title="Create Group"
              className="p-2 text-gray-400 hover:text-[#4CAF50] transition-colors"
            >
              <UserPlus size={20} />
            </button>
            <button 
              onClick={() => setIsSearchModalOpen(true)} 
              title="New Chat"
              className="p-2 text-gray-400 hover:text-[#FF9800] transition-colors"
            >
              <Edit size={20} />
            </button>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="relative mb-6">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages..." 
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500/50 outline-none dark:text-white transition-all"
          />
        </div>

        {/* FILTER TABS */}
        <div className="flex gap-2 mb-2">
          {['All', 'Personal', 'Groups'].map(tab => (
            <button 
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === tab 
                  ? 'bg-[#FF9800] text-white shadow-sm' 
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* 2. CONVERSATION LIST (Scrollable) */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 customized-scrollbar">
        <p className="px-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 mt-2">Pinned</p>
        
        {conversations
          .filter(chat => 
            chat.partner?.name?.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((chat) => {
            // FIX 2: Ensure these variables are INSIDE the .map loop
            const unreadCount = notifications?.filter(n => String(n.chat._id) === String(chat.id)).length || 0;
            const isSelected = selectedChatId === chat.id;

          return (
            <div 
              key={chat.id} 
              onClick={() => setSelectedChatId(chat.id)}
              className={`group relative flex items-center gap-3 p-4 cursor-pointer transition-all duration-200 rounded-xl
                ${isSelected ? 'bg-blue-50/80 dark:bg-gray-800/50' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'}`}
            >
              {/* AVATAR */}
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#FF9800] to-[#4CAF50] flex items-center justify-center text-white font-bold shadow-sm">
                  {chat.partner?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                {/* Green Dot Indicator */}
                {chat.isOnline && (
                   <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></span>
                )}
              </div>

              {/* CHAT INFO */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3 className={`text-sm font-semibold truncate ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                    {chat.partner.name}
                  </h3>
                  <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap ml-2">
                    {chat.timestamp}
                  </span>
                </div>
                
                <div className="flex justify-between items-center gap-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1">
                    {chat.lastMessage}
                  </p>
                  
                  {unreadCount > 0 && (
                    <span className="bg-[#4CAF50] text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center animate-bounce shadow-sm">
                      {unreadCount}
                    </span>
                  )}
                </div>
              </div>

              {/* ACTIVE INDICATOR LINE */}
              {isSelected && (
                <div className="absolute left-0 top-4 bottom-4 w-1 bg-blue-500 rounded-r-full"></div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. THE SEARCH MODAL */}
      <SearchModal 
        isOpen={isSearchModalOpen} 
        onClose={() => setIsSearchModalOpen(false)} 
        socket={socket}
        onChatCreated={(newChatData) => {
          setChats(prev => [newChatData, ...prev]); // <--- ADD THIS
          setSelectedChatId(newChatData._id); 
        }} 
      />
      <GroupModal 
        isOpen={isGroupModalOpen} 
        onClose={() => setIsGroupModalOpen(false)} 
        socket={socket}
        onChatCreated={(newChatData) => {
          setChats(prev => [newChatData, ...prev]); // <--- ADD THIS
          setSelectedChatId(newChatData._id); 
        }} 
      />
    </div>
  );
};

export default ChatList;