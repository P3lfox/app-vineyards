import { Router } from "express"
import { createVineyard, getVineyard, getVineyardById, updateVineyard, deleteVineyard, restoreVineyard } from "../controllers/vineyards.controller.js"

const router = Router()

router.post("/createVineyard", createVineyard)
router.get("/getVineyard", getVineyard)
router.get("/getVineyard/:id", getVineyardById)
router.patch("/updateVineyard/:id", updateVineyard)
router.delete("/deleteVineyard/:id", deleteVineyard)
router.patch("/restoreVineyard/:id", restoreVineyard)

export default router
