const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const { generateAccessToken, generateRefreshToken } = require("../utils/generateToken");
const jwt = require("jsonwebtoken");

// Helper to set cookie
const sendTokenResponse = (user, statusCode, res) => {
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Options for cookie
  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true, // Not accessible via JS
    secure: process.env.NODE_ENV === "production", // HTTPS only in prod
    sameSite: "strict", // CSRF protection
  };

  res
    .status(statusCode)
    .cookie("jwt", refreshToken, options)
    .json({
      _id: user._id,
      name: user.name,
      email: user.email,
      pic: user.pic,
      token: accessToken, // Frontend uses this
      blockedUsers: user.blockedUsers,
    });
};

// @description     Register new user
// @route           POST /api/user
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, pic } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please Enter all the Fields");
  }

  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(email)) {
    res.status(400);
    throw new Error("Invalid email format");
  }

  if (password.length < 6) {
    res.status(400);
    throw new Error("Password must be at least 6 characters long");
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
    sendTokenResponse(user, 201, res);
  } else {
    res.status(400);
    throw new Error("Failed to Create the User");
  }
});

// @description     Auth the user & get token
// @route           POST /api/user/login
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    sendTokenResponse(user, 200, res);
  } else {
    res.status(401);
    throw new Error("Invalid Email or Password");
  }
});

// @description     Refresh Access Token
// @route           GET /api/user/refresh
// @access          Public (Cookie based)
const refreshAccessToken = asyncHandler(async (req, res) => {
  const cookie = req.cookies.jwt;

  if (!cookie) {
    res.status(401);
    throw new Error("No refresh token, please login");
  }

  try {
    const decoded = jwt.verify(cookie, process.env.JWT_REFRESH_SECRET);
    
    // Check if user still exists
    const user = await User.findById(decoded.id);
    if(!user) {
        res.status(401);
        throw new Error("User not found");
    }

    const accessToken = generateAccessToken(user._id);

    res.json({ token: accessToken });
  } catch (error) {
    res.status(401);
    throw new Error("Invalid refresh token");
  }
});

// @description     Logout user
// @route           POST /api/user/logout
const logoutUser = asyncHandler(async (req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: "Logged out successfully" });
});

// @description     Get or Search all users
// @route           GET /api/user?search=name
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

const blockUser = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    res.status(400);
    throw new Error("User ID is required to block");
  }
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $addToSet: { blockedUsers: userId } },
    { new: true }
  ).select("-password");

  res.json(user);
});

const unblockUser = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    res.status(400);
    throw new Error("User ID is required to unblock");
  }
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $pull: { blockedUsers: userId } },
    { new: true }
  ).select("-password");

  res.json(user);
});

module.exports = { 
    registerUser, 
    authUser, 
    refreshAccessToken, 
    logoutUser,
    allUsers, 
    blockUser, 
    unblockUser 
};