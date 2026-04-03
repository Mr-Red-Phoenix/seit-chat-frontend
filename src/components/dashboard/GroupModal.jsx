import React, { useState } from 'react';
import { Search, X, Loader2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios.config.js';

const GroupModal = ({ isOpen, onClose, onChatCreated, socket }) => {
  const [groupChatName, setGroupChatName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);

  if (!isOpen) return null;

  // 1. Search for users to add
  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.get(`/users?search=${query}`);
      setSearchResults(data.data);
    } catch (error) {
      toast.error('Failed to load search results');
    } finally {
      setLoading(false);
    }
  };

  // 2. Add a user to the "Selected" list
  const handleGroupAdd = (userToAdd) => {
    if (selectedUsers.some((u) => u._id === userToAdd._id)) {
      toast.error("User already added");
      return;
    }
    setSelectedUsers([...selectedUsers, userToAdd]);
  };

  // 3. Remove a user from the "Selected" list
  const handleDelete = (delUser) => {
    setSelectedUsers(selectedUsers.filter((sel) => sel._id !== delUser._id));
  };

  // 4. Submit to Backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupChatName || !selectedUsers) {
      toast.error("Please fill all the fields");
      return;
    }
    if (selectedUsers.length < 2) {
      toast.error("A group requires at least 2 other members");
      return;
    }

    setCreatingGroup(true);
    try {
      const { data } = await api.post('/chats/group', {
        name: groupChatName,
        users: selectedUsers.map((u) => u._id),
      });
      if (socket) socket.emit("sync_chat_update", data.data);
      onChatCreated(data.data); // Update sidebar
      toast.success("New Group Chat Created!");
      
      // Reset & Close
      setGroupChatName('');
      setSelectedUsers([]);
      setSearchQuery('');
      setSearchResults([]);
      onClose();
    } catch (error) {
      toast.error("Failed to create group");
    } finally {
      setCreatingGroup(false);
    }
  };

  // Helper for initials
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Users size={20} className="text-[#FF9800]" /> Create Group Chat
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4 overflow-y-auto customized-scrollbar">
          {/* Group Name Input */}
          <input
            type="text"
            placeholder="Group Name"
            value={groupChatName}
            onChange={(e) => setGroupChatName(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#FF9800]/50 outline-none text-gray-900 dark:text-white transition-all"
          />

          {/* Search Input */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search users to add..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#FF9800]/50 outline-none text-gray-900 dark:text-white transition-all"
            />
          </div>

          {/* Selected Users Chips */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map(u => (
                <span key={u._id} className="flex items-center gap-1 bg-[#4CAF50]/10 text-[#4CAF50] px-3 py-1 rounded-full text-xs font-semibold border border-[#4CAF50]/20">
                  {u.name}
                  <X size={14} className="cursor-pointer hover:text-red-500" onClick={() => handleDelete(u)} />
                </span>
              ))}
            </div>
          )}

          {/* Search Results */}
          <div className="flex-1 min-h-[150px]">
            {loading ? (
              <div className="flex justify-center py-4"><Loader2 className="animate-spin text-[#FF9800]" /></div>
            ) : (
              <div className="space-y-1">
                {searchResults?.slice(0, 4).map((user) => (
                  <div
                    key={user._id}
                    onClick={() => handleGroupAdd(user)}
                    className="flex items-center gap-3 p-2 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF9800] to-[#4CAF50] flex items-center justify-center text-white font-medium text-xs">
                      {getInitials(user.name)}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white leading-none">{user.name}</h4>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Button */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <button 
            onClick={handleSubmit}
            disabled={creatingGroup || selectedUsers.length < 2 || !groupChatName}
            className="w-full py-2.5 bg-gradient-to-r from-[#FF9800] to-[#4CAF50] hover:opacity-90 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex justify-center items-center gap-2"
          >
            {creatingGroup ? <Loader2 className="animate-spin" size={18} /> : "Create Group"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default GroupModal;