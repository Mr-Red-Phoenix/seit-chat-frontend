import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import Sidebar from './dashboard/Sidebar.jsx';
import ChatList from './dashboard/ChatList.jsx';
import ActiveChat from './dashboard/ActiveChat.jsx';
import api from '../api/axios.config.js';
import toast from 'react-hot-toast';
import io from 'socket.io-client';
import VideoCallOverlay from './dashboard/VideoCallOverlay.jsx';

const Dashboard = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [loadingChats, setLoadingChats] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [callPartner, setCallPartner] = useState(null);
  const [callType, setCallType] = useState('video');
  // ---> NEW: Track who is online for the Green Dot
  const [onlineUsers, setOnlineUsers] = useState([]); 

  const [socket, setSocket] = useState(null);

  // ---> NEW: Use a Ref to track the open chat WITHOUT reconnecting the socket
  const selectedChatIdRef = useRef(selectedChatId);
  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  // 2. Socket Connection & Global Listeners
  useEffect(() => {
    const currentUserId = user?._id || user?.id; 
    
    if (!currentUserId) return; 

    // const newSocket = io("http://10.242.152.48:5000"); 
    const newSocket = io("https://seit-chat-backend.onrender.com");
    setSocket(newSocket);
  
    // 1. Fire setup ONLY when officially connected (handles wake-ups and server restarts)
    newSocket.on("connect", () => {
      newSocket.emit("setup", { _id: currentUserId }); 
    });
    // Catch if WE were kicked from a group by an admin
    newSocket.on("kicked_from_group", (kickedChatId) => {
      setChats(prev => prev.filter(c => String(c._id) !== String(kickedChatId)));
      
      // If we are currently looking at the chat we were kicked from, close it!
      if (String(selectedChatIdRef.current) === String(kickedChatId)) {
         setSelectedChatId(null);
         toast.error("You were removed from the group");
      }
    });
    // Catch live updates (renames, kicks, new groups) from other devices
    newSocket.on("chat_updated_live", (updatedChat) => {
      const myId = String(currentUserId);
      // Safety Check: Are we actually still inside the users array of this group?
      const amIStillInGroup = updatedChat.users.some(u => String(u._id || u) === myId);

      setChats(prev => {
        // ---> THE ULTIMATE KICK/LEAVE LOGIC <---
        if (!amIStillInGroup) {
          // If we left or got kicked, delete it from the sidebar permanently!
          return prev.filter(c => String(c._id) !== String(updatedChat._id));
        }

        // If we are still in it, and it's new, add it
        if (!prev.find(c => String(c._id) === String(updatedChat._id))) {
          return [updatedChat, ...prev];
        }
        // Otherwise, just update the name/members
        return prev.map(c => String(c._id) === String(updatedChat._id) ? updatedChat : c);
      });

      // If we are actively looking at a chat we were just removed from, slam it shut!
      if (!amIStillInGroup && String(selectedChatIdRef.current) === String(updatedChat._id)) {
        setSelectedChatId(null);
      }
    });

    // 2. Wipe the slate clean if the connection drops to prevent Ghost Users
    newSocket.on("disconnect", () => {
      setOnlineUsers([]); 
    });

    // ---> NEW: Listen for Online/Offline status
    // 1. Catch the initial list of everyone who was already online (Convert to Strings for safety)
    newSocket.on("online_users_list", (usersList) => {
      setOnlineUsers(usersList.map(String));
    });

    // 2. Handle people coming online/offline live (Convert to Strings for safety)
    newSocket.on("update_user_status", ({ userId, isOnline }) => {
      setOnlineUsers(prev => {
        const strId = String(userId);
        if (isOnline && !prev.includes(strId)) return [...prev, strId];
        if (!isOnline) return prev.filter(id => id !== strId);
        return prev;
      });
    });

    // ---> NEW: 3. Catch the unread messages from the database and populate the badges!
    newSocket.on("initial_unread_messages", (unreadMsgs) => {
      setNotifications(unreadMsgs);
    });

    const updateSidebar = (newMessage) => {
      setChats((prevChats) => {
        const incomingId = String(newMessage.chat?._id || newMessage.chat);
        const index = prevChats.findIndex(c => String(c._id) === incomingId);
        if (index > -1) {
          const updated = [...prevChats];
          updated[index] = { 
            ...updated[index], latestMessage: newMessage, updatedAt: newMessage.createdAt 
          };
          const [moved] = updated.splice(index, 1);
          return [moved, ...updated];
        }
        return prevChats;
      });
    };

    newSocket.on("message received", (msg) => {
      updateSidebar(msg);
      
      // ---> FIXED: Use the Ref instead of state to prevent socket reconnects
      const currentOpenId = String(selectedChatIdRef.current || "");
      const incomingChatId = String(msg.chat?._id || msg.chat);

      if (currentOpenId !== incomingChatId) {
        setNotifications(prev => {
          if (prev.some(n => String(n._id) === String(msg._id))) return prev;
          return [...prev, msg];
        });
      }
    });

    newSocket.on("message sent", (msg) => {
      updateSidebar(msg);
    });

    return () => newSocket.disconnect();
    
  // ---> FIXED: Removed selectedChatId from dependency array!
  }, [user?._id, user?.id]); 

  // 3. Initial Chat Fetch
  useEffect(() => {
    const fetchMyChats = async () => {
      try {
        const { data } = await api.get('/chats');
        setChats(data.data);
      } catch (error) {
        toast.error('Failed to load chats');
      } finally {
        setLoadingChats(false);
      }
    };
    fetchMyChats();
  }, []);

  const handleChatSelect = (chatId) => {
    setSelectedChatId(chatId);
    setNotifications(prev => prev.filter(n => n.chat._id !== chatId));
  };

  const currentChatData = chats.find(chat => chat._id === selectedChatId);

  const formattedConversations = chats
    // .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .sort((a, b) => {
       // Safely fall back to createdAt or current time if updatedAt is missing on new chats!
       const dateA = a.updatedAt ? new Date(a.updatedAt) : new Date(a.createdAt || Date.now());
       const dateB = b.updatedAt ? new Date(b.updatedAt) : new Date(b.createdAt || Date.now());
       return dateB - dateA;
    })
    .map(chat => {
      // ---> NEW: Check if it's a Group Chat first
      if (chat.isGroupChat) {
        return {
          id: chat._id,
          isGroupChat: true,
          partner: {
            id: chat._id, 
            name: chat.chatName || 'Unknown Group', // Uses the Group Name!
            avatar: ''
          },
          lastMessage: chat.latestMessage ? chat.latestMessage.content : 'No messages yet',
          timestamp: chat.updatedAt ? new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          isOnline: false // Groups don't have a single "online" green dot
        };
      }

      // ---> EXISTING: Logic for normal 1-on-1 chats
      const partner = chat.users.find(u => String(u._id) !== String(user?._id || user?.id));
      return {
        id: chat._id,
        isGroupChat: false,
        partner: {
          id: partner?._id,
          name: partner?.name || 'Unknown User',
          avatar: partner?.avatar || ''
        },
        lastMessage: chat.latestMessage ? chat.latestMessage.content : 'No messages yet',
        timestamp: chat.updatedAt ? new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        isOnline: onlineUsers.includes(String(partner?._id)) 
      };
    });

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f8f9fa] dark:bg-gray-900 font-sans">
      <div className={`${selectedChatId ? 'hidden md:flex' : 'flex'} h-full`}>
        <Sidebar currentUser={user} socket={socket} />
      </div>
      <div className={`${selectedChatId ? 'hidden md:flex' : 'flex'} w-full md:w-80 h-full flex-shrink-0`}>
        {loadingChats ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">Loading...</div>
        ) : (
          <ChatList 
            conversations={formattedConversations} 
            selectedChatId={selectedChatId} 
            setSelectedChatId={handleChatSelect}
            notifications={notifications} 
            setChats={setChats}
            socket={socket}
          />
        )}
      </div>
      <div className={`${!selectedChatId ? 'hidden md:flex' : 'flex'} flex-1 h-full fixed inset-0 z-50 md:relative md:z-0 bg-white dark:bg-gray-900`}>
        <ActiveChat 
          socket={socket} 
          chatData={formattedConversations.find(c => c.id === selectedChatId) || null} 
          rawChatData={chats.find(c => c._id === selectedChatId) || null} // <-- Add this line!
          currentUser={user} 
          onBack={() => setSelectedChatId(null)} 
          setChats={setChats}
          setIsVideoCallOpen={setIsVideoCallOpen}
          setCallPartner={setCallPartner}
          setCallType={setCallType}
        />
      </div>
      <VideoCallOverlay 
        socket={socket}
        currentUser={user}
        partner={callPartner}
        isVideoOpen={isVideoCallOpen}
        setIsVideoOpen={setIsVideoCallOpen}
        callType={callType}
        setCallType={setCallType} 
      />
    </div>
  );
};

export default Dashboard;