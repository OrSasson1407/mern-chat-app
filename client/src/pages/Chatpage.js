import { Box } from "@chakra-ui/react";
import { useState } from "react";
import ChatBox from "../components/ChatBox";
import MyChats from "../components/MyChats";
import SideDrawer from "../components/miscellaneous/SideDrawer";
import CallModal from "../components/miscellaneous/CallModal"; // Import the Call UI
import { ChatState } from "../context/ChatProvider";

const Chatpage = () => {
  const { 
    user, 
    isCallModalOpen, 
    endCall, 
    myStream, 
    remoteStream, 
    answerCall, 
    incomingCall 
  } = ChatState();
  
  const [fetchAgain, setFetchAgain] = useState(false);

  return (
    <div style={{ width: "100%" }}>
      {user && <SideDrawer />}
      
      <Box display="flex" justifyContent="space-between" w="100%" h="91.5vh" p="10px">
        {user && <MyChats fetchAgain={fetchAgain} />}
        {user && (
          <ChatBox fetchAgain={fetchAgain} setFetchAgain={setFetchAgain} />
        )}
      </Box>

      {/* --- VIDEO CALL MODAL --- */}
      {/* This modal is triggered globally by the ChatProvider state */}
      <CallModal 
        isOpen={isCallModalOpen} 
        onClose={endCall}
        localStream={myStream}
        remoteStream={remoteStream}
        answerCall={answerCall}
        isReceivingCall={!!incomingCall && !remoteStream}
        callerName={incomingCall ? "Incoming Call..." : ""}
      />
    </div>
  );
};

export default Chatpage;