import mongoose from "mongoose"

const askSchema = new mongoose.Schema({
      orderBookID: {
            type: mongoose.Schema.Types.ObjectId,
        },
        userId: {
            type: String, 
            ref: "User",
        },
        stockType: {
            type: String, 
        },
        price: {
            type: Number, 
            default: 0,
        }, 
        qty: {
            type: Number, 
        },
        remainingQty: {
            type: Number, 
        },
        status: {
            type: String, 
        }
}) 

export const Ask = mongoose.model("Ask", askSchema)