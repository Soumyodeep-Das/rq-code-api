// routes/qrcodeRoutes.js
const express = require("express");
const QRCode = require("qrcode");
const QRCodeData = require("../models/QRCodeData");

const router = express.Router();

const crypto = require('crypto');

function generateShortQrCodeId(userId) {
  // Combine userId with the current timestamp
  const combinedString = `${userId}_${new Date().getTime()}`;

  // Generate an MD5 hash of the combined string
  const hash = crypto.createHash('md5').update(combinedString).digest('hex');

  // Take the first 8-10 characters of the hash
  const shortQrCodeId = `${hash.slice(0, 8)}`; // You can adjust the length here as needed
  
  return shortQrCodeId;
}

// GET all QR codes by userId
router.get("/user/:userId/qrcodes", async (req, res) => {
  try {
    const qrCodes = await QRCodeData.find({ userId: req.params.userId });
    res.json(qrCodes);
  } catch (err) {
    console.error("Error fetching QR codes:", err);
    res.status(500).json({ error: "Failed to fetch QR codes" });
  }
});

// POST to generate a new QR code
router.post("/generate", async (req, res) => {
  const { userId, data } = req.body;
  try {
    const SITE_URL = process.env.SITE_URL;  // Get SITE_URL from .env

    // Generate a unique QR code ID
    const qrCodeId = generateShortQrCodeId(userId);
    
    // Create the QR code image URL using the SITE_URL and qrCodeId
    const qrCodeUrl = `${SITE_URL}/api/qr/${qrCodeId}`;
    const qrCodeImage = await QRCode.toDataURL(data);  // QR code containing the generated URL

    // Assign qrCodeUrl to qrData if required
    const qrData = qrCodeUrl;  // You can store the QR code URL or any other relevant data

    // Save QR code data in the database
    const qrCode = new QRCodeData({
      userId,
      data,
      qrCodeImage,
      qrCodeId,  // Store qrCodeId for reference
      qrData,  // Store the URL or data in qrData
    });

    // Save the QR code data
    await qrCode.save();

    // Return the response with the QR code data
    res.status(200).json({
      success: true,
      message: "QR Code created",
      qrCode: {
        qrCodeId,
        qrCodeImage,
        data,
        qrCodeUrl,
      },
    });
  } catch (err) {
    console.error("Error generating QR code:", err);
    res.status(500).json({ error: "Failed to generate QR code" });
  }
});



// PUT to update an existing QR code
router.put("/qr/:qrCodeId", async (req, res) => {
  const { qrCodeId } = req.params;
  const { data, userId } = req.body;

  try {
    // Find the existing QR code by qrCodeId
    const qrCode = await QRCodeData.findOne({ qrCodeId });
    if (!qrCode) return res.status(404).json({ message: "QR Code not found" });

    // Check if the user is authorized to update the QR code
    if (qrCode.userId !== userId) return res.status(403).json({ message: "Unauthorized" });

    // Update only the 'data' and optionally the 'qrData' (URL) field
    qrCode.data = data;  // Update the data
    qrCode.qrData = `${process.env.SITE_URL}/qr/${qrCodeId}`;  // Optionally, update the URL (it remains the same)

    // Regenerate the QR code image based on new data
    qrCode.qrCodeImage = await QRCode.toDataURL(data);  // Regenerate the QR code image

    // Save the updated QR code data
    await qrCode.save();

    // Return the updated QR code data
    res.json({
      success: true,
      message: "QR Code updated",
      qrCode: {
        qrCodeId,
        qrCodeImage: qrCode.qrCodeImage,
        data,
        qrCodeUrl: qrCode.qrData,  // Returning the updated URL
      },
    });
  } catch (err) {
    console.error("Error updating QR code:", err);
    res.status(500).json({ error: "Failed to update QR code" });
  }
});


// DELETE a QR code
router.delete("/qr/:qrCodeId", async (req, res) => {
  try {
    const deletedQRCode = await QRCodeData.findOneAndDelete({ qrCodeId: req.params.qrCodeId });
    if (!deletedQRCode) return res.status(404).json({ message: "QR Code not found" });
    res.json({ message: "QR Code deleted successfully" });
  } catch (err) {
    console.error("Error deleting QR code:", err);
    res.status(500).json({ error: "Failed to delete QR code" });
  }
});

// Route to handle redirection
router.get("/qr/:qrCodeId", async (req, res) => {
  const { qrCodeId } = req.params;

  try {
    // Find the QR code data from the database
    const qrCode = await QRCodeData.findOne({ qrCodeId });

    if (!qrCode) {
      return res.status(404).send("QR Code not found");
    }

    // Redirect to the original data (link)
    const originalLink = qrCode.data;
    console.log("Redirecting to:", originalLink);

    // Perform a 301 redirect to the original link
    res.redirect(301, originalLink);
  } catch (err) {
    console.error("Error during redirection:", err);
    res.status(500).send("Failed to redirect to the original link");
  }
});
module.exports = router;
