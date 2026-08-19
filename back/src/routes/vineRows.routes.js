import { Router } from "express"
import { createVineRow, getVineRows, updateVineRow, deleteVineRow, restoreVineRow } from "../controllers/vineRows.controller.js"

const router = Router()

router.post("/createVineRow", createVineRow)
router.get("/getVineRows", getVineRows)
router.patch("/updateVineRow/:id", updateVineRow)
router.delete("/deleteVineRow/:id", deleteVineRow)
router.patch("/restoreVineRow/:id", restoreVineRow)

export default router
