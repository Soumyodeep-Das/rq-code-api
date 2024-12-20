const mongoose = require("mongoose");

const UserDataSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  data: { type: String, required: true },
});

module.exports = mongoose.model("UserData", UserDataSchema);
