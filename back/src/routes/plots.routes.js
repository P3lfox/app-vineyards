import { Router } from "express"
import { createPlot, getPlot, getPlots, updatePlot, deletePlot, restorePlot } from "../controllers/plots.controller.js"

const router = Router()

router.post("/createPlot", createPlot)
router.get("/getPlot/:id", getPlot)
router.get("/getPlots", getPlots)
router.patch("/updatePlot/:id", updatePlot)
router.delete("/deletePlot/:id", deletePlot)
router.patch("/restorePlot/:id", restorePlot)

export default router
