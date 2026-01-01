const express = require("express");
const { 
    sendMessage, 
    allMessages, 
    addReaction, 
    editMessage, 
    deleteMessage,
    markAsRead,
    searchMessages
} = require("../controllers/messageControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/").post(protect, sendMessage);
router.route("/:chatId").get(protect, allMessages);

// NEW: Global Search
router.route("/global/search").get(protect, searchMessages);

// Advanced routes
router.route("/reaction").put(protect, addReaction);
router.route("/edit").put(protect, editMessage);
router.route("/delete/:messageId").delete(protect, deleteMessage);
router.route("/read").put(protect, markAsRead);

module.exports = router;