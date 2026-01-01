const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const generateToken = require("../utils/generateToken");

// @description     Register new user
// @route           POST /api/user
// @access          Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, pic } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please Enter all the Fields");
  }

  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
  }

  const user = await User.create({
    name,
    email,
    password,
    pic,
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      pic: user.pic,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error("Failed to Create the User");
  }
});

// @description     Auth the user & get token
// @route           POST /api/user/login
// @access          Public
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      pic: user.pic,
      token: generateToken(user._id),
      blockedUsers: user.blockedUsers, // Send blocked list on login
    });
  } else {
    res.status(401);
    throw new Error("Invalid Email or Password");
  }
});

// @description     Get or Search all users
// @route           GET /api/user?search=justin
// @access          Protected
const allUsers = asyncHandler(async (req, res) => {
  const keyword = req.query.search
    ? {
        $or: [
          { name: { $regex: req.query.search, $options: "i" } },
          { email: { $regex: req.query.search, $options: "i" } },
        ],
      }
    : {};

  const users = await User.find(keyword).find({ _id: { $ne: req.user._id } });
  res.send(users);
});

// @description     Block a user
// @route           PUT /api/user/block
// @access          Protected
const blockUser = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $addToSet: { blockedUsers: userId } },
    { new: true }
  );
  res.json(user);
});

// @description     Unblock a user
// @route           PUT /api/user/unblock
// @access          Protected
const unblockUser = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $pull: { blockedUsers: userId } },
    { new: true }
  );
  res.json(user);
});

module.exports = { registerUser, authUser, allUsers, blockUser, unblockUser };