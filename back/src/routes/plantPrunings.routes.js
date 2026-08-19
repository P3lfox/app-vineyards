import { Router } from "express"
import { createPlantPruning, getPlantPrunings, updatePlantPruning, deletePlantPruning, getPlantsForPruning } from "../controllers/plantPrunings.controller.js"

const router = Router()

router.post("/create", createPlantPruning)
router.get("/getPlantPrunings/:plant_id", getPlantPrunings)
router.get("/getPlantsForPruning", getPlantsForPruning)
router.put("/update/:id", updatePlantPruning)
router.delete("/delete/:id", deletePlantPruning)

export default router
