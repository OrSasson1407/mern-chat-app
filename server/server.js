const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const cors = require("cors");
const { Server } = require("socket.io");
const User = require("./models/userModel");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const helmet = require("helmet"); // Security headers
const rateLimit = require("express-rate-limit"); // Rate limiting

const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

dotenv.config();

// Establish Persistent Connection
connectDB(); 

const app = express();

// --- SECURITY MIDDLEWARE ---
app.use(helmet()); // Sets various HTTP headers for security
app.use(express.json());
app.use(cors({ origin: "http://localhost:3000" }));

// General Rate Limiter: 100 requests per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again after 15 minutes",
});
app.use("/api", apiLimiter);

// --- MULTER SETUP WITH VALIDATION ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true }); // Ensure persistent uploads folder
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  // Only allow common safe file types
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "audio/mpeg", "audio/webm", "application/pdf"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only images, audio, and PDFs are allowed."), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB Limit
  fileFilter: fileFilter 
});

// --- UPLOAD ROUTE WITH ERROR HANDLING ---
app.post("/api/upload", (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    if (!req.file) return res.status(400).send("No file uploaded.");
    res.send(`/uploads/${req.file.filename}`);
  });
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- ROUTES ---
app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

// --- DEPLOYMENT PREPARATION ---
const __dirname1 = path.resolve();
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname1, "/client/build")));
  app.get("*", (req, res) =>
    res.sendFile(path.resolve(__dirname1, "client", "build", "index.html"))
  );
} else {
  app.get("/", (req, res) => {
    res.send("API is running..");
  });
}

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, console.log(`Server started on PORT ${PORT}`));

// --- SOCKET.IO ---
const io = new Server(server, {
  pingTimeout: 60000,
  cors: { origin: "http://localhost:3000" },
});

let onlineUsers = [];

io.on("connection", (socket) => {
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
  });

  socket.on("typing", (data) => {
    socket.in(data.room).emit("typing", data);
  });

  socket.on("stop typing", (room) => {
    socket.in(room).emit("stop typing", room);
  });

  // UPDATED: Socket logic for blocked user filtering
  socket.on("new message", (newMessageRecieved) => {
    var chat = newMessageRecieved.chat;
    if (!chat.users) return console.log("chat.users not defined");

    // Use the filtered realTimeRecipients list provided by the messageController
    const recipients = newMessageRecieved.realTimeRecipients || chat.users.map(u => u._id);

    recipients.forEach((userId) => {
      if (userId == newMessageRecieved.sender._id) return;
      socket.in(userId).emit("message received", newMessageRecieved);
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
      // PERSISTENCE: Save last seen to DB on disconnect
      await User.findByIdAndUpdate(disconnectedUser.userId, { lastSeen: new Date() });
      onlineUsers = onlineUsers.filter((u) => u.socketId !== socket.id);
      io.emit("get-users", onlineUsers);
    }
  });
});