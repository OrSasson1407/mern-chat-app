//
import {
  Button,
  useDisclosure,
  Input,
  Box,
  Text,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Tooltip,
  Avatar,
  useToast,
  Spinner,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  IconButton,
  useColorMode,
  useColorModeValue,
  Badge,
} from "@chakra-ui/react";
import {
  BellIcon,
  ChevronDownIcon,
  SearchIcon,
  MoonIcon,
  SunIcon,
} from "@chakra-ui/icons";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import { ChatState } from "../../context/ChatProvider";
import ProfileModal from "./ProfileModal";
import UserListItem from "../userAvatar/UserListItem";
import { getSender } from "../../config/ChatLogics";
// import NotificationBadge from "react-notification-badge"; // Optional if you want a library
// import { Effect } from "react-notification-badge";

function SideDrawer() {
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [messageResult, setMessageResult] = useState([]); // State for global message search results
  const [loading, setLoading] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  const {
    setSelectedChat,
    user,
    notification,
    setNotification,
    chats,
    setChats,
  } = ChatState();

  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  // --- DARK MODE HOOKS ---
  const { colorMode, toggleColorMode } = useColorMode();
  const bg = useColorModeValue("rgba(255, 255, 255, 0.95)", "gray.800");
  const drawerBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const inputBg = useColorModeValue("gray.100", "gray.700");
  const resultHoverBg = useColorModeValue("teal.50", "gray.700");

  const logoutHandler = () => {
    sessionStorage.removeItem("userInfo");
    navigate("/");
  };

  // 1. SEARCH USERS
  const handleSearch = async () => {
    if (!search) {
      toast({
        title: "Please Enter something in search",
        status: "warning",
        duration: 3000,
        isClosable: true,
        position: "top-left",
      });
      return;
    }

    try {
      setLoading(true);
      const config = {
        headers: { Authorization: `Bearer ${user.token}` },
      };

      const { data } = await axios.get(
        `${process.env.REACT_APP_ENDPOINT}/api/user?search=${search}`,
        config
      );

      setLoading(false);
      setSearchResult(data);
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to Load the Search Results",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
      setLoading(false);
    }
  };

  // 2. SEARCH MESSAGES (GLOBAL)
  const handleMessageSearch = async () => {
    if (!search) return;
    try {
      setLoading(true);
      const config = {
        headers: { Authorization: `Bearer ${user.token}` },
      };
      // Endpoint to search messages globally
      const { data } = await axios.get(
        `${process.env.REACT_APP_ENDPOINT}/api/message/global/search?keyword=${search}`,
        config
      );
      setLoading(false);
      setMessageResult(data);
    } catch (error) {
      setLoading(false);
      toast({
        title: "Error searching messages",
        description: error.message,
        status: "error",
      });
    }
  };

  const accessChat = async (userId) => {
    try {
      setLoadingChat(true);
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.post(
        `${process.env.REACT_APP_ENDPOINT}/api/chat`,
        { userId },
        config
      );

      if (!chats.find((c) => c._id === data._id)) setChats([data, ...chats]);
      setSelectedChat(data);
      setLoadingChat(false);
      onClose();
    } catch (error) {
      toast({
        title: "Error fetching the chat",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
    }
  };

  const accessChatFromMessage = (chat) => {
    if (!chats.find((c) => c._id === chat._id)) setChats([chat, ...chats]);
    setSelectedChat(chat);
    onClose();
  };

  return (
    <>
      {/* --- HEADER --- */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        bg={bg}
        w="100%"
        p="10px 20px"
        borderBottom="1px solid"
        borderColor={borderColor}
        boxShadow="sm"
        backdropFilter="blur(5px)"
      >
        <Tooltip label="Search Users or Messages" hasArrow placement="bottom-end">
          <Button
            variant="ghost"
            leftIcon={<SearchIcon />}
            onClick={onOpen}
            colorScheme="teal"
            size="sm"
          >
            <Text display={{ base: "none", md: "flex" }} px={2}>
              Search
            </Text>
          </Button>
        </Tooltip>

        <Text
          fontSize="2xl"
          fontFamily="Work sans"
          fontWeight="bold"
          bgGradient="linear(to-r, teal.500, blue.600)"
          bgClip="text"
        >
          Talk-A-Tive
        </Text>

        <Box display="flex" alignItems="center" gap={2}>
          {/* THEME TOGGLE */}
          <IconButton
            icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
            onClick={toggleColorMode}
            variant="ghost"
            aria-label="Toggle Theme"
            isRound
            size="md"
          />

          {/* NOTIFICATION BELL */}
          <Menu>
            <MenuButton p={1} position="relative">
              {/* Custom Badge for Notification Count */}
              {notification.length > 0 && (
                <Badge
                  position="absolute"
                  top="-2px"
                  right="-2px"
                  colorScheme="red"
                  borderRadius="full"
                  fontSize="0.6em"
                  px={1.5}
                  zIndex={2}
                >
                  {notification.length}
                </Badge>
              )}
              <BellIcon fontSize="2xl" m={1} />
            </MenuButton>
            <MenuList pl={2}>
              {!notification.length && "No New Messages"}
              {notification.map((notif) => (
                <MenuItem
                  key={notif._id}
                  onClick={() => {
                    setSelectedChat(notif.chat);
                    setNotification(notification.filter((n) => n !== notif));
                  }}
                >
                  {notif.chat.isGroupChat
                    ? `New Message in ${notif.chat.chatName}`
                    : `New Message from ${getSender(user, notif.chat.users)}`}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>

          {/* PROFILE MENU */}
          <Menu>
            <MenuButton
              as={Button}
              bg="transparent"
              rightIcon={<ChevronDownIcon />}
              variant="ghost"
              p={0}
              _hover={{ bg: "transparent" }}
            >
              <Avatar
                size="sm"
                cursor="pointer"
                name={user.name}
                src={user.pic}
                border="2px solid white"
                boxShadow="md"
              />
            </MenuButton>
            <MenuList boxShadow="lg" borderRadius="xl">
              <ProfileModal user={user}>
                <MenuItem fontWeight="bold">My Profile</MenuItem>
              </ProfileModal>
              <MenuDivider />
              <MenuItem onClick={logoutHandler} color="red.500">
                Logout
              </MenuItem>
            </MenuList>
          </Menu>
        </Box>
      </Box>

      {/* --- DRAWER --- */}
      <Drawer placement="left" onClose={onClose} isOpen={isOpen}>
        <DrawerOverlay />
        <DrawerContent bg={drawerBg}>
          <DrawerHeader borderBottomWidth="1px">Search</DrawerHeader>
          <DrawerBody>
            <Tabs isFitted variant="enclosed" colorScheme="teal">
              <TabList mb="1em">
                <Tab>Users</Tab>
                <Tab>Messages</Tab>
              </TabList>
              <TabPanels>
                
                {/* 1. USERS TAB */}
                <TabPanel px={0}>
                  <Box display="flex" pb={2}>
                    <Input
                      placeholder="Search users..."
                      mr={2}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      bg={inputBg}
                    />
                    <Button onClick={handleSearch} colorScheme="teal">
                      Go
                    </Button>
                  </Box>
                  {loading ? (
                    <Spinner ml="auto" mr="auto" display="block" />
                  ) : (
                    searchResult?.map((user) => (
                      <UserListItem
                        key={user._id}
                        user={user}
                        handleFunction={() => accessChat(user._id)}
                      />
                    ))
                  )}
                  {loadingChat && <Spinner ml="auto" display="flex" />}
                </TabPanel>

                {/* 2. MESSAGES TAB */}
                <TabPanel px={0}>
                  <Box display="flex" pb={2}>
                    <Input
                      placeholder="Search messages..."
                      mr={2}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      bg={inputBg}
                    />
                    <Button onClick={handleMessageSearch} colorScheme="teal">
                      Go
                    </Button>
                  </Box>
                  {loading ? (
                    <Spinner ml="auto" mr="auto" display="block" />
                  ) : (
                    messageResult?.map((msg) => (
                      <Box
                        key={msg._id}
                        onClick={() => accessChatFromMessage(msg.chat)}
                        cursor="pointer"
                        bg={inputBg}
                        _hover={{ bg: resultHoverBg }}
                        p={3}
                        mb={2}
                        borderRadius="lg"
                        border="1px solid"
                        borderColor={borderColor}
                      >
                        <Text fontSize="xs" fontWeight="bold" color="teal.500">
                          {msg.sender.name} in{" "}
                          {!msg.chat.isGroupChat
                            ? "Chat"
                            : msg.chat.chatName}
                        </Text>
                        <Text fontSize="sm" noOfLines={2}>
                          {msg.content}
                        </Text>
                      </Box>
                    ))
                  )}
                </TabPanel>
              </TabPanels>
            </Tabs>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}

export default SideDrawer;