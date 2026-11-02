import mongoose from "mongoose";

const orderBookSchema = new mongoose.Schema({
  marketId: {
    type: String,
    required: true,
    unique: true,
  },
  type: {
    type: String,
    enum: [],
  },
});

export const OrderBook = mongoose.model("OrderBook", orderBookSchema);
