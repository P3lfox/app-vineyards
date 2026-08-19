import { Router } from "express"
import {
  getAllVarietals,
  getVineyardVarietals,
  addVineyardVarietals,
  removeVineyardVarietal,
} from "../controllers/varietals.controller.js"

const router = Router()

router.get("/", getAllVarietals)
router.get("/vineyard/:vineyardId", getVineyardVarietals)
router.post("/vineyard/:vineyardId/add", addVineyardVarietals)
router.delete("/vineyard/:vineyardId/remove/:varietalId", removeVineyardVarietal)

export default router
