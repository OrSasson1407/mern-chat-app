import { ViewIcon } from "@chakra-ui/icons";
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
} from "@chakra-ui/react";
import axios from "axios";
import { ChatState } from "../../context/ChatProvider";

const ProfileModal = ({ user, children }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { user: loggedInUser, setUser } = ChatState();
  const toast = useToast();

  // Check if this profile user is currently in the logged-in user's blocked list
  const isBlocked = loggedInUser?.blockedUsers?.includes(user._id);

  const handleBlockAction = async () => {
    try {
      const config = {
        headers: { Authorization: `Bearer ${loggedInUser.token}` },
      };
      
      // Determine endpoint based on current block status
      const endpoint = isBlocked ? "/api/user/unblock" : "/api/user/block";
      
      const { data } = await axios.put(
        `${process.env.REACT_APP_ENDPOINT}${endpoint}`,
        { userId: user._id },
        config
      );

      /**
       * IMPORTANT: The backend 'block'/'unblock' controllers return the updated 
       * loggedInUser object. We must save this to the global context and 
       * session storage to trigger UI changes in SingleChat.js.
       */
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
        <ModalContent h="410px">
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
            />
            <Text fontSize={{ base: "28px", md: "30px" }} fontFamily="Work sans">
              Email: {user.email}
            </Text>
          </ModalBody>
          <ModalFooter justifyContent="space-between">
            {/* Show Block/Unblock button only if viewing someone else's profile */}
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