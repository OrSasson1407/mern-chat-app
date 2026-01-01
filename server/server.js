//
const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const cors = require("cors");
const { Server } = require("socket.io");
const User = require("./models/userModel");
const path = require("path");
const fs = require("fs");
const multer = require("multer"); // NEW: For handling file uploads

const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

dotenv.config();
connectDB();
const app = express();

app.use(express.json());
app.use(cors({ origin: "http://localhost:3000" }));

// --- NEW: MULTER SETUP FOR LOCAL STORAGE ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "uploads");
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp + original extension
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// --- NEW: UPLOAD ROUTE ---
app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }
  // Return the path relative to the server
  res.send(`/uploads/${req.file.filename}`);
});

// --- NEW: SERVE STATIC FILES ---
// This allows the frontend to access http://localhost:5000/uploads/filename.ext
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, console.log(`Server started on PORT ${PORT}`));

const io = new Server(server, {
  pingTimeout: 60000,
  cors: {
    origin: "http://localhost:3000",
  },
});

let onlineUsers = [];

io.on("connection", (socket) => {
  console.log("Connected to socket.io");

  socket.on("setup", (userData) => {
    socket.join(userData._id);
    if (!onlineUsers.some((u) => u.userId === userData._id)) {
      onlineUsers.push({ userId: userData._id, socketId: socket.id });
    }
    io.emit("get-users", onlineUsers);
    socket.emit("connected");
  });

  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User Joined Room: " + room);
  });

  socket.on("typing", (data) => {
    socket.in(data.room).emit("typing", data);
  });

  socket.on("stop typing", (room) => {
    socket.in(room).emit("stop typing", room);
  });

  socket.on("new message", (newMessageRecieved) => {
    var chat = newMessageRecieved.chat;
    if (!chat.users) return console.log("chat.users not defined");

    chat.users.forEach((user) => {
      if (user._id == newMessageRecieved.sender._id) return;
      socket.in(user._id).emit("message received", newMessageRecieved);
    });
  });

  socket.on("add reaction", (data) => {
    socket.in(data.chatId).emit("reaction received", data);
  });

  socket.on("message read", (data) => {
    socket.in(data.chatId).emit("message read update", data);
  });

  socket.on("message edited", (updatedMsg) => {
    socket.in(updatedMsg.chat._id).emit("message edited update", updatedMsg);
  });

  socket.on("message deleted", (data) => {
    socket.in(data.chatId).emit("message deleted update", data.messageId);
  });

  socket.on("disconnect", async () => {
    const disconnectedUser = onlineUsers.find((u) => u.socketId === socket.id);
    if (disconnectedUser) {
      await User.findByIdAndUpdate(disconnectedUser.userId, { lastSeen: new Date() });
      onlineUsers = onlineUsers.filter((u) => u.socketId !== socket.id);
      io.emit("get-users", onlineUsers);
    }
    console.log("USER DISCONNECTED");
  });
});