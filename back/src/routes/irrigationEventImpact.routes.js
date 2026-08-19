import { Router } from "express"
import { createIrrigationEventImpactBatch, getIrrigationEventImpactByEvent } from "../controllers/irrigationEventImpact.controller.js"

const router = Router()

router.post("/createBatch", createIrrigationEventImpactBatch)
router.get("/getByEvent/:event_id", getIrrigationEventImpactByEvent)

export default router
