import mongoose from "mongoose";

const fillSchema = new mongoose.Schema({
  // tradeId: {
  //   type: mongoose.Schema.Types.ObjectId,
  // },
  // orderId: {
  //   type: mongoose.Schema.Types.ObjectId,
  // },
  orderBookId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  userId: {
    type: Number,
    ref: "User",
  },
  price: {
    type: Number,
  },
  qty: {
    type: Number,
  },
  type: {
    type: String,
    enum: ["buy", "sell"],
  },
  isMaker: {
    type: Boolean,
  },
});
