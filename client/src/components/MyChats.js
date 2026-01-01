//
import { AddIcon, StarIcon, SettingsIcon } from "@chakra-ui/icons";
import {
  Box,
  Stack,
  Text,
  useToast,
  Button,
  Badge,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  useColorModeValue,
} from "@chakra-ui/react";
import axios from "axios";
import { useEffect, useState } from "react";
import { getSender, getSenderFull } from "../config/ChatLogics";
import { ChatState } from "../context/ChatProvider";
import GroupChatModal from "./miscellaneous/GroupChatModal";

const MyChats = ({ fetchAgain }) => {
  const [loggedUser, setLoggedUser] = useState();
  const { selectedChat, setSelectedChat, user, chats, setChats } = ChatState();
  const toast = useToast();

  // --- DARK MODE HOOKS ---
  const bg = useColorModeValue("rgba(255, 255, 255, 0.9)", "gray.800");
  const boxBg = useColorModeValue("#F7FAFC", "gray.900");
  const selectedBg = useColorModeValue("white", "gray.700");
  const hoverBg = useColorModeValue("white", "gray.700");
  const textColor = useColorModeValue("black", "white");
  const subTextColor = useColorModeValue("gray.600", "gray.400");
  const pinnedIconColor = useColorModeValue("orange.400", "yellow.400");

  const fetchChats = async () => {
    try {
      const config = {
        headers: { Authorization: `Bearer ${user.token}` },
      };

      const { data } = await axios.get(
        `${process.env.REACT_APP_ENDPOINT}/api/chat`,
        config
      );
      setChats(data);
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to Load the chats",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
    }
  };

  // --- PIN / UNPIN HANDLER ---
  const handlePin = async (e, chatId, isPinned) => {
    e.stopPropagation(); // Prevent clicking the chat row
    try {
      const config = {
        headers: { Authorization: `Bearer ${user.token}` },
      };
      
      const endpoint = isPinned ? "/api/chat/unpin" : "/api/chat/pin";
      
      const { data } = await axios.put(
        `${process.env.REACT_APP_ENDPOINT}${endpoint}`,
        { chatId },
        config
      );

      // Update local state immediately
      const updatedChats = chats.map((c) => (c._id === data._id ? data : c));
      setChats(updatedChats);

      toast({
        title: isPinned ? "Chat Unpinned" : "Chat Pinned",
        status: "success",
        duration: 2000,
        isClosable: true,
        position: "bottom-left",
      });
    } catch (error) {
      toast({
        title: "Error updating pin status",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  useEffect(() => {
    setLoggedUser(JSON.parse(sessionStorage.getItem("userInfo")));
    fetchChats();
    // eslint-disable-next-line
  }, [fetchAgain]);

  const getUnreadCount = (chat) => {
    if (!chat.latestMessage || !loggedUser) return false;
    return (
      chat.latestMessage.sender._id !== loggedUser._id &&
      !chat.latestMessage.readBy.includes(loggedUser._id)
    );
  };

  // --- SORTING LOGIC ---
  // 1. Pinned chats first
  // 2. Then sort by last updated (newest first)
  const sortedChats = chats
    ? [...chats].sort((a, b) => {
        const aPinned = a.pinnedBy?.includes(loggedUser?._id);
        const bPinned = b.pinnedBy?.includes(loggedUser?._id);

        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;

        return new Date(b.updatedAt) - new Date(a.updatedAt);
      })
    : [];

  return (
    <Box
      display={{ base: selectedChat ? "none" : "flex", md: "flex" }}
      flexDir="column"
      alignItems="center"
      p={4}
      bg={bg}
      w={{ base: "100%", md: "31%" }}
      borderRadius="xl"
      boxShadow="lg"
      backdropFilter="blur(5px)"
      borderWidth="1px"
      borderColor={useColorModeValue("gray.200", "gray.700")}
    >
      <Box
        pb={4}
        px={2}
        fontSize={{ base: "24px", md: "28px" }}
        fontFamily="Work sans"
        fontWeight="bold"
        display="flex"
        w="100%"
        justifyContent="space-between"
        alignItems="center"
        color={textColor}
      >
        Chats
        <GroupChatModal>
          <Button
            display="flex"
            size="sm"
            fontSize={{ base: "17px", md: "12px", lg: "14px" }}
            rightIcon={<AddIcon />}
            colorScheme="teal"
            variant="solid"
            borderRadius="full"
            boxShadow="md"
          >
            New Group
          </Button>
        </GroupChatModal>
      </Box>

      <Box
        display="flex"
        flexDir="column"
        p={2}
        bg={boxBg}
        w="100%"
        h="100%"
        borderRadius="lg"
        overflowY="hidden"
      >
        {chats ? (
          <Stack overflowY="scroll" spacing={2} className="hide-scrollbar">
            {sortedChats.map((chat) => {
              const isSelected = selectedChat === chat;
              const isPinned = chat.pinnedBy?.includes(loggedUser?._id);
              const sender =
                !chat.isGroupChat && loggedUser
                  ? getSenderFull(loggedUser, chat.users)
                  : null;

              return (
                <Box
                  onClick={() => setSelectedChat(chat)}
                  cursor="pointer"
                  bg={isSelected ? selectedBg : "transparent"}
                  _hover={{ bg: hoverBg, boxShadow: "sm" }}
                  color={textColor}
                  px={4}
                  py={3}
                  borderRadius="lg"
                  key={chat._id}
                  display="flex"
                  alignItems="center"
                  boxShadow={isSelected ? "md" : "none"}
                  borderLeft={
                    isSelected ? "4px solid #319795" : "4px solid transparent"
                  }
                  transition="all 0.2s"
                  position="relative"
                  role="group"
                >
                  {/* PINNED ICON */}
                  {isPinned && (
                    <StarIcon
                      color={pinnedIconColor}
                      w={3}
                      h={3}
                      position="absolute"
                      top="2"
                      right="2"
                    />
                  )}

                  <Avatar
                    size="sm"
                    mr={3}
                    src={chat.isGroupChat ? "" : sender?.pic}
                    name={chat.isGroupChat ? chat.chatName : sender?.name}
                    bg={chat.isGroupChat ? "teal.400" : "gray.300"}
                    color="white"
                  />

                  <Box display="flex" flexDirection="column" width="100%">
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Text fontWeight={isSelected ? "bold" : "500"}>
                        {!chat.isGroupChat
                          ? getSender(loggedUser, chat.users)
                          : chat.chatName}
                      </Text>
                      
                      {/* UNREAD BADGE */}
                      {getUnreadCount(chat) && (
                        <Badge
                          colorScheme="red"
                          variant="solid"
                          borderRadius="full"
                          fontSize="0.6em"
                          ml={1}
                        >
                          New
                        </Badge>
                      )}
                    </Box>

                    {chat.latestMessage && (
                      <Text fontSize="xs" color={subTextColor} noOfLines={1} mt={1}>
                        <b style={{ color: textColor }}>
                          {chat.latestMessage.sender.name}:{" "}
                        </b>
                        {chat.latestMessage.content.length > 50
                          ? chat.latestMessage.content.substring(0, 51) + "..."
                          : chat.latestMessage.content}
                      </Text>
                    )}
                  </Box>

                  {/* CONTEXT MENU (Hidden until hover) */}
                  <Menu>
                    <MenuButton
                      as={IconButton}
                      icon={<SettingsIcon />} // Replaced BsThreeDotsVertical
                      variant="ghost"
                      size="xs"
                      position="absolute"
                      right="1"
                      bottom="1"
                      opacity={0}
                      _groupHover={{ opacity: 1 }}
                      onClick={(e) => e.stopPropagation()}
                      color="gray.500"
                    />
                    <MenuList>
                      <MenuItem
                        onClick={(e) => handlePin(e, chat._id, isPinned)}
                      >
                        {isPinned ? "Unpin Chat" : "Pin Chat"}
                      </MenuItem>
                    </MenuList>
                  </Menu>
                </Box>
              );
            })}
          </Stack>
        ) : (
          <Text align="center" mt={5}>Loading Chats...</Text>
        )}
      </Box>
    </Box>
  );
};

export default MyChats;