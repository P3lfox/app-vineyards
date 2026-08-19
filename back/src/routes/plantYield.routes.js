import { Router } from "express"
import { createPlantYield, getPlantYield, updatePlantYield, deletePlantYield, getHarvestEstimate } from "../controllers/plantYield.controller.js"

const router = Router()

router.post("/create", createPlantYield)
router.get("/getPlantYield/:plant_id", getPlantYield)
router.put("/update/:id", updatePlantYield)
router.delete("/delete/:id", deletePlantYield)
router.get("/estimate", getHarvestEstimate)

export default router
