const asyncHandler = require("express-async-handler");
const Message = require("../models/messageModel");
const User = require("../models/userModel");
const Chat = require("../models/chatModel");

// Send Message
const sendMessage = asyncHandler(async (req, res) => {
  const { content, chatId, parentMessageId, messageType, fileUrl } = req.body;

  if ((!content && !fileUrl) || !chatId) {
    console.log("Invalid data passed into request");
    return res.sendStatus(400);
  }

  var newMessage = {
    sender: req.user._id,
    content: content,
    chat: chatId,
    parentMessage: parentMessageId || null,
    messageType: messageType || "text",
    fileUrl: fileUrl || "",
    readBy: [req.user._id],
  };

  try {
    var message = await Message.create(newMessage);

    message = await message.populate("sender", "name pic");
    message = await message.populate("chat");
    message = await message.populate("parentMessage");
    message = await User.populate(message, {
      path: "chat.users",
      select: "name pic email",
    });

    await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });

    res.json(message);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// Fetch All Messages
const allMessages = asyncHandler(async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "name pic email")
      .populate("chat")
      .populate("parentMessage")
      .populate("reactions.user", "name pic");

    res.json(messages);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// NEW: Global Message Search
const searchMessages = asyncHandler(async (req, res) => {
  const { keyword } = req.query;

  if (!keyword) {
    return res.status(400).send("Keyword required");
  }

  try {
    // 1. Find all chats this user belongs to
    const userChats = await Chat.find({ users: { $elemMatch: { $eq: req.user._id } } });
    const chatIds = userChats.map(c => c._id);

    // 2. Search messages within those chats containing the keyword
    const messages = await Message.find({
      chat: { $in: chatIds },
      content: { $regex: keyword, $options: "i" },
      messageType: "text" // Usually only search text messages
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

// Add Reaction
const addReaction = asyncHandler(async (req, res) => {
  const { messageId, emoji } = req.body;
  const message = await Message.findById(messageId);
  if (!message) {
    res.status(404);
    throw new Error("Message not found");
  }

  message.reactions = message.reactions.filter(
    (r) => r.user.toString() !== req.user._id.toString()
  );

  message.reactions.push({ emoji, user: req.user._id });
  await message.save();

  const updatedMessage = await Message.findById(messageId)
    .populate("sender", "name pic")
    .populate("chat")
    .populate("reactions.user", "name pic");

  res.json(updatedMessage);
});

// Edit Message
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

// Delete Message
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

// Mark Read
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
    searchMessages, // Exported
    addReaction, 
    editMessage, 
    deleteMessage, 
    markAsRead 
};