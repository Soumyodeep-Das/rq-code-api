require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const QRCode = require("qrcode");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Define the schema for user data and QR codes
const qrCodeSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  data: { type: String, required: true }, // The text or URL data for the QR code
  qrCodeImage: { type: String, required: true }, // Store the QR code image as a base64 string
  qrCodeId: { type: String, required: true }, // Unique QR code ID
});

const QRCodeData = mongoose.model("QRCodeData", qrCodeSchema);

// Models for storing UserData
const UserData = require("./models/UserData");

app.get("/", (req, res) => {
  res.send("API is running...");
});

// POST route to generate/update user data and QR code
app.post("/generate", async (req, res) => {
  const { userId, data } = req.body;

  console.log("Received request to generate/update user data");
  console.log("UserId:", userId);
  console.log("Data:", data);

  try {
    // Check if userId already exists in UserData collection
    let userData = await UserData.findOne({ userId });

    if (!userData) {
      // If user data doesn't exist, create new entry
      userData = new UserData({ userId, data });
      await userData.save();
      console.log("New user data created:", userData);
    } else {
      // If user data exists, update the data field
      userData.data = data;
      await userData.save();
      console.log("User data updated:", userData);
    }

    // Generate the QR code image as a base64 string
    const qrCodeDataUrl = await QRCode.toDataURL(data);

    // Create QR code document
    const qrCode = new QRCodeData({
      userId: userData.userId,
      data: userData.data,
      qrCodeImage: qrCodeDataUrl,
      qrCodeId: `qr_${new Date().getTime()}`, // Generate a unique QR code ID
    });

    // Save the QR code to MongoDB
    await qrCode.save();
    console.log("New QR Code created:", qrCode);

    res.status(200).json({
      success: true,
      message: "Data and QR code saved successfully",
      qrCodeId: qrCode.qrCodeId,
      qrCodeImage: qrCode.qrCodeImage,
      data: qrCode.data,
    });
  } catch (error) {
    console.error("Error saving user data and QR code:", error);
    res.status(500).json({ success: false, error: "Server Error" });
  }
});

// QRCode Routes
const router = express.Router();

// GET route to fetch QR codes by userId
router.get("/user/:userId/qrcodes", async (req, res) => {
  try {
    const qrCodes = await QRCodeData.find({ userId: req.params.userId });
    res.json(qrCodes);
  } catch (err) {
    console.error("Error fetching QR codes:", err);
    res.status(500).json({ error: "Failed to fetch QR codes" });
  }
});

// PUT route to update an existing QR code
router.put("/qr/:qrCodeId", async (req, res) => {
  const { qrCodeId } = req.params;
  const { data, userId } = req.body;

  try {
    // Find the QR code by qrCodeId
    const qrCode = await QRCodeData.findOne({ qrCodeId });

    if (!qrCode) {
      return res.status(404).json({ success: false, message: "QR Code not found" });
    }

    // Verify that the userId matches (authorization check)
    if (qrCode.userId !== userId) {
      return res.status(403).json({ success: false, message: "Unauthorized update attempt" });
    }

    // Update the data and regenerate the QR code image
    qrCode.data = data;
    qrCode.qrCodeImage = await QRCode.toDataURL(data); // Regenerate QR code with new data

    // Save the updated QR code to the database
    await qrCode.save();

    res.status(200).json({
      success: true,
      message: "QR Code updated successfully",
      qrCodeId: qrCode.qrCodeId,
      data: qrCode.data,
      qrCodeImage: qrCode.qrCodeImage,
    });
  } catch (error) {
    console.error("Error updating QR code:", error);
    res.status(500).json({ success: false, error: "Failed to update QR code" });
  }
});


// DELETE route to remove a QR code
router.delete("/qr/:qrCodeId", async (req, res) => {
  try {
    const deletedQRCode = await QRCodeData.findOneAndDelete({
      qrCodeId: req.params.qrCodeId,
    });
    if (!deletedQRCode) return res.status(404).send("QR Code not found");
    res.send("QR Code deleted successfully");
  } catch (err) {
    console.error("Error deleting QR code:", err);
    res.status(500).json({ error: "Failed to delete QR code" });
  }
});

// Use the router for API routes
app.use("/api", router);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
