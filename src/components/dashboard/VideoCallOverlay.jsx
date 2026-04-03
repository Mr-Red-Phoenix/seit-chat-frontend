import React, { useState, useEffect, useRef } from 'react';
import Peer from 'simple-peer';
import toast from 'react-hot-toast';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, MonitorUp } from 'lucide-react';

const VideoCallOverlay = ({ socket, currentUser, partner, isVideoOpen, setIsVideoOpen, callType, setCallType }) => {
  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerName, setCallerName] = useState("");
  const [callerSignal, setCallerSignal] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [remoteVideoOff, setRemoteVideoOff] = useState(false);
  const [remoteAudioOff, setRemoteAudioOff] = useState(false);

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  // Dynamic Constraints: Only ask for Video if it's a Video Call
  const mediaConstraints = {
    video: callType === 'video' ? true : false,
    audio: true
  };

  useEffect(() => {
    if (!socket) return;

    socket.on("incoming_call", ({ from, name, signal, callType: incomingType }) => {
      setReceivingCall(true);
      setCaller(from);
      setCallerName(name);
      setCallerSignal(signal);
      setCallType(incomingType || 'video'); // Set mode to whatever they called with!
      setIsVideoOpen(true); 
    });

    socket.on("call_ended", () => {
      endCallLocally();
      toast("Call Ended", { icon: "👋" });
    });

    socket.on("peer_media_toggle", ({ type, isOff }) => {
      if (type === "video") setRemoteVideoOff(isOff);
      if (type === "audio") setRemoteAudioOff(isOff);
    });

    return () => {
      socket.off("incoming_call");
      socket.off("call_ended");
      socket.off("peer_media_toggle");
    };
  }, [socket, setCallType, setIsVideoOpen]);

  useEffect(() => {
    if (isVideoOpen && !receivingCall && !callAccepted && !stream) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Camera/Mic access blocked! Please use HTTPS or localhost.");
        setIsVideoOpen(false);
        return;
      }

      navigator.mediaDevices.getUserMedia(mediaConstraints)
        .then((currentStream) => {
          setStream(currentStream);
          startCall(currentStream);
        })
        .catch(err => {
          toast.error("Hardware access denied!");
          setIsVideoOpen(false);
        });
    }
  }, [isVideoOpen, receivingCall, callAccepted, stream, callType]);

  useEffect(() => {
    if (stream && myVideo.current) myVideo.current.srcObject = stream;
  }, [stream, isVideoOpen, isVideoOff]);

  useEffect(() => {
    if (remoteStream && userVideo.current) {
      userVideo.current.srcObject = remoteStream;
      userVideo.current.onloadedmetadata = () => {
         userVideo.current.play().catch(e => console.error("Video play error:", e));
      };
    }
  }, [remoteStream, callAccepted, remoteVideoOff]);

  const startCall = (currentStream) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: currentStream,
      config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
    });

    peer.on("signal", (data) => {
      socket.emit("call_user", {
        userToCall: partner?._id || partner?.id,
        signalData: data,
        from: currentUser?._id || currentUser?.id,
        name: currentUser?.name,
        callType: callType // Pass the mode!
      });
    });

    peer.on("stream", (incomingStream) => setRemoteStream(incomingStream));

    socket.off("call_accepted"); 
    socket.on("call_accepted", (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });

    connectionRef.current = peer;
  };

  const answerCall = () => {
    navigator.mediaDevices.getUserMedia(mediaConstraints)
      .then((currentStream) => {
        setStream(currentStream);
        setCallAccepted(true); 
        setReceivingCall(false);

        const peer = new Peer({
          initiator: false,
          trickle: false,
          stream: currentStream,
          config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
        });

        peer.on("signal", (data) => socket.emit("answer_call", { signal: data, to: caller }));
        peer.on("stream", (incomingStream) => setRemoteStream(incomingStream));

        peer.signal(callerSignal);
        connectionRef.current = peer;
      })
      .catch(err => {
        toast.error("Could not access mic/camera.");
        endCallLocally();
      });
  };

  const endCallLocally = () => {
    if (connectionRef.current) connectionRef.current.destroy();
    if (stream) stream.getTracks().forEach(track => track.stop());

    setCallAccepted(false);
    setReceivingCall(false);
    setCaller("");
    setCallerName("");
    setCallerSignal(null);
    setStream(null);
    setRemoteStream(null);
    setIsVideoOff(false);
    setIsMuted(false);
    setRemoteAudioOff(false);
    setRemoteVideoOff(false);
    setIsVideoOpen(false);
  };

  const leaveCall = () => {
    socket.emit("end_call", { to: partner?._id || partner?.id || caller });
    endCallLocally();
  };
