import mongoose from "mongoose";

const marketSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  resolution: {
    type: String,
    enum: ["yes", "no", "null"],
    default: null,
  },
  totalIssued: {
    type: Number,
  },
});

export const Market = mongoose.model("Market", marketSchema);
