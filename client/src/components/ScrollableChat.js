//
import {
  Avatar,
  Tooltip,
  Box,
  Text,
  Image,
  Menu,
  MenuButton,
  MenuList,
  MenuDivider,
  MenuItem,
  IconButton,
  Input,
  Icon,
  Link,
  useColorModeValue,
} from "@chakra-ui/react";
import ScrollableFeed from "react-scrollable-feed";
import {
  isLastMessage,
  isSameSender,
  isSameSenderMargin,
  isSameUser,
  formatTime,
  isSameDay,
  getDateLabel,
} from "../config/ChatLogics";
import { ChatState } from "../context/ChatProvider";
import {
  ChevronDownIcon,
  CheckIcon,
  CloseIcon,
  AttachmentIcon,
  ArrowForwardIcon,
} from "@chakra-ui/icons";
import { useState } from "react";

// --- SUB-COMPONENT: Single Message Item ---
const MessageItem = ({ 
  m, 
  i, 
  messages, 
  user, 
  setReplyingTo, 
  deleteMessage, 
  editMessage, 
  addReaction, 
  handleForward 
}) => {
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [isExpanded, setIsExpanded] = useState(false); // For "Read More"

  // Dark Mode Colors
  const myBg = useColorModeValue("linear(to-r, #00B5D8, #3182CE)", "linear(to-r, #00B5D8, #3182CE)");
  const otherBg = useColorModeValue("linear(to-r, #EDF2F7, #E2E8F0)", "gray.700");
  const myColor = "white";
  const otherColor = useColorModeValue("black", "white");
  const dateBadgeBg = useColorModeValue("#E1F5FE", "gray.700");
  const dateBadgeColor = useColorModeValue("#0288D1", "blue.200");
  const replyBg = useColorModeValue("rgba(0,0,0,0.06)", "rgba(255,255,255,0.08)");

  const startEditing = () => {
    setEditingId(m._id);
    setEditContent(m.content);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditContent("");
  };

  const saveEdit = () => {
    if (editContent.trim()) {
      editMessage(m._id, editContent);
    }
    setEditingId(null);
  };

  // JUMP TO MESSAGE Logic
  const scrollToMessage = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      // Highlight effect
      const originalTransition = element.style.transition;
      element.style.transition = "background 0.5s";
      element.style.backgroundColor = "rgba(255, 255, 0, 0.3)"; // Highlight color
      setTimeout(() => {
        element.style.backgroundColor = "transparent";
        element.style.transition = originalTransition;
      }, 1500);
    }
  };

  // Render Content based on Type (Image, Audio, File, Text)
  const renderContent = () => {
    // 1. IMAGE
    if (m.messageType === "image") {
      return (
        <Image
          src={m.fileUrl}
          borderRadius="lg"
          maxH="200px"
          mb={1}
          maxW="100%"
          border="2px solid rgba(255,255,255,0.2)"
        />
      );
    }

    // 2. AUDIO
    if (m.messageType === "audio") {
      return <audio controls src={m.fileUrl} style={{ maxWidth: "100%" }} />;
    }

    // 3. FILE
    if (m.messageType === "file") {
      return (
        <Link
          href={m.fileUrl}
          isExternal
          display="flex"
          alignItems="center"
          bg="whiteAlpha.300"
          p={2}
          borderRadius="md"
          _hover={{ textDecoration: "none", bg: "whiteAlpha.500" }}
        >
          <Icon as={AttachmentIcon} mr={2} />
          <Text fontSize="sm" fontWeight="bold">Download File</Text>
        </Link>
      );
    }

    // 4. EDIT MODE
    if (editingId === m._id) {
      return (
        <Box display="flex" alignItems="center" gap={1}>
          <Input
            size="sm"
            bg="white"
            color="black"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveEdit()}
            autoFocus
          />
          <IconButton size="xs" icon={<CheckIcon />} colorScheme="green" onClick={saveEdit} />
          <IconButton size="xs" icon={<CloseIcon />} colorScheme="red" onClick={cancelEditing} />
        </Box>
      );
    }

    // 5. TEXT (With 200 Char Limit)
    const content = m.content || "";
    const isLong = content.length > 200;
    const displayContent = isLong && !isExpanded ? content.substring(0, 200) + "..." : content;

    return (
      <Box pr={6}> {/* Right padding to avoid overlap with menu arrow */}
        <Text fontSize="sm" wordBreak="break-word">
          {displayContent}
          {m.isEdited && <small style={{ opacity: 0.7, marginLeft: "4px" }}>(edited)</small>}
        </Text>
        {isLong && (
          <Text
            as="span"
            fontSize="xs"
            fontWeight="bold"
            cursor="pointer"
            color={m.sender._id === user._id ? "whiteAlpha.900" : "blue.400"}
            onClick={() => setIsExpanded(!isExpanded)}
            display="block"
            mt={1}
            textAlign="right"
          >
            {isExpanded ? "Show Less" : "Read More"}
          </Text>
        )}
      </Box>
    );
  };

  const showDate = i === 0 || !isSameDay(messages[i - 1], m);
  const isMe = m.sender._id === user._id;

  return (
    <Box width="100%" id={m._id} px={2}> {/* ID added here for Scrolling */}
      
      {/* Date Separator */}
      {showDate && (
        <Box display="flex" justifyContent="center" my={3}>
          <Text
            bg={dateBadgeBg}
            color={dateBadgeColor}
            px={3}
            py={1}
            borderRadius="lg"
            fontSize="xs"
            fontWeight="bold"
            boxShadow="sm"
          >
            {getDateLabel(m.createdAt)}
          </Text>
        </Box>
      )}

      <Box display="flex" width="100%" justifyContent={isMe ? "flex-end" : "flex-start"} mb={1}>
        {/* Avatar (Left Only) */}
        {!isMe && (isSameSender(messages, m, i, user._id) || isLastMessage(messages, i, user._id)) && (
          <Tooltip label={m.sender.name} placement="bottom-start" hasArrow>
            <Avatar mt="7px" mr={1} size="sm" cursor="pointer" name={m.sender.name} src={m.sender.pic} />
          </Tooltip>
        )}

        {/* Message Bubble Container */}
        <Box
          bgGradient={isMe ? myBg : otherBg}
          bg={!isMe && otherBg} // Fallback for solid color if gradient not preferred
          color={isMe ? myColor : otherColor}
          ml={isMe ? 0 : isSameSenderMargin(messages, m, i, user._id)}
          mt={isSameUser(messages, m, i) ? 1 : 2}
          borderRadius="2xl"
          borderTopLeftRadius={!isMe && !isSameUser(messages, m, i) ? "0" : "2xl"}
          borderTopRightRadius={isMe && !isSameUser(messages, m, i) ? "0" : "2xl"}
          px={4}
          py={2}
          maxWidth={{ base: "85%", md: "75%" }}
          display="flex"
          flexDirection="column"
          position="relative"
          role="group" // Important for Hover Menu
          boxShadow="md"
        >
          
          {/* Reply Preview (Click to Jump) */}
          {m.parentMessage && (
            <Box
              bg={replyBg}
              p={1}
              borderRadius="md"
              mb={1}
              borderLeft="3px solid"
              borderLeftColor={isMe ? "white" : "teal.500"}
              cursor="pointer"
              onClick={() => scrollToMessage(m.parentMessage._id)}
              _hover={{ bg: "whiteAlpha.200" }}
            >
              <Text fontSize="10px" fontWeight="bold" opacity={0.9}>
                {m.parentMessage.sender.name}
              </Text>
              <Text fontSize="10px" noOfLines={1} opacity={0.8}>
                {m.parentMessage.content}
              </Text>
            </Box>
          )}

          {/* Actual Content */}
          {renderContent()}

          {/* Reactions (Stacked at bottom) */}
          {m.reactions?.length > 0 && (
            <Box
              position="absolute"
              bottom="-10px"
              right={isMe ? 0 : "auto"}
              left={!isMe ? 0 : "auto"}
              bg="white"
              color="black"
              borderRadius="full"
              px={1}
              boxShadow="md"
              fontSize="xs"
              border="1px solid #eee"
              zIndex="1"
            >
              {m.reactions.slice(0, 3).map((r, idx) => (
                <span key={idx}>{r.emoji}</span>
              ))}
              {m.reactions.length > 3 && <span>+{m.reactions.length - 3}</span>}
            </Box>
          )}

          {/* Time & Ticks */}
          <Box display="flex" justifyContent="flex-end" alignItems="center" gap={1} mt={1}>
            <Text fontSize="9px" opacity={0.7}>
              {formatTime(m.createdAt)}
            </Text>
            {isMe && (
              <span style={{ fontSize: "11px", opacity: 0.9, fontWeight: "bold" }}>
                {m.readBy.length > 1 ? "✓✓" : "✓"}
              </span>
            )}
          </Box>

          {/* WHATSAPP STYLE MENU (Top Right, Inside Bubble) */}
          {editingId !== m._id && (
            <Box
              position="absolute"
              top="2px"
              right="2px"
              opacity={0}
              _groupHover={{ opacity: 1 }}
              transition="all 0.2s"
              zIndex="10"
            >
              <Menu isLazy placement="bottom-end">
                <MenuButton
                  as={IconButton}
                  size="xs"
                  aria-label="Options"
                  icon={<ChevronDownIcon fontSize="lg" />}
                  variant="ghost"
                  color={isMe ? "white" : "gray.500"}
                  _hover={{ bg: "blackAlpha.200" }}
                  _active={{ bg: "blackAlpha.300" }}
                  h="20px"
                  w="20px"
                  minW="0"
                  borderRadius="full"
                />
                <MenuList size="sm" color="black" minW="140px" fontSize="sm">
                  <MenuItem icon={<ArrowForwardIcon />} onClick={() => handleForward && handleForward(m)}>
                    Forward
                  </MenuItem>
                  <MenuItem onClick={() => setReplyingTo(m)}>
                    Reply
                  </MenuItem>
                  <MenuItem onClick={() => addReaction(m._id, "❤️")}>
                    React ❤️
                  </MenuItem>
                  <MenuItem onClick={() => addReaction(m._id, "👍")}>
                    React 👍
                  </MenuItem>
                  {isMe && (
                    <>
                      <MenuDivider />
                      <MenuItem onClick={startEditing}>Edit</MenuItem>
                      <MenuItem color="red.500" onClick={() => deleteMessage(m._id)}>
                        Delete
                      </MenuItem>
                    </>
                  )}
                </MenuList>
              </Menu>
            </Box>
          )}

        </Box>
      </Box>
    </Box>
  );
};

// --- MAIN WRAPPER ---
const ScrollableChat = ({ 
  messages, 
  setReplyingTo, 
  deleteMessage, 
  editMessage, 
  addReaction, 
  handleForward 
}) => {
  const { user } = ChatState();

  return (
    <ScrollableFeed className="scroll-feed">
      {messages &&
        messages.map((m, i) => (
          <MessageItem
            key={m._id}
            m={m}
            i={i}
            messages={messages}
            user={user}
            setReplyingTo={setReplyingTo}
            deleteMessage={deleteMessage}
            editMessage={editMessage}
            addReaction={addReaction}
            handleForward={handleForward}
          />
        ))}
    </ScrollableFeed>
  );
};

export default ScrollableChat;