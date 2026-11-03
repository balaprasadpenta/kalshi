import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
    enum: ["admin", "customer"],
  },
  usdBalance: {
    type: Number,
    default: 0,
  },
  lockedUsdBalance: {
    type: Number,
    default: 0,
  },
});

export const User = mongoose.model("User", userSchema);
