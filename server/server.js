const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const cors = require("cors");
const { Server } = require("socket.io");
const User = require("./models/userModel");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize");

const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

dotenv.config();
connectDB();

const app = express();

/* =========================
   1️⃣ Security & Parsers
========================= */
// ביטול חסימת Cross-Origin של Helmet
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// ✅ FIX FOR EXPRESS 5:
// הספריה mongo-sanitize מנסה לכתוב ל-req.query אבל ב-Express 5 הוא נעול.
// הקוד הזה משחרר אותו כדי שהספריה תעבוד ולא תקריס את השרת.
app.use((req, res, next) => {
  Object.defineProperty(req, 'query', {
    writable: true,
    enumerable: true,
    configurable: true,
    value: req.query
  });
  next();
});

app.use(mongoSanitize());
app.use(express.json());
app.use(cookieParser());

/* =========================
   2️⃣ CORS (Express 5 Safe)
========================= */
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // console.log("❌ Blocked by CORS:", origin);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions)); // Regex fix for Express 5

/* =========================
   3️⃣ Rate Limiter
========================= */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => req.method === "OPTIONS",
});

app.use("/api", apiLimiter);

/* =========================
   4️⃣ File Upload
========================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "audio/mpeg",
    "audio/webm",
    "application/pdf",
  ];
  allowed.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error("Invalid file type"), false);
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  res.json({ path: `/uploads/${req.file.filename}` });
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* =========================
   5️⃣ Routes
========================= */
app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

/* =========================
   6️⃣ Production
========================= */
const root = path.resolve();
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(root, "client/build")));
  app.get(/.*/, (req, res) =>
    res.sendFile(path.resolve(root, "client", "build", "index.html"))
  );
} else {
  app.get("/", (req, res) => res.send("API running"));
}

/* =========================
   7️⃣ Errors & Server
========================= */
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);

/* =========================
   8️⃣ Socket.io
========================= */
const io = new Server(server, {
  pingTimeout: 60000,
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
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

  socket.on("new message", (msg) => {
    msg.chat.users.forEach((u) => {
      if (u._id !== msg.sender._id) {
        socket.in(u._id).emit("message received", msg);
      }
    });
  });

  socket.on("disconnect", async () => {
    const user = onlineUsers.find((u) => u.socketId === socket.id);
    if (user) {
      await User.findByIdAndUpdate(user.userId, { lastSeen: new Date() });
      onlineUsers = onlineUsers.filter((u) => u.socketId !== socket.id);
      io.emit("get-users", onlineUsers);
    }
  });
});