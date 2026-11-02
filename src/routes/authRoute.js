import Router from "express";
import {auth} from "../middleware/auth.js";
import {
  signin,
  signup,
  onramp,
  getProfile,
  getTransactions,
} from "../controllers/authController.js";

const router = Router();

router.post("/signin", signin);
router.post("/signup", signup);

router.post("/onramp", auth, onramp);
router.get("/profile", auth, getProfile);
router.get("/transactions", auth, getTransactions);

export default router;

