import { Router } from "express"
import { createPlantDisease, getPlantDiseases, updatePlantDisease, deletePlantDisease } from "../controllers/plantDiseases.controller.js"

const router = Router()

router.post("/create", createPlantDisease)
router.get("/getPlantDiseases/:plant_id", getPlantDiseases)
router.put("/update/:id", updatePlantDisease)
router.delete("/delete/:id", deletePlantDisease)

export default router
