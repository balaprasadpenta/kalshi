import{ Router} from "express"
import { auth } from "../middleware/auth.js";
import { resolveMarket } from "../controllers/resolveController.js";

const router = Router()

router.post('/', auth, resolveMarket)

export default router;