// ---> NEW: Screen Sharing Logic
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        // Ask the user to select a screen/window
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ cursor: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        const webcamTrack = stream.getVideoTracks()[0];

        // Replace the webcam track with the screen track in the WebRTC tunnel
        if (connectionRef.current) {
          connectionRef.current.replaceTrack(webcamTrack, screenTrack, stream);
        }

        // Show the screen share in our own Picture-in-Picture window
        if (myVideo.current) myVideo.current.srcObject = screenStream;
        setIsScreenSharing(true);

        // Listen for the user clicking the native "Stop Sharing" button on their browser
        screenTrack.onended = () => {
          if (connectionRef.current) connectionRef.current.replaceTrack(screenTrack, webcamTrack, stream);
          if (myVideo.current) myVideo.current.srcObject = stream;
          setIsScreenSharing(false);
        };
      } catch (error) {
        toast.error("Screen sharing cancelled");
      }
    } else {
      // Manually toggle off screen sharing
      const webcamTrack = stream.getVideoTracks()[0];
      const currentScreenStream = myVideo.current.srcObject;
      const screenTrack = currentScreenStream.getVideoTracks()[0];

      if (connectionRef.current) {
        connectionRef.current.replaceTrack(screenTrack, webcamTrack, stream);
      }
      
      screenTrack.stop(); // Kill the screen capture
      if (myVideo.current) myVideo.current.srcObject = stream; // Put webcam back in PIP
      setIsScreenSharing(false);
    }
  };
  const toggleMute = () => {
    if (stream) {
      const track = stream.getAudioTracks()[0];
      if(track) {
        track.enabled = !track.enabled;
        setIsMuted(!track.enabled);
        socket.emit("toggle_media", { to: partner?._id || partner?.id || caller, type: "audio", isOff: !track.enabled });
      }
    }
  };

  const toggleVideo = () => {
    if (stream && callType === 'video') {
      const track = stream.getVideoTracks()[0];
      if(track) {
        track.enabled = !track.enabled;
        setIsVideoOff(!track.enabled);
        socket.emit("toggle_media", { to: partner?._id || partner?.id || caller, type: "video", isOff: !track.enabled });
      }
    }
  };

  // UI Helpers
  const remoteName = partner?.name || callerName || "User";
  const remoteInitial = remoteName[0]?.toUpperCase() || "U";

  if (!isVideoOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-gray-900 flex items-center justify-center overflow-hidden">
      
      {/* 1. Remote User Video / Audio Avatar */}
      {callAccepted ? (
        <div className="relative w-full h-full bg-gray-900 flex items-center justify-center">
          
          <video playsInline ref={userVideo} autoPlay className={`w-full h-full object-cover ${callType === 'audio' || remoteVideoOff ? 'hidden' : 'block'}`} />
          
          {(callType === 'audio' || remoteVideoOff) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
               <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center shadow-2xl animate-pulse mb-6 border-4 border-gray-800">
                  <span className="text-white text-5xl font-bold">{remoteInitial}</span>
               </div>
               <h2 className="text-3xl text-white font-bold">{remoteName}</h2>
               <p className="text-[#4CAF50] font-medium mt-2 tracking-widest uppercase text-sm">Connected</p>
            </div>
          )}
          
          {remoteAudioOff && (
            <div className="absolute top-8 left-8 bg-red-500/90 p-4 rounded-full animate-pulse shadow-lg shadow-red-500/50 flex items-center gap-2 z-10">
               <MicOff size={24} className="text-white" />
               <span className="text-white font-semibold text-sm pr-2">Mic Muted</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full w-full bg-gray-900">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center animate-pulse mb-6 shadow-2xl ${callType === 'audio' ? 'bg-[#4CAF50]/20' : 'bg-[#FF9800]/20'}`}>
            {callType === 'audio' ? <Phone size={40} className="text-[#4CAF50]" /> : <Video size={40} className="text-[#FF9800]" />}
          </div>
          <h2 className="text-3xl font-bold text-white tracking-wide mb-2">
            {receivingCall ? `${callerName} is calling...` : `Calling ${partner?.name || "User"}...`}
          </h2>
          <p className="text-gray-400">WebRTC End-to-End Encrypted</p>

          {receivingCall && !callAccepted && (
            <div className="flex gap-6 mt-12">
              <button onClick={() => { socket.emit("end_call", { to: caller }); endCallLocally(); }} className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg transition-all hover:scale-110">
                <PhoneOff size={28} />
              </button>
              <button onClick={answerCall} className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-white shadow-lg transition-all hover:scale-110 animate-bounce">
                <Phone size={28} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. Local User Video (PIP) - Hides on Audio Calls! */}
      {stream && callType === 'video' && (
        <div className="absolute top-6 right-6 w-32 md:w-48 aspect-[3/4] bg-black rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-700/50 z-20">
          <video playsInline muted ref={myVideo} autoPlay className={`w-full h-full object-cover transform scale-x-[-1] ${isVideoOff ? 'hidden' : 'block'}`} />
          {isVideoOff && <div className="w-full h-full flex items-center justify-center bg-gray-800"><VideoOff size={32} className="text-gray-500" /></div>}
        </div>
      )}

      {/* 3. Control Bar */}
      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex items-center gap-6 bg-gray-800/80 backdrop-blur-md px-8 py-4 rounded-full border border-gray-700/50 shadow-2xl z-30">
        <button onClick={toggleMute} className={`p-4 rounded-full transition-colors ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}>
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
        
        <button onClick={leaveCall} className="p-5 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 transition-all hover:scale-110">
          <PhoneOff size={28} />
        </button>

        {callType === 'video' && (
          <button onClick={toggleScreenShare} className={`p-4 rounded-full transition-colors ${isScreenSharing ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}>
            <MonitorUp size={24} />
          </button>
        )}
        
        {callType === 'video' && (
          <button onClick={toggleVideo} className={`p-4 rounded-full transition-colors ${isVideoOff ? 'bg-red-500/20 text-red-500' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}>
            {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
          </button>
        )}
      </div>

    </div>
  );
};

export default VideoCallOverlay;