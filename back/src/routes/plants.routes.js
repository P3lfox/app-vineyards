import { Router } from "express"
import { createPlant, createPlantsBatch, updatePlant, getPlant, getPlants, deletePlant, restorePlant } from "../controllers/plants.controller.js"
import { createPlantStatus, getPlantStatusHistory, updatePlantStatus } from "../controllers/plantStatus.controller.js"

const router = Router()

router.post("/createPlant", createPlant)
router.post("/createPlantsBatch", createPlantsBatch)
router.patch("/updatePlant/:id", updatePlant)
router.get("/getPlant/:id", getPlant)
router.get("/getPlants", getPlants)
router.delete("/deletePlant/:id", deletePlant)
router.patch("/restorePlant/:id", restorePlant)

router.post("/plantStatus", createPlantStatus)
router.get("/plantStatus/:plant_id", getPlantStatusHistory)
router.patch("/plantStatus/:plant_id", updatePlantStatus)

export default router
