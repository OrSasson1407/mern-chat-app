const asyncHandler = require("express-async-handler");
const Message = require("../models/messageModel");
const User = require("../models/userModel");
const Chat = require("../models/chatModel");

// @description     Send a New Message (with Reply & Media support)
// @route           POST /api/message
// @access          Protected
const sendMessage = asyncHandler(async (req, res) => {
  const { content, chatId, parentMessageId, messageType, fileUrl } = req.body;

  if ((!content && !fileUrl) || !chatId) {
    console.log("Invalid data passed into request");
    return res.sendStatus(400);
  }

  // 1. Fetch the chat and users to check for blocks
  const chat = await Chat.findById(chatId).populate("users", "blockedUsers");
  if (!chat) {
    res.status(404);
    throw new Error("Chat Not Found");
  }

  var newMessage = {
    sender: req.user._id,
    content: content,
    chat: chatId,
    parentMessage: parentMessageId || null,
    messageType: messageType || "text",
    fileUrl: fileUrl || "",
    readBy: [req.user._id], // Sender has read their own message
  };

  try {
    var message = await Message.create(newMessage);

    message = await message.populate("sender", "name pic");
    message = await message.populate("chat");
    message = await message.populate("parentMessage");

    // 2. Identify if any recipient has blocked the sender
    // Filter the chat users to exclude those who have blocked the current sender
    const activeRecipients = chat.users.filter((u) => {
      // Check if the recipient has the sender in their blockedUsers list
      return !u.blockedUsers.includes(req.user._id);
    });

    // 3. Populate users who haven't blocked the sender for real-time delivery logic
    message = await User.populate(message, {
      path: "chat.users",
      select: "name pic email",
    });

    // 4. Update the logic for real-time delivery:
    // We attach the filtered list of IDs who should actually receive this message via socket
    const messageResponse = message.toObject();
    messageResponse.realTimeRecipients = activeRecipients.map((u) => u._id);

    // Update the Chat model with the latest message
    await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });

    res.json(messageResponse);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// @description     Fetch All Messages with Pagination for Infinite Scroll
// @route           GET /api/message/:chatId?pageNumber=1
// @access          Protected
const allMessages = asyncHandler(async (req, res) => {
  const pageSize = 20; // Load 20 messages at a time
  const page = Number(req.query.pageNumber) || 1;

  try {
    const count = await Message.countDocuments({ chat: req.params.chatId });

    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "name pic email")
      .populate("chat")
      .populate("parentMessage")
      .populate("reactions.user", "name pic")
      .sort({ createdAt: -1 }) // Get the newest messages first
      .limit(pageSize)
      .skip(pageSize * (page - 1));

    // We reverse the array before sending so the client gets them in chronological order
    res.json({
      messages: messages.reverse(),
      page,
      pages: Math.ceil(count / pageSize),
    });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// @description     Search messages across all of a user's chats
// @route           GET /api/message/search?keyword=hello
// @access          Protected
const searchMessages = asyncHandler(async (req, res) => {
  const { keyword } = req.query;

  if (!keyword) {
    return res.status(400).send("Keyword required");
  }

  try {
    // 1. Find all chats this user belongs to
    const userChats = await Chat.find({
      users: { $elemMatch: { $eq: req.user._id } },
    });
    const chatIds = userChats.map((c) => c._id);

    // 2. Search messages within those chats containing the keyword
    const messages = await Message.find({
      chat: { $in: chatIds },
      content: { $regex: keyword, $options: "i" },
      messageType: "text",
    })
      .populate("sender", "name pic")
      .populate("chat")
      .sort({ createdAt: -1 });

    res.json(messages);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// @description     Add or update a reaction on a message
// @route           PUT /api/message/reaction
// @access          Protected
const addReaction = asyncHandler(async (req, res) => {
  const { messageId, emoji } = req.body;
  const message = await Message.findById(messageId);

  if (!message) {
    res.status(404);
    throw new Error("Message not found");
  }

  // Remove existing reaction from this user if it exists
  message.reactions = message.reactions.filter(
    (r) => r.user.toString() !== req.user._id.toString()
  );

  // Add the new reaction
  message.reactions.push({ emoji, user: req.user._id });
  await message.save();

  const updatedMessage = await Message.findById(messageId)
    .populate("sender", "name pic")
    .populate("chat")
    .populate("reactions.user", "name pic");

  res.json(updatedMessage);
});

// @description     Edit message content
// @route           PUT /api/message/edit
// @access          Protected
const editMessage = asyncHandler(async (req, res) => {
  const { messageId, content } = req.body;
  const message = await Message.findById(messageId);

  if (!message) return res.sendStatus(404);

  if (message.sender.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error("Not authorized to edit this message");
  }

  const updatedMessage = await Message.findByIdAndUpdate(
    messageId,
    { content: content, isEdited: true },
    { new: true }
  )
    .populate("sender", "name pic")
    .populate("chat")
    .populate("reactions.user", "name pic");

  res.json(updatedMessage);
});

// @description     Delete a specific message
// @route           DELETE /api/message/delete/:messageId
// @access          Protected
const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const message = await Message.findById(messageId);

  if (!message) return res.sendStatus(404);

  if (message.sender.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error("Not authorized to delete this message");
  }

  await Message.findByIdAndDelete(messageId);
  res.json({ message: "Message removed" });
});

// @description     Mark all messages in a chat as read for the user
// @route           PUT /api/message/read
// @access          Protected
const markAsRead = asyncHandler(async (req, res) => {
  const { chatId } = req.body;
  await Message.updateMany(
    { chat: chatId, readBy: { $ne: req.user._id } },
    { $addToSet: { readBy: req.user._id } }
  );
  res.json({ success: true });
});

module.exports = {
  sendMessage,
  allMessages,
  searchMessages,
  addReaction,
  editMessage,
  deleteMessage,
  markAsRead,
};