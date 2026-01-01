const asyncHandler = require("express-async-handler");
const Message = require("../models/messageModel");
const User = require("../models/userModel");
const Chat = require("../models/chatModel");

// @description     Send a New Message (Supports Text, Media, Location, and Polls)
// @route           POST /api/message
// @access          Protected
const sendMessage = asyncHandler(async (req, res) => {
  const { content, chatId, parentMessageId, messageType, fileUrl, location, poll } = req.body;

  if (!chatId || (!content && !fileUrl && !location && !poll)) {
    return res.status(400).json({ message: "Invalid data passed into request" });
  }

  // Fetch the chat to check for block status
  const chat = await Chat.findById(chatId).populate("users", "blockedUsers");
  if (!chat) {
    res.status(404);
    throw new Error("Chat Not Found");
  }

  var newMessage = {
    sender: req.user._id,
    content: content || "",
    chat: chatId,
    parentMessage: parentMessageId || null,
    messageType: messageType || "text",
    fileUrl: fileUrl || "",
    readBy: [req.user._id],
    // NEW: Advanced Feature fields
    location: location || null,
    poll: poll ? {
      question: poll.question,
      options: poll.options.map(opt => ({ text: opt, votes: [] }))
    } : null,
  };

  try {
    var message = await Message.create(newMessage);

    message = await message.populate("sender", "name pic");
    message = await message.populate("chat");
    message = await message.populate("parentMessage");

    // Block logic: identify users who haven't blocked the sender for Socket delivery
    const activeRecipients = chat.users.filter((u) => {
      return !u.blockedUsers.includes(req.user._id);
    });

    message = await User.populate(message, {
      path: "chat.users",
      select: "name pic email",
    });

    const messageResponse = message.toObject();
    messageResponse.realTimeRecipients = activeRecipients.map((u) => u._id);

    // Update the Chat model with the latest message
    await Chat.findByIdAndUpdate(chatId, { latestMessage: message });

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
  const pageSize = 20; 
  const page = Number(req.query.pageNumber) || 1;

  try {
    const count = await Message.countDocuments({ chat: req.params.chatId });

    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "name pic email")
      .populate("chat")
      .populate("parentMessage")
      .populate("reactions.user", "name pic")
      .populate("poll.options.votes", "name pic") // Populate poll voters
      .sort({ createdAt: -1 })
      .limit(pageSize)
      .skip(pageSize * (page - 1));

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

// @description     Vote on a message poll
// @route           PUT /api/message/poll/vote
// @access          Protected
const voteOnPoll = asyncHandler(async (req, res) => {
  const { messageId, optionIndex } = req.body;
  const userId = req.user._id;

  const message = await Message.findById(messageId);
  if (!message || !message.poll) {
    res.status(404);
    throw new Error("Poll not found");
  }

  // Logic: Remove user's previous vote from all options in this poll (Single-choice)
  message.poll.options.forEach(option => {
    option.votes = option.votes.filter(id => id.toString() !== userId.toString());
  });

  // Add vote to the selected option
  message.poll.options[optionIndex].votes.push(userId);
  await message.save();

  const updatedMessage = await Message.findById(messageId)
    .populate("sender", "name pic")
    .populate("poll.options.votes", "name pic");

  res.json(updatedMessage);
});

// @description     Search messages across all of a user's chats
const searchMessages = asyncHandler(async (req, res) => {
  const { keyword } = req.query;
  if (!keyword) return res.status(400).send("Keyword required");

  try {
    const userChats = await Chat.find({ users: { $elemMatch: { $eq: req.user._id } } });
    const chatIds = userChats.map((c) => c._id);

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

// @description     Edit message content
const editMessage = asyncHandler(async (req, res) => {
  const { messageId, content } = req.body;
  const message = await Message.findById(messageId);

  if (!message || message.sender.toString() !== req.user._id.toString()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const updatedMessage = await Message.findByIdAndUpdate(
    messageId,
    { content: content, isEdited: true },
    { new: true }
  )
    .populate("sender", "name pic")
    .populate("chat");

  res.json(updatedMessage);
});

// @description     Delete a specific message
const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const message = await Message.findById(messageId);

  if (!message || message.sender.toString() !== req.user._id.toString()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  await Message.findByIdAndDelete(messageId);
  res.json({ message: "Message removed" });
});

// @description     Mark as read
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
  voteOnPoll, // Export the new voting controller
};