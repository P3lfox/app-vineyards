import { Router } from "express"
import { createTreatment, getTreatments, updateTreatment, deleteTreatment, restoreTreatment } from "../controllers/treatments.controller.js"

const router = Router()

router.post("/create", createTreatment)
router.get("/getTreatments", getTreatments)
router.put("/update/:id", updateTreatment)
router.delete("/delete/:id", deleteTreatment)
router.put("/restore/:id", restoreTreatment)

export default router
