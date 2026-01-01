const express = require("express");
const { 
    registerUser, 
    authUser, 
    allUsers, 
    blockUser, 
    unblockUser 
} = require("../controllers/userControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/").post(registerUser).get(protect, allUsers);
router.post("/login", authUser);
// NEW: Block routes
router.route("/block").put(protect, blockUser);
router.route("/unblock").put(protect, unblockUser);

module.exports = router;