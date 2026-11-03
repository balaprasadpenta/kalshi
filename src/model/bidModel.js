import mongoose from "mongoose"

const bidSchema = new mongoose.Schema({
    orderBookID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "OrderBook",
    },
    userId: {
        type: String, 
        ref: "User",
    },
    stockType: {
        type: String, 
        enum: ["yes", "no"],
    },
    price: {
        type: Number, 
        default: 0,
    }, 
    qty: {
        type: Number, 
    },
    // remainingQty: {
    //     type: Number, 
    // },
    // status: {
    //     type: String, 
    // }
})

export const Bid = mongoose.model("Bid", bidSchema)