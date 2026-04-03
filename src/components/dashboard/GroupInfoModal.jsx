import React, { useState } from 'react';
import { Search, X, Loader2, Edit2, UserMinus, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios.config.js';

const GroupInfoModal = ({ isOpen, onClose, chatData, currentUser, onUpdateChat, socket }) => {
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [renaming, setRenaming] = useState(false);

  if (!isOpen || !chatData) return null;

  // Check if current user is the admin
  const isAdmin = String(chatData.groupAdmin?._id || chatData.groupAdmin) === String(currentUser?._id || currentUser?.id);

  // 1. Rename Group
  const handleRename = async () => {
    if (!groupName.trim()) return;
    setRenaming(true);
    try {
      const { data } = await api.put('/chats/rename', {
        chatId: chatData._id,
        chatName: groupName,
      });
      if (socket) socket.emit("sync_chat_update", data.data);
      onUpdateChat(data.data); // Update the UI
      setGroupName('');
      toast.success("Group renamed!");
    } catch (error) {
      toast.error("Failed to rename group");
    } finally {
      setRenaming(false);
    }
  };

  // 2. Search for new users to add
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
      toast.error("Failed to search users");
    } finally {
      setLoading(false);
    }
  };

  // 3. Add User to Group
  const handleAddUser = async (userToAdd) => {
    if (chatData.users.find((u) => u._id === userToAdd._id)) {
      toast.error("User is already in the group!");
      return;
    }
    if (!isAdmin) {
      toast.error("Only admins can add users!");
      return;
    }

    try {
      const { data } = await api.put('/chats/groupadd', {
        chatId: chatData._id,
        userId: userToAdd._id,
      });
      if (socket) socket.emit("sync_chat_update", data.data);
      onUpdateChat(data.data);
      setSearchQuery('');
      setSearchResults([]);
      toast.success(`${userToAdd.name} added!`);
    } catch (error) {
      toast.error("Failed to add user");
    }
  };

  // 4. Remove User (Admin Kicking Someone)
  const handleRemove = async (userToRemove) => {
    if (!isAdmin) {
      toast.error("Only admins can remove users!");
      return;
    }
    // ---> NEW: STRICT SELF-REMOVE BLOCK <---
    if (String(userToRemove._id || userToRemove.id) === String(currentUser?._id || currentUser?.id)) {
      toast.error("Please use the 'Leave Group' button at the bottom instead.");
      return;
    }
    try {
      const { data } = await api.put('/chats/groupremove', {
        chatId: chatData._id,
        userId: userToRemove._id || userToRemove.id,
      });
      if (socket) {
        socket.emit("sync_chat_update", data.data); // Updates the remaining users
        socket.emit("kick_user", { chatId: chatData._id, userId: userToRemove._id || userToRemove.id }); // Updates the kicked user
      }
      onUpdateChat(data.data, false);
      toast.success(`${userToRemove.name} removed!`);
    } catch (error) {
      toast.error("Failed to remove user");
    }
  };

  // 5. Leave Group (Anyone can do this)
  const handleLeaveGroup = async () => {
    try {
      const { data } = await api.put('/chats/groupremove', {
        chatId: chatData._id,
        userId: currentUser?._id || currentUser?.id, // Safely grabs your exact ID
      });
      if (socket) socket.emit("sync_chat_update", data.data);
      onUpdateChat(data.data, true); // true = We are leaving, trigger sidebar removal
      toast.success("You left the group");
    } catch (error) {
      toast.error("Failed to leave group");
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate pr-4">
            {chatData.chatName}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full transition-colors bg-white dark:bg-gray-800 shadow-sm">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-6 overflow-y-auto customized-scrollbar">
          
          {/* Update Name Section */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="New group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#FF9800]/50 outline-none text-gray-900 dark:text-white transition-all text-sm"
            />
            <button
              onClick={handleRename}
              disabled={renaming || !groupName}
              className="px-4 py-2 bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center"
            >
              {renaming ? <Loader2 className="animate-spin" size={18} /> : <Edit2 size={18} />}
            </button>
          </div>

          {/* Search to Add Users (Admin Only) */}
          {isAdmin && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Add Members</h3>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#4CAF50]/50 outline-none text-gray-900 dark:text-white transition-all text-sm"
                />
              </div>
              
              {/* Search Results */}
              {loading ? (
                <div className="flex justify-center py-2"><Loader2 className="animate-spin text-[#4CAF50]" size={20} /></div>
              ) : (
                <div className="space-y-1">
                  {searchResults?.slice(0, 3).map((user) => (
                    <div key={user._id} onClick={() => handleAddUser(user)} className="flex items-center justify-between p-2 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                      <div className="flex items-center gap-2">
                         <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF9800] to-[#4CAF50] flex items-center justify-center text-white text-xs font-bold">{user.name[0].toUpperCase()}</div>
                         <span className="text-sm font-medium dark:text-white">{user.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Participant List */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Participants ({chatData.users?.length})
            </h3>
            <div className="space-y-1 bg-gray-50 dark:bg-gray-800/30 rounded-xl p-2 border border-gray-100 dark:border-gray-800">
              {chatData.users?.map(u => (
                <div key={u._id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-400 to-gray-600 flex items-center justify-center text-white text-xs font-bold">
                      {u.name[0].toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium dark:text-white flex items-center gap-2">
                        {u.name} 
                        {chatData.groupAdmin?._id === u._id && <span className="text-[9px] bg-[#4CAF50]/10 text-[#4CAF50] px-1.5 py-0.5 rounded border border-[#4CAF50]/20">Admin</span>}
                      </span>
                    </div>
                  </div>               
                {/* Remove Button for Admin */}
                  {isAdmin && String(u._id) !== String(currentUser?._id || currentUser?.id) && (
                    <button onClick={() => handleRemove(u)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors" title="Remove User">
                      <UserMinus size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer - Leave Group */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <button 
            onClick={handleLeaveGroup}
            className="w-full py-2.5 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white dark:bg-red-500/10 dark:hover:bg-red-500 border border-red-200 dark:border-red-500/30 font-bold rounded-xl transition-all flex justify-center items-center gap-2"
          >
            <LogOut size={18} /> Leave Group
          </button>
        </div>

      </div>
    </div>
  );
};

export default GroupInfoModal;