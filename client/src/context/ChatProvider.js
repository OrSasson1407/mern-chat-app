import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Peer from "peerjs";

const ChatContext = createContext();

const ChatProvider = ({ children }) => {
  const [selectedChat, setSelectedChat] = useState();
  const [user, setUser] = useState();
  const [notification, setNotification] = useState([]);
  const [chats, setChats] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);

  // --- VIDEO CALL STATES ---
  const [peer, setPeer] = useState(null);
  const [myStream, setMyStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const userInfo = JSON.parse(sessionStorage.getItem("userInfo"));
    setUser(userInfo);

    if (!userInfo) {
      navigate("/");
    } else {
      // Initialize PeerJS using the User's MongoDB ID
      const newPeer = new Peer(userInfo._id, {
        host: "/", // Change to your custom peer server host if needed
        port: 443,
        secure: true,
      });

      setPeer(newPeer);

      // Listen for incoming calls
      newPeer.on("call", (call) => {
        setIncomingCall(call);
        setIsCallModalOpen(true);
      });

      // Cleanup on logout/unmount
      return () => {
        newPeer.destroy();
      };
    }
  }, [navigate]);

  // --- CALLING LOGIC FUNCTIONS ---

  // 1. Function to initiate a call
  const startCall = (remoteUserId) => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setMyStream(stream);
        setIsCallModalOpen(true);

        const call = peer.call(remoteUserId, stream);

        call.on("stream", (theirStream) => {
          setRemoteStream(theirStream);
        });

        call.on("close", () => {
            endCall();
        });
      })
      .catch((err) => {
        console.error("Failed to get local stream", err);
      });
  };

  // 2. Function to answer the incoming call
  const answerCall = () => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setMyStream(stream);
        incomingCall.answer(stream); // Send our stream to the caller

        incomingCall.on("stream", (theirStream) => {
          setRemoteStream(theirStream);
        });
      })
      .catch((err) => {
        console.error("Failed to answer call", err);
      });
  };

  // 3. Function to end the call
  const endCall = () => {
    if (myStream) {
      myStream.getTracks().forEach((track) => track.stop());
    }
    setMyStream(null);
    setRemoteStream(null);
    setIsCallModalOpen(false);
    setIncomingCall(null);
    if (incomingCall) incomingCall.close();
  };

  return (
    <ChatContext.Provider
      value={{
        selectedChat,
        setSelectedChat,
        user,
        setUser,
        notification,
        setNotification,
        chats,
        setChats,
        onlineUsers,
        setOnlineUsers,
        // Calling Exports
        startCall,
        answerCall,
        endCall,
        myStream,
        remoteStream,
        isCallModalOpen,
        incomingCall,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const ChatState = () => {
  return useContext(ChatContext);
};

export default ChatProvider;