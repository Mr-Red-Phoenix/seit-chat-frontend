import React, { useState, useEffect, useRef } from 'react';
import { Phone, Video, MoreVertical, Send, ArrowLeft, Loader2, CheckCheck, Check } from 'lucide-react'; // Added Check for single tick
import api from '../../api/axios.config.js';
import toast from 'react-hot-toast';
import GroupInfoModal from './GroupInfoModal.jsx';
// import VideoCallOverlay from './VideoCallOverlay.jsx';

const ActiveChat = ({ chatData, rawChatData, currentUser, onBack, socket, setChats, setIsVideoCallOpen, setCallPartner, setCallType }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false); 
  const [typing, setTyping] = useState(false);   
  const [typingUser, setTypingUser] = useState("");  
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  
  // const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);

  const messagesEndRef = useRef(null);

  // 1. Trigger "Read" when opening a chat
  useEffect(() => {
    if (chatData?.id && socket) {
      // Tell the backend we are looking at this chat, so mark everything as read
      socket.emit("mark_chat_read", { 
        chatId: chatData.id,
         userId: currentUser?._id || currentUser?.id 
        });
    }
  }, [chatData?.id, socket, currentUser?._id]);


  // 2. Listen for Tick Status Updates (Delivered & Read)
  useEffect(() => {
    if (!socket) return;
    // ---> ADD THESE NEW GROUP HANDLERS <---
    const handleGroupDelivered = ({ chatId }) => {
      if (chatData?.id === chatId) {
        setMessages(prev => prev.map(msg => 
          (msg.status === 'sent' && String(msg.sender?._id || msg.sender) === String(currentUser?._id || currentUser?.id)) 
            ? { ...msg, status: 'delivered' } 
            : msg
        ));
      }
    };

    const handleGroupRead = ({ chatId }) => {
      if (chatData?.id === chatId) {
        setMessages(prev => prev.map(msg => 
          ((msg.status === 'sent' || msg.status === 'delivered') && String(msg.sender?._id || msg.sender) === String(currentUser?._id || currentUser?.id)) 
            ? { ...msg, status: 'read' } 
            : msg
        ));
      }
    };

    // Handle Double Grey Tick (Delivered)
    const handleDelivered = ({ receiverId }) => {
      setMessages(prev => prev.map(msg => 
        // If the message is currently 'sent' and we sent it, turn it to 'delivered'
        (msg.status === 'sent' && String(msg.sender?._id || msg.sender) === String(currentUser?._id || currentUser?.id)) 
          ? { ...msg, status: 'delivered' } 
          : msg
      ));
    };

    // Handle Double Blue Tick (Read)
    const handleRead = ({ chatId, readerId }) => {
      if (chatData?.id === chatId) {
        // Only force instant blue ticks for 1-on-1 chats to prevent false group reads
        if (!chatData.isGroupChat) {
          setMessages(prev => prev.map(msg => 
            ((msg.status === 'sent' || msg.status === 'delivered') && String(msg.sender?._id || msg.sender) === String(currentUser?._id || currentUser?.id))
              ? { ...msg, status: 'read' } 
              : msg
          ));
        }
      }
    };

    socket.on("messages_delivered", handleDelivered);
    socket.on("messages_read_by_user", handleRead);
    socket.on("group_messages_delivered", handleGroupDelivered); // NEW
    socket.on("group_messages_read", handleGroupRead);           // NEW

    return () => {
      socket.off("messages_delivered", handleDelivered);
      socket.off("messages_read_by_user", handleRead);
      socket.off("group_messages_delivered", handleGroupDelivered); // NEW
      socket.off("group_messages_read", handleGroupRead);           // NEW
    };
  }, [socket, chatData?.id, currentUser?._id]);

  // 3. FETCH MESSAGE HISTORY
  useEffect(() => {
    const fetchMessages = async () => {
      if (!chatData?.id) return;
      setLoading(true);
      try {
        const { data } = await api.get(`/messages/${chatData.id}`);
        setMessages(data.data);
        
        if (socket) {
          socket.emit("join chat", chatData.id);
        }
      } catch (error) {
        toast.error("Failed to load history");
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [chatData?.id, socket]); 

  // 4. REAL-TIME & TYPING LISTENERS
  useEffect(() => {
    if (!socket || !chatData?.id) return;

    const handleIncoming = (newMessage) => {
      if (chatData.id === newMessage.chat._id || chatData.id === newMessage.chat) {
        setMessages((prev) => {
          if (prev.some(m => String(m._id) === String(newMessage._id))) return prev;
          return [...prev, newMessage];
        });
        
        // If we receive a message while looking at the chat, instantly mark it as read
        socket.emit("mark_chat_read", { 
          chatId: chatData.id, 
          userId: currentUser?._id || currentUser?.id 
        });
      }
    };

    socket.on("message received", handleIncoming);
    let typingTimer; // <--- Add this variable above the listener
    
    socket.on("typing", (name) => { 
        setTyping(true); 
        setTypingUser(name); 
        // FAIL-SAFE: Kills the typing indicator automatically after 3 seconds if 'stop typing' never arrives
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => setTyping(false), 3000);
    });
    socket.on("stop typing", () => setTyping(false));

    return () => {
      socket.off("message received", handleIncoming);
      socket.off("typing");
      socket.off("stop typing");
    };
  }, [socket, chatData?.id, currentUser?._id]);

  // 5. AUTO-SCROLL TO BOTTOM
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 6. TYPING HANDLER
  const typingHandler = (e) => {
    setInputText(e.target.value);
    if (!socket) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit("typing", { room: chatData.id, userName: currentUser?.name });
    }

    let lastTypingTime = new Date().getTime();
    let timerLength = 3000;
    
    setTimeout(() => {
      let timeNow = new Date().getTime();
      let timeDiff = timeNow - lastTypingTime;
      if (timeDiff >= timerLength && isTyping) {
        socket.emit("stop typing", chatData.id);
        setIsTyping(false);
      }
    }, timerLength);
  };

  // 7. SEND MESSAGE LOGIC
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (socket) socket.emit("stop typing", chatData.id);
    setIsTyping(false);

    try {
      const { data } = await api.post('/messages', { content: inputText, chatId: chatData.id });
      
      let sentMsg = data.data;
      
      // ---> NEW: Anti-Race-Condition for Ticks
      // If it's a 1-on-1 chat and they are online, bypass the delay and mark delivered!
      if (!chatData.isGroupChat && chatData.isOnline) {
        sentMsg.status = 'delivered';
      }
      
      if (socket) {
        socket.emit("new message", sentMsg); 
        socket.emit("message sent", sentMsg); 
      }
      
      setMessages((prev) => [...prev, sentMsg]);
      setInputText('');
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  if (!chatData) return null;

  return (
    <div className="flex-1 flex flex-col bg-[#fcfcfc] dark:bg-[#0b0d10] h-full relative">
      
      {/* HEADER */}
      <div className="h-16 px-4 flex justify-between items-center border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="md:hidden p-2 text-gray-500"><ArrowLeft size={20} /></button>
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#FF9800] to-[#4CAF50] flex items-center justify-center text-white font-bold text-xs shadow-sm">
            {chatData.partner?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <h2 
              onClick={() => chatData.isGroupChat && setIsGroupInfoOpen(true)}
              className={`text-sm font-bold dark:text-white leading-tight ${chatData.isGroupChat ? 'cursor-pointer hover:underline decoration-[#FF9800]' : ''}`}>
              {chatData.partner?.name || "Unknown User"}
            </h2>
            {typing ? (
              <p className="text-[10px] text-[#4CAF50] font-bold animate-pulse tracking-wide truncate max-w-[150px]">
                {chatData.isGroupChat && typingUser ? `${typingUser} is typing...` : 'typing...'}
              </p>
            ) : chatData.isGroupChat ? (
              <p className="text-[10px] text-gray-400 font-medium">Group Chat</p>
            ) : chatData.isOnline ? (
              <p className="text-[10px] text-[#4CAF50] font-medium">Online</p>
            ) : (
              <p className="text-[10px] text-gray-400 font-medium">Offline</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 text-gray-400">
            {!chatData.isGroupChat && (
             <>
               <Video 
                 size={18} 
                 onClick={() => {
                   setCallType('video');
                   setCallPartner(chatData.partner);
                   setIsVideoCallOpen(true);
                 }} 
                 className="cursor-pointer hover:text-[#FF9800] transition-colors" 
               />
               <Phone 
                 size={18} 
                 onClick={() => {
                   setCallType('audio');
                   setCallPartner(chatData.partner);
                   setIsVideoCallOpen(true);
                 }} 
                 className="cursor-pointer hover:text-[#4CAF50] transition-colors" 
               />
             </>
           )}
           <MoreVertical size={18} className="cursor-pointer hover:text-gray-600 transition-colors hidden md:block" />
        </div>
      </div>

      {/* MESSAGES AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 customized-scrollbar bg-opacity-50">
        {loading ? (
          <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-[#FF9800]" /></div>
        ) : (
          messages.map((msg) => {
            // FIX: Use currentUser now
            const isMe = String(msg.sender?._id || msg.sender) === String(currentUser?._id || currentUser?.id);

            return (
              <div key={msg._id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} mt-2`}>
                
                {/* ---> NEW: GROUP CHAT SENDER INFO <--- */}
                {!isMe && chatData.isGroupChat && (
                  <div className="flex items-center gap-1.5 mb-1 ml-1">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#FF9800] to-[#4CAF50] flex items-center justify-center text-white font-bold text-[9px] shadow-sm">
                      {msg.sender?.name?.[0]?.toUpperCase() || "U"}
                    </div>
                    <span className="text-[10px] text-gray-500 font-medium tracking-wide">
                      {msg.sender?.name || "Unknown User"}
                    </span>
                  </div>
                )}

                <div className={`px-4 py-2 max-w-[75%] text-sm shadow-sm transition-all duration-300 ${
                  isMe 
                    ? 'bg-gradient-to-r from-[#FF9800] to-[#4CAF50] text-white rounded-2xl rounded-tr-none' 
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 dark:border-gray-700 rounded-2xl rounded-tl-none border border-gray-200'
                }`}>
                  {msg.content}
                </div>
                
                {/* TIMESTAMPS AND TICKS */}
                <div className="flex items-center gap-1 mt-1 px-1">
                  <span className="text-[9px] text-gray-400 font-medium tracking-wide">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  
                  {/* TICKS RENDER LOGIC */}
                  {isMe && (
                    <div className="flex items-center">
                      {(msg.status === 'sent' || !msg.status) && <Check size={14} className="text-gray-400" />}
                      {msg.status === 'delivered' && <CheckCheck size={14} className="text-gray-400" />}
                      {msg.status === 'read' && <CheckCheck size={14} className="text-blue-500" />}
                    </div>
                  )}
                </div>

              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT FOOTER */}
      <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-1 border border-gray-200 dark:border-gray-700 focus-within:ring-1 focus-within:ring-[#4CAF50]/30 transition-all">
          <input 
            type="text" 
            value={inputText}
            onChange={typingHandler} 
            placeholder="Type a message..." 
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 dark:text-white outline-none placeholder-gray-400"
          />
          <button 
            type="submit" 
            disabled={!inputText.trim()}
            className="p-2 text-[#4CAF50] disabled:text-gray-300 hover:scale-110 active:scale-95 transition-all"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
      <GroupInfoModal 
        isOpen={isGroupInfoOpen} 
        onClose={() => setIsGroupInfoOpen(false)} 
        chatData={rawChatData} 
        currentUser={currentUser}
        socket={socket}
        onUpdateChat={(updatedChat, isLeaving) => {
          if (isLeaving) {
            // Remove chat from sidebar and close the chat window
            setChats(prev => prev.filter(c => String(c._id) !== String(updatedChat._id)));
            onBack();
          } else {
            // Seamlessly update the group name/members in the sidebar
            setChats(prev => prev.map(c => String(c._id) === String(updatedChat._id) ? updatedChat : c));
          }
        }}
      />
      {/* <VideoCallOverlay 
        socket={socket}
        currentUser={currentUser}
        partner={chatData.partner}
        isVideoOpen={isVideoCallOpen}
        setIsVideoOpen={setIsVideoCallOpen}
      /> */}
    </div>
  );
};

export default ActiveChat;