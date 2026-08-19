import { Router } from "express"
import { createPlantPropagation, getPlantPropagation, updatePlantPropagation, deletePlantPropagation } from "../controllers/plantPropagation.controller.js"

const router = Router()

router.post("/create", createPlantPropagation)
router.get("/getPlantPropagation/:plant_id", getPlantPropagation)
router.put("/update/:id", updatePlantPropagation)
router.delete("/delete/:id", deletePlantPropagation)

export default router
