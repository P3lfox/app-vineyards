import { Router } from "express"
import {
  createIrrigationEvent,
  getIrrigationEvents,
  getAllIrrigationEvents,
  startEvent,
  finishEvent,
  getIrrigationEvent,
  deleteIrrigationEvent,
  restoreIrrigationEvent,
} from "../controllers/irrigationEvents.controller.js"

const router = Router()

router.post("/create", createIrrigationEvent)
router.get("/getIrrigationEvents/:plot_id", getIrrigationEvents)
router.get("/getAllIrrigationEvents", getAllIrrigationEvents)
router.put("/startEvent/:id", startEvent)
router.put("/finishEvent/:id", finishEvent)
router.get("/getIrrigationEvent/:id", getIrrigationEvent)
router.delete("/delete/:id", deleteIrrigationEvent)
router.put("/restore/:id", restoreIrrigationEvent)

export default router
