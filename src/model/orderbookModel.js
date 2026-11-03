import mongoose from "mongoose";

const orderBookSchema = new mongoose.Schema({
  marketId: {
    type: String,
    ref: "Market",
    required: true,
    unique: true,
  },
  type: {
    type: String,
    enum: ["yes", "no"],
  },
});

export const OrderBook = mongoose.model("OrderBook", orderBookSchema);
