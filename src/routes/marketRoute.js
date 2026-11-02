import { Router } from "express";
import {
  createMarket,
  getBets,
  getMarkets,
  placeBet,
} from "../controllers/marketController.js";
import { auth } from "../middleware/auth.js";

const router = Router();

router.post("/", auth, createMarket);
router.get("/", getMarkets);

router.post("/bet", auth, placeBet);
router.get("/bets", auth, getBets);

export default router;