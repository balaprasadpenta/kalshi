import "dotenv/config";
import express from "express";
import mongoose from "mongoose";

import authRouter from "./routes/authRoute.js"
import marketRouter from "./routes/marketRoute.js"
import resolveRouter from "./routes/resolveRoute.js"

const app = express();

app.use(express.json());

app.use("/api/v1/auth", authRouter)
app.use("/api/v1/market", marketRouter)
app.use("/api/v1/resolve", resolveRouter)

async function main() {

await mongoose.connect(process.env.DATABASE_URI)
console.log("mongodb connected")

  app.listen(process.env.PORT || 3000, () => {
    console.log("server running on port 3000");
  });
}

main().catch(console.error)
