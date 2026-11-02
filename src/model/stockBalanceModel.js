import mongoose from "mongoose";

export const stockBalanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  markteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Market",
  },
  type: {
    type: String,
  },
  qty: {
    type: Number,
  },
  locked: {
    type: String,
    enum: ["yes", "no"],
  },
});

export const StockBalance = mongoose.model("StockBalance", stockBalanceSchema);
