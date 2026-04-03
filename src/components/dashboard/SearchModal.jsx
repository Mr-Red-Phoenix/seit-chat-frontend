import React, { useState } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios.config.js'; // Using your existing axios config!

const SearchModal = ({ isOpen, onClose, onChatCreated, socket }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  if (!isOpen) return null;

  // 1. Search for users in the database
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      // Hits your new userController!
      const { data } = await api.get(`/users?search=${searchQuery}`);
      setSearchResults(data.data);
    } catch (error) {
      toast.error('Failed to load search results');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 2. Click a user to start a chat
  const accessChat = async (userId) => {
    setLoadingChat(true);
    try {
      // Hits your new chatController!
      const { data } = await api.post('/chats', { userId });
      if (socket) socket.emit("sync_chat_update", data.data);
      onChatCreated(data.data); // Tell the dashboard we made a chat!
      onClose(); // Close the modal
    } catch (error) {
      toast.error('Error fetching the chat');
    } finally {
      setLoadingChat(false);
    }
  };

  // Helper for initials
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col max-h-[80vh]">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New Chat</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <form onSubmit={handleSearch} className="relative flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or @username..."
              className="w-full pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#FF9800]/50 outline-none text-gray-900 dark:text-white transition-all"
              autoFocus
            />
            <button type="submit" className="absolute right-2 p-1.5 text-gray-400 hover:text-[#FF9800] transition-colors">
              <Search size={18} />
            </button>
          </form>
        </div>

        {/* Search Results List */}
        <div className="flex-1 overflow-y-auto p-2 min-h-[200px]">
          {loading ? (
            <div className="flex justify-center items-center h-full text-[#4CAF50]">
              <Loader2 className="animate-spin" size={28} />
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-1">
              {searchResults.map((user) => (
                <div
                  key={user._id}
                  onClick={() => accessChat(user._id)}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#FF9800] to-[#4CAF50] flex items-center justify-center text-white font-medium text-sm">
                      {getInitials(user.name)}
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white leading-none">{user.name}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">@{user.username}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex justify-center items-center h-full text-sm text-gray-500">
              {searchQuery ? "No users found." : "Type a name to search."}
            </div>
          )}
        </div>

        {/* Loading Overlay when creating chat */}
        {loadingChat && (
          <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm flex items-center justify-center">
            <Loader2 className="animate-spin text-[#FF9800]" size={32} />
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchModal;