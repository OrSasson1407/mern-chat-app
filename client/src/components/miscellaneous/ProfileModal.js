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

  // Check if this profile user is blocked by the logged-in user
  const isBlocked = loggedInUser?.blockedUsers?.includes(user._id);

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

      // Update local storage and context with new user data (blocked list)
      setUser(data); 
      sessionStorage.setItem("userInfo", JSON.stringify(data));
      
      toast({
        title: isBlocked ? "User Unblocked" : "User Blocked",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <>
      {children ? (
        <span onClick={onOpen}>{children}</span>
      ) : (
        <IconButton d={{ base: "flex" }} icon={<ViewIcon />} onClick={onOpen} />
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
            {/* NEW: Block/Unblock Button */}
            {loggedInUser._id !== user._id && (
                <Button colorScheme={isBlocked ? "green" : "red"} onClick={handleBlockAction}>
                    {isBlocked ? "Unblock User" : "Block User"}
                </Button>
            )}
            <Button onClick={onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ProfileModal;