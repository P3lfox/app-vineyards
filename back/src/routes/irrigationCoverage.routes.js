import { Router } from "express"
import { createIrrigationCoverageBatch, getIrrigationCoverageByEvent } from "../controllers/irrigationCoverage.controller.js"

const router = Router()

router.post("/createBatch", createIrrigationCoverageBatch)
router.get("/getByEvent/:event_id", getIrrigationCoverageByEvent)

export default router
