const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📂 Database Name: ${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ Connection Error: ${error.message}`);
    // Check if MongoDB is actually running on your computer
    if (error.message.includes("ECONNREFUSED")) {
        console.error("TIP: Is your MongoDB service running? Try opening MongoDB Compass.");
    }
    process.exit(1);
  }
};

module.exports = connectDB;