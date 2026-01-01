import {
  FormControl,
  Input,
  Box,
  Text,
  IconButton,
  Spinner,
  useToast,
  InputGroup,
  InputRightElement,
  Button,
  useColorModeValue,
} from "@chakra-ui/react";
import { getSender, getSenderFull } from "../config/ChatLogics";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
  ArrowBackIcon,
  CloseIcon,
  SearchIcon,
  AttachmentIcon,
} from "@chakra-ui/icons";
import ProfileModal from "./miscellaneous/ProfileModal";
import ScrollableChat from "./ScrollableChat";
import io from "socket.io-client";
import UpdateGroupChatModal from "./miscellaneous/UpdateGroupChatModal";
import { ChatState } from "../context/ChatProvider";
import Picker from "emoji-picker-react";

// --- CONFIG ---
const ENDPOINT = process.env.REACT_APP_ENDPOINT;
var socket, selectedChatCompare;

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  
  // --- PAGINATION STATES ---
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // New Feature States
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const toast = useToast();
  const {
    selectedChat,
    setSelectedChat,
    user,
    notification,
    setNotification,
    onlineUsers,
    setOnlineUsers,
  } = ChatState();

  // --- DARK MODE HOOKS ---
  const chatBg = useColorModeValue("#E8E8E8", "gray.900");
  const inputBg = useColorModeValue("#E0E0E0", "gray.700");
  const textColor = useColorModeValue("black", "white");
  const iconColor = useColorModeValue("gray.500", "gray.300");

  // --- AUDIO / NOTIFICATION SOUND ---
  const playNotificationSound = () => {
    const audio = new Audio(
      "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
    );
    audio.play().catch((e) => console.log("Audio play failed", e));
  };

  const isOnline = () => {
    if (!selectedChat || selectedChat.isGroupChat || !user) return false;
    const otherUser = getSenderFull(user, selectedChat.users);
    return onlineUsers.some((u) => u.userId === otherUser?._id);
  };

  const showNotification = (msg) => {
    playNotificationSound();
    if (Notification.permission === "granted" && document.hidden) {
      new Notification(`New message from ${msg.sender.name}`, {
        body: msg.content,
        icon: msg.sender.pic,
      });
    }
  };

  // --- FILE UPLOAD LOGIC ---
  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const config = { headers: { "Content-type": "multipart/form-data" } };
      const { data } = await axios.post(`${ENDPOINT}/api/upload`, formData, config);
      return `${ENDPOINT}${data}`;
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Upload Failed";
      toast({ title: "Error", description: errorMsg, status: "error" });
      return null;
    }
  };

  // --- FETCH MESSAGES WITH PAGINATION AND ENHANCED ERROR HANDLING ---
  const fetchMessages = async (pageNumber = 1) => {
    if (!selectedChat) return;

    try {
      const config = {
        headers: { Authorization: `Bearer ${user.token}` },
      };

      if (pageNumber === 1) setLoading(true);

      const { data } = await axios.get(
        `${ENDPOINT}/api/message/${selectedChat._id}?pageNumber=${pageNumber}`,
        config
      );

      if (pageNumber === 1) {
        setMessages(data.messages);
      } else {
        setMessages((prev) => [...data.messages, ...prev]);
      }

      setHasMore(pageNumber < data.pages);
      setLoading(false);
      
      if (socketConnected) {
        socket.emit("join chat", selectedChat._id);
      }
      
      if (pageNumber === 1) {
        await axios.put(`${ENDPOINT}/api/message/read`, { chatId: selectedChat._id }, config);
        if (socketConnected) {
            socket.emit("message read", { chatId: selectedChat._id, userId: user._id });
        }
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Failed to Load the Messages";
      toast({
        title: "Error Occured!",
        description: errorMsg,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      setLoading(false);
    }
  };

  // --- SEND MESSAGE WITH OPTIMISTIC UI ---
  const sendMessage = async (event) => {
    if (event.key === "Enter" && newMessage) {
      if (socketConnected) socket.emit("stop typing", selectedChat._id);

      const tempId = Date.now().toString();
      const optimisticMessage = {
        _id: tempId,
        sender: { _id: user._id, name: user.name, pic: user.pic },
        content: newMessage,
        chat: selectedChat,
        parentMessage: replyingTo ? replyingTo : null,
        messageType: "text",
        createdAt: new Date().toISOString(),
        readBy: [user._id],
        isSending: true,
      };

      const messageContent = newMessage;
      setNewMessage("");
      setMessages((prev) => [...prev, optimisticMessage]);
      setReplyingTo(null);
      setShowPicker(false);
      setTyping(false);

      try {
        const config = {
          headers: {
            "Content-type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
        };

        const { data } = await axios.post(
          `${ENDPOINT}/api/message`,
          {
            content: messageContent,
            chatId: selectedChat._id,
            parentMessageId: optimisticMessage.parentMessage?._id,
            messageType: "text",
          },
          config
        );

        if (socketConnected) socket.emit("new message", data);
        setMessages((prev) => 
          prev.map((m) => (m._id === tempId ? data : m))
        );
      } catch (error) {
        setMessages((prev) => prev.filter((m) => m._id !== tempId));
        const errorMsg = error.response?.data?.message || "Failed to send the Message";
        toast({
          title: "Error Occured!",
          description: errorMsg,
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "bottom",
        });
      }
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const messageType = isImage ? "image" : "file";

    setLoading(true);
    const uploadedUrl = await uploadFile(file);
    setLoading(false);

    if (!uploadedUrl) return;

    try {
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };
      const payload = {
        content: file.name,
        chatId: selectedChat._id,
        messageType: messageType,
        fileUrl: uploadedUrl,
      };
      const { data } = await axios.post(
        `${ENDPOINT}/api/message`,
        payload,
        config
      );

      if (socketConnected) socket.emit("new message", data);
      setMessages([...messages, data]);
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Failed to send file";
      toast({ title: "Error", description: errorMsg, status: "error" });
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], "voice_note.webm", { type: "audio/webm" });

        toast({ title: "Sending Audio...", status: "info", duration: 2000 });
        const uploadedUrl = await uploadFile(audioFile);

        if (uploadedUrl) {
          try {
            const config = {
              headers: {
                "Content-type": "application/json",
                Authorization: `Bearer ${user.token}`,
              },
            };
            const payload = {
              content: "Voice Message",
              chatId: selectedChat._id,
              messageType: "audio",
              fileUrl: uploadedUrl,
            };
            const { data } = await axios.post(
              `${ENDPOINT}/api/message`,
              payload,
              config
            );
            if (socketConnected) socket.emit("new message", data);
            setMessages((prev) => [...prev, data]);
          } catch (error) {
            toast({ title: "Failed to send audio", status: "error" });
          }
        }
      };

      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (err) {
      toast({ title: "Microphone Access Denied", status: "error", duration: 3000 });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const handleForward = (message) => {
    setNewMessage(`Forwarded: ${message.content}`);
    toast({ title: "Message content copied to input", status: "info" });
  };

  const typingHandler = (e) => {
    setNewMessage(e.target.value);
    if (!socketConnected) return;

    if (!typing) {
      setTyping(true);
      socket.emit("typing", {
        room: selectedChat._id,
        user: { name: user.name },
      });
    }

    let lastTypingTime = new Date().getTime();
    var timerLength = 3000;
    setTimeout(() => {
      var timeNow = new Date().getTime();
      if (timeNow - lastTypingTime >= timerLength && typing) {
        socket.emit("stop typing", selectedChat._id);
        setTyping(false);
      }
    }, timerLength);
  };

  const deleteMessage = async (messageId) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.delete(`${ENDPOINT}/api/message/delete/${messageId}`, config);
      if (socketConnected) socket.emit("message deleted", { chatId: selectedChat._id, messageId });
      setMessages(messages.filter((m) => m._id !== messageId));
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Failed to delete";
      toast({ title: "Error", description: errorMsg, status: "error" });
    }
  };

  const editMessage = async (messageId, newContent) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.put(
        `${ENDPOINT}/api/message/edit`,
        { messageId, content: newContent },
        config
      );
      if (socketConnected) socket.emit("message edited", data);
      setMessages(messages.map((m) => (m._id === messageId ? data : m)));
    } catch (error) {
        const errorMsg = error.response?.data?.message || "Failed to edit";
        toast({ title: "Error", description: errorMsg, status: "error" });
    }
  };

  const addReaction = async (messageId, emoji) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.put(
        `${ENDPOINT}/api/message/reaction`,
        { messageId, emoji },
        config
      );
      if (socketConnected) socket.emit("add reaction", {
        chatId: selectedChat._id,
        messageId,
        reactions: data.reactions,
      });
      setMessages(messages.map((m) => (m._id === messageId ? data : m)));
    } catch (error) {
        const errorMsg = error.response?.data?.message || "Failed to react";
        toast({ title: "Error", description: errorMsg, status: "error" });
    }
  };

  // --- ENHANCED SOCKET SETUP WITH RECONNECTION LOGIC ---
  useEffect(() => {
    if(!user) return;
    
    // Initialize socket with reconnection parameters
    socket = io(ENDPOINT, {
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
    });

    socket.emit("setup", user);
    
    socket.on("connected", () => {
        setSocketConnected(true);
        // Automatically rejoin current chat if we were in one before disconnect
        if (selectedChatCompare) {
            socket.emit("join chat", selectedChatCompare._id);
        }
    });

    socket.on("reconnect", () => {
        socket.emit("setup", user);
        if (selectedChatCompare) {
            socket.emit("join chat", selectedChatCompare._id);
        }
        toast({ title: "Reconnected", status: "success", duration: 2000 });
    });

    socket.on("connect_error", (err) => {
        setSocketConnected(false);
        console.log("Socket connection error:", err.message);
    });

    socket.on("typing", (data) => {
      if (selectedChatCompare && selectedChatCompare._id === data.room) {
        setTypingUser(data.user.name);
        setIsTyping(true);
      }
    });

    socket.on("stop typing", (room) => {
      if (selectedChatCompare && selectedChatCompare._id === room) {
        setIsTyping(false);
      }
    });

    socket.on("get-users", (users) => setOnlineUsers(users));

    return () => {
      socket.disconnect();
      socket.off();
    };
  }, [user]);

  useEffect(() => {
    const handleMessageReceived = (newMessageRecieved) => {
      if (!selectedChatCompare || selectedChatCompare._id !== newMessageRecieved.chat._id) {
        if (!notification.includes(newMessageRecieved)) {
          setNotification([newMessageRecieved, ...notification]);
          setFetchAgain(!fetchAgain);
          showNotification(newMessageRecieved);
        }
      } else {
        setMessages((prev) => [...prev, newMessageRecieved]);
        if (user && socketConnected) {
          socket.emit("message read", {
            chatId: selectedChatCompare._id,
            userId: user._id,
          });
        }
      }
    };
    
    const handleReadUpdate = (data) => {
        if (selectedChatCompare && selectedChatCompare._id === data.chatId) {
            setMessages((prev) => prev.map((m) => 
                !m.readBy.includes(data.userId) ? { ...m, readBy: [...m.readBy, data.userId] } : m
            ));
        }
    };

    const handleEditUpdate = (updatedMsg) => {
        if (selectedChatCompare && selectedChatCompare._id === updatedMsg.chat._id) {
            setMessages((prev) => prev.map(m => m._id === updatedMsg._id ? updatedMsg : m));
        }
    };

    const handleDeleteUpdate = (id) => {
        setMessages((prev) => prev.filter(m => m._id !== id));
    };

    const handleReactionUpdate = (data) => {
        if (selectedChatCompare && selectedChatCompare._id === data.chatId) {
            setMessages((prev) => prev.map(m => m._id === data.messageId ? { ...m, reactions: data.reactions } : m));
        }
    };

    if (socket) {
        socket.on("message received", handleMessageReceived);
        socket.on("message read update", handleReadUpdate);
        socket.on("message edited update", handleEditUpdate);
        socket.on("message deleted update", handleDeleteUpdate);
        socket.on("reaction received", handleReactionUpdate);
    }
    
    return () => {
        if(socket) {
            socket.off("message received", handleMessageReceived);
            socket.off("message read update", handleReadUpdate);
            socket.off("message edited update", handleEditUpdate);
            socket.off("message deleted update", handleDeleteUpdate);
            socket.off("reaction received", handleReactionUpdate);
        }
    };
  });

  useEffect(() => {
    fetchMessages(1);
    setPage(1);
    selectedChatCompare = selectedChat;
    setSearchQuery("");
    setSearchOpen(false);
  }, [selectedChat]);

  const displayedMessages = searchQuery
    ? messages.filter((m) =>
        m.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  const isBlocked = selectedChat?.users.some(u => 
    user?.blockedUsers?.includes(u._id)
  );

  return (
    <>
      {selectedChat ? (
        <>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            w="100%"
            px={2}
            pb={3}
            color={textColor}
          >
            <IconButton
              display={{ base: "flex", md: "none" }}
              icon={<ArrowBackIcon />}
              onClick={() => setSelectedChat("")}
            />

            {searchOpen ? (
              <Input
                placeholder="Search in chat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                w="50%"
                bg={inputBg}
              />
            ) : (
              <Box display="flex" flexDir="column">
                <Text
                  fontSize={{ base: "28px", md: "30px" }}
                  fontFamily="Work sans"
                >
                  {!selectedChat.isGroupChat
                    ? getSender(user, selectedChat.users)
                    : selectedChat.chatName.toUpperCase()}
                </Text>
                {!selectedChat.isGroupChat && (
                  <Text
                    fontSize="12px"
                    color={isOnline() ? "green.500" : iconColor}
                  >
                    {isOnline() ? "● Online" : "Last seen recently"}
                  </Text>
                )}
              </Box>
            )}

            <Box display="flex" alignItems="center" gap={2}>
              <IconButton
                icon={searchOpen ? <CloseIcon /> : <SearchIcon />}
                onClick={() => {
                  setSearchOpen(!searchOpen);
                  setSearchQuery("");
                }}
              />
              {!selectedChat.isGroupChat ? (
                <ProfileModal
                  user={getSenderFull(user, selectedChat.users)}
                />
              ) : (
                <UpdateGroupChatModal
                  fetchAgain={fetchAgain}
                  setFetchAgain={setFetchAgain}
                  fetchMessages={() => fetchMessages(1)}
                />
              )}
            </Box>
          </Box>

          <Box
            display="flex"
            flexDir="column"
            justifyContent="flex-end"
            p={3}
            bg={chatBg}
            w="100%"
            h="100%"
            borderRadius="lg"
            overflowY="hidden"
          >
            {loading && page === 1 ? (
              <Spinner size="xl" w={20} h={20} alignSelf="center" margin="auto" />
            ) : (
              <div className="messages">
                <ScrollableChat
                  messages={displayedMessages}
                  setReplyingTo={setReplyingTo}
                  deleteMessage={deleteMessage}
                  editMessage={editMessage}
                  addReaction={addReaction}
                  handleForward={handleForward}
                  fetchMore={() => {
                    if (hasMore) {
                      const nextPage = page + 1;
                      fetchMessages(nextPage);
                      setPage(nextPage);
                    }
                  }}
                  hasMore={hasMore}
                />
              </div>
            )}

            <FormControl onKeyDown={sendMessage} isRequired mt={3}>
              {isTyping && (
                <Text fontSize="xs" fontStyle="italic" color="gray.500" ml={1} mb={1}>
                  {typingUser} is typing...
                </Text>
              )}

              {replyingTo && (
                <Box
                  bg="white"
                  p={2}
                  mb={1}
                  borderLeft="4px solid teal"
                  borderRadius="md"
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box>
                    <Text fontSize="xs" fontWeight="bold" color="teal.500">
                      Replying to {replyingTo.sender.name}
                    </Text>
                    <Text fontSize="xs" noOfLines={1}>
                      {replyingTo.content}
                    </Text>
                  </Box>
                  <IconButton
                    size="xs"
                    icon={<CloseIcon />}
                    onClick={() => setReplyingTo(null)}
                  />
                </Box>
              )}

              {showPicker && (
                <Box position="absolute" bottom="60px" zIndex="10">
                  <Picker onEmojiClick={(e) => setNewMessage((prev) => prev + e.emoji)} />
                </Box>
              )}

              <InputGroup>
                <Box mr={1}>
                  <input
                    type="file"
                    id="file-upload"
                    style={{ display: "none" }}
                    onChange={handleFileUpload}
                  />
                  <IconButton
                    icon={<AttachmentIcon />}
                    onClick={() => document.getElementById("file-upload").click()}
                    aria-label="Attach File"
                    isLoading={loading}
                    variant="ghost"
                  />
                </Box>

                <Input
                  variant="filled"
                  bg={inputBg}
                  placeholder={isBlocked ? "Unblock this user to send messages" : "Enter a message.."}
                  value={newMessage}
                  onChange={typingHandler}
                  color={textColor}
                  _hover={{ bg: inputBg }}
                  isDisabled={isBlocked}
                />

                <InputRightElement width="8.5rem">
                  <Button
                    size="xs"
                    mr={1}
                    fontSize="10px"
                    colorScheme="pink"
                    onClick={() =>
                      toast({
                        title: "GIPHY",
                        description: "Integration Ready (Needs API Key)",
                        status: "info",
                      })
                    }
                    isDisabled={isBlocked}
                  >
                    GIF
                  </Button>

                  <IconButton
                    h="1.75rem"
                    size="sm"
                    mr={1}
                    colorScheme={recording ? "red" : "gray"}
                    onClick={recording ? stopRecording : startRecording}
                    icon={<span>{recording ? "⏹" : "🎤"}</span>}
                    isLoading={loading && !recording}
                    isDisabled={isBlocked}
                  />

                  <IconButton
                    h="1.75rem"
                    size="sm"
                    onClick={() => setShowPicker(!showPicker)}
                    icon={<span>😊</span>}
                    bg="transparent"
                    isDisabled={isBlocked}
                  />
                </InputRightElement>
              </InputGroup>
            </FormControl>
          </Box>
        </>
      ) : (
        <Box display="flex" alignItems="center" justifyContent="center" h="100%">
          <Text fontSize="3xl" fontFamily="Work sans" color={textColor}>
            Click on a user to start chatting
          </Text>
        </Box>
      )}
    </>
  );
};

export default SingleChat;