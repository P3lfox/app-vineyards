import express from "express"
import cors from "cors"
import authRoutes from "./routes/auth.routes.js"
import usersRoutes from "./routes/users.routes.js"
import vineyardsRoutes from "./routes/vineyards.routes.js"
import plotsRoutes from "./routes/plots.routes.js"
import varietalsRoutes from "./routes/varietals.routes.js"
import vineRowsRoutes from "./routes/vineRows.routes.js"
import plantsRoutes from "./routes/plants.routes.js"
import plantStatusRoutes from "./routes/plantStatus.routes.js"
import diseasesRoutes from "./routes/diseases.routes.js"
import treatmentsRoutes from "./routes/treatments.routes.js"
import plantDiseasesRoutes from "./routes/plantDiseases.routes.js"
import plantTreatmentsRoutes from "./routes/plantTreatments.routes.js"
import plantNotesRoutes from "./routes/plantNotes.routes.js"
import plantYieldRoutes from "./routes/plantYield.routes.js"
import plantPruningsRoutes from "./routes/plantPrunings.routes.js"
import plantPropagationRoutes from "./routes/plantPropagation.routes.js"
import irrigationSystemsRoutes from "./routes/irrigationSystems.routes.js"
import irrigationEventsRoutes from "./routes/irrigationEvents.routes.js"
import irrigationCoverageRoutes from "./routes/irrigationCoverage.routes.js"
import irrigationEventImpactRoutes from "./routes/irrigationEventImpact.routes.js"
import tasksRoutes from "./routes/tasks.routes.js"
import { verificarToken } from "./middleware/auth.middleware.js"


const app = express()

app.use(cors())
app.use(express.json())

app.use("/api/auth", authRoutes)
app.use("/api/users", verificarToken, usersRoutes)
app.use("/api/vineyard", verificarToken, vineyardsRoutes)
app.use("/api/plots", verificarToken, plotsRoutes)
app.use("/api/varietals", verificarToken, varietalsRoutes)
app.use("/api/vine-rows", verificarToken, vineRowsRoutes)
app.use("/api/plants", verificarToken, plantsRoutes)
app.use("/api/plant-status", verificarToken, plantStatusRoutes)
app.use("/api/diseases", verificarToken, diseasesRoutes)
app.use("/api/treatments", verificarToken, treatmentsRoutes)
app.use("/api/plant-diseases", verificarToken, plantDiseasesRoutes)
app.use("/api/plant-treatments", verificarToken, plantTreatmentsRoutes)
app.use("/api/plant-notes", verificarToken, plantNotesRoutes)
app.use("/api/plant-yield", verificarToken, plantYieldRoutes)
app.use("/api/plant-prunings", verificarToken, plantPruningsRoutes)
app.use("/api/plant-propagation", verificarToken, plantPropagationRoutes)
app.use("/api/irrigation-systems", verificarToken, irrigationSystemsRoutes)
app.use("/api/irrigation-events", verificarToken, irrigationEventsRoutes)
app.use("/api/irrigation-coverage", verificarToken, irrigationCoverageRoutes)
app.use("/api/irrigation-event-impact", verificarToken, irrigationEventImpactRoutes)
app.use("/api/tasks", verificarToken, tasksRoutes)

export default app
