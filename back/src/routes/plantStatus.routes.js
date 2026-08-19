import { Router } from "express"
import { createPlantStatus, getPlantStatusHistory, updatePlantStatus } from "../controllers/plantStatus.controller.js"

const router = Router()

router.post("/create", createPlantStatus)
router.get("/getHistory/:plant_id", getPlantStatusHistory)
router.put("/update/:plant_id", updatePlantStatus)

export default router
