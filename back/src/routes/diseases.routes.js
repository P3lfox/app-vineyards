import { Router } from "express"
import { createDisease, getDiseases, updateDisease, deleteDisease, restoreDisease } from "../controllers/diseases.controller.js"

const router = Router()

router.post("/create", createDisease)
router.get("/getDiseases", getDiseases)
router.put("/update/:id", updateDisease)
router.delete("/delete/:id", deleteDisease)
router.put("/restore/:id", restoreDisease)

export default router
