// models/QRCodeData.js
const mongoose = require("mongoose");

const qrCodeSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  data: { type: String, required: true },
  qrCodeImage: { type: String, required: true },
  qrCodeId: { type: String, required: true },
  qrData: { type: String, required: true }
});

const QRCodeData = mongoose.model("QRCodeData", qrCodeSchema);

module.exports = QRCodeData;
