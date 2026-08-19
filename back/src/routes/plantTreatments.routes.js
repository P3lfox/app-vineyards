import { Router } from "express"
import { createPlantTreatment, getPlantTreatments, updatePlantTreatment, deletePlantTreatment } from "../controllers/plantTreatments.controller.js"

const router = Router()

router.post("/create", createPlantTreatment)
router.get("/getPlantTreatments/:plant_id", getPlantTreatments)
router.put("/update/:id", updatePlantTreatment)
router.delete("/delete/:id", deletePlantTreatment)

export default router
