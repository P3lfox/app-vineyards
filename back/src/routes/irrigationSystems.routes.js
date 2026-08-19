import { Router } from "express"
import { getIrrigationSystems } from "../controllers/irrigationSystems.controller.js"

const router = Router()

router.get("/getIrrigationSystems", getIrrigationSystems)

export default router
