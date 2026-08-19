import { Router } from "express"
import { createPlantNote, getPlantNotes, updatePlantNote, deletePlantNote } from "../controllers/plantNotes.controller.js"

const router = Router()

router.post("/create", createPlantNote)
router.get("/getPlantNotes/:plant_id", getPlantNotes)
router.put("/update/:id", updatePlantNote)
router.delete("/delete/:id", deletePlantNote)

export default router
