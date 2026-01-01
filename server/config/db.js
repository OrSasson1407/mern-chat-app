const mongoose = require("mongoose");
const colors = require("colors"); // Ensure this is installed

const connectDB = async () => {
  try {
    // UPDATED: Removed deprecated options (useNewUrlParser, useUnifiedTopology)
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline);
  } catch (error) {
    console.log(`Error: ${error.message}`.red.bold);
    process.exit(1); // Exit with failure
  }
};

module.exports = connectDB;