import { PhoneIcon, ViewIcon, ChatIcon } from "@chakra-ui/icons";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  useDisclosure,
  IconButton,
  Text,
  Image,
  useToast,
  HStack,
} from "@chakra-ui/react";
import axios from "axios";
import { ChatState } from "../../context/ChatProvider";

const ProfileModal = ({ user, children }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { user: loggedInUser, setUser, socket, startCall } = ChatState();
  const toast = useToast();

  const isBlocked = loggedInUser?.blockedUsers?.includes(user._id);

  // --- INTEGRATED: WEBRTC CALLING LOGIC ---
  const initiateCall = (isVideo = false) => {
    if (isBlocked) {
      toast({
        title: "Action Restricted",
        description: "You cannot call a blocked user.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // 1. Notify the server via Socket (for ringing/notifications)
    socket.emit("call-user", {
      userToCall: user._id,
      from: loggedInUser._id,
      name: loggedInUser.name,
      isVideo: isVideo,
    });

    // 2. Trigger PeerJS logic from ChatProvider
    onClose(); // Close the profile modal before starting call
    startCall(user._id); 

    toast({
      title: isVideo ? "Starting Video Call..." : "Starting Voice Call...",
      status: "info",
      duration: 2000,
      isClosable: true,
    });
  };

  const handleBlockAction = async () => {
    try {
      const config = {
        headers: { Authorization: `Bearer ${loggedInUser.token}` },
      };
      
      const endpoint = isBlocked ? "/api/user/unblock" : "/api/user/block";
      
      const { data } = await axios.put(
        `${process.env.REACT_APP_ENDPOINT}${endpoint}`,
        { userId: user._id },
        config
      );

      const updatedUser = { ...loggedInUser, blockedUsers: data.blockedUsers };
      setUser(updatedUser); 
      sessionStorage.setItem("userInfo", JSON.stringify(updatedUser));
      
      toast({
        title: isBlocked ? "User Unblocked" : "User Blocked",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

  return (
    <>
      {children ? (
        <span onClick={onOpen}>{children}</span>
      ) : (
        <IconButton display={{ base: "flex" }} icon={<ViewIcon />} onClick={onOpen} />
      )}

      <Modal size="lg" onClose={onClose} isOpen={isOpen} isCentered>
        <ModalOverlay />
        <ModalContent h="450px">
          <ModalHeader
            fontSize="40px"
            fontFamily="Work sans"
            display="flex"
            justifyContent="center"
          >
            {user.name}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody
            display="flex"
            flexDir="column"
            alignItems="center"
            justifyContent="space-between"
          >
            <Image
              borderRadius="full"
              boxSize="150px"
              src={user.pic}
              alt={user.name}
              border="2px solid #E8E8E8"
            />
            <Text fontSize={{ base: "24px", md: "30px" }} fontFamily="Work sans">
              Email: {user.email}
            </Text>
            
            {/* Calling Actions Row */}
            {loggedInUser._id !== user._id && (
              <HStack spacing={4} mt={4}>
                <IconButton
                  colorScheme="green"
                  aria-label="Voice Call"
                  icon={<PhoneIcon />}
                  isRound
                  size="lg"
                  onClick={() => initiateCall(false)}
                  isDisabled={isBlocked}
                />
                <IconButton
                  colorScheme="blue"
                  aria-label="Video Call"
                  icon={<ChatIcon />} 
                  isRound
                  size="lg"
                  onClick={() => initiateCall(true)}
                  isDisabled={isBlocked}
                />
              </HStack>
            )}
          </ModalBody>

          <ModalFooter justifyContent="space-between">
            {loggedInUser._id !== user._id && (
              <Button 
                colorScheme={isBlocked ? "green" : "red"} 
                onClick={handleBlockAction}
                variant="solid"
              >
                {isBlocked ? "Unblock User" : "Block User"}
              </Button>
            )}
            <Button onClick={onClose} variant="ghost">Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ProfileModal;