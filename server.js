require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./utils/dbConnect");
const qrcodeRoutes = require("./routes/qrcodeRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Routes
app.use("/api", qrcodeRoutes);

// Root route
app.get("/", (req, res) => res.send("API is running..."));

// Start the server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
