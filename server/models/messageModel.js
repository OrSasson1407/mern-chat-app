const mongoose = require("mongoose");

const messageSchema = mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    content: { type: String, trim: true },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
    
    // Read Receipts
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    
    // Media Support (Updated)
    messageType: { 
        type: String, 
        enum: ["text", "image", "video", "audio", "file"], 
        default: "text" 
    },
    fileUrl: { type: String, default: "" },

    // Reply/Quote Support
    parentMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    
    // Edit Status
    isEdited: { type: Boolean, default: false },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
    poll: {
    question: { type: String },
    options: [{
    text: { type: String },
    votes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  }]
},
    // Reactions
    reactions: [
      {
        emoji: String,
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;