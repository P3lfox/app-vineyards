import { useEffect, useState } from "react"
import { api } from "../services/api"
import { useNavigate } from "react-router-dom"
import { varietalColor } from "../constants/varietalColors"
import PlantHealthModal from "../components/PlantHealthModal"
import CatalogDrawer from "../components/CatalogDrawer"

type Plot = {
  id: number
  nombre: string
  vineyard_id: number
  area_m2?: number | null
  vineyard_nombre?: string
}

type VineRow = {
  id: number
  numero: number
  plant_count: number
}

type Plant = {
  id: number
  codigo: string | null
  varietal_nombre: string
  varietal_tipo: string
  row_numero: number
}

type Disease = {
  id: number
  nombre: string
  tipo: string
  descripcion: string | null
  gravedad: string
  deleted_at: string | null
}

type Treatment = {
  id: number
  nombre: string
  descripcion: string | null
  deleted_at: string | null
}

export default function PlantHealthMap() {
  const navigate = useNavigate()

  const [plots, setPlots] = useState<Plot[]>([])
  const [selectedPlotId, setSelectedPlotId] = useState<number | null>(null)
  const [rows, setRows] = useState<VineRow[]>([])
  const [plants, setPlants] = useState<Plant[]>([])
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<"disease" | "treatment">("disease")
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [diseases, setDiseases] = useState<Disease[]>([])
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [activeDiseasePlantIds, setActiveDiseasePlantIds] = useState<Set<number>>(new Set())
  const [activeTreatmentPlantIds, setActiveTreatmentPlantIds] = useState<Set<number>>(new Set())
  const [loadingHealth, setLoadingHealth] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Fetch plots + catalog on mount (same pattern as Plots.tsx)
  useEffect(() => {
    Promise.all([
      api.get("/plots/getPlots"),
      api.get("/diseases/getDiseases"),
      api.get("/treatments/getTreatments"),
    ])
      .then(([plotsRes, diseasesRes, treatmentsRes]) => {
        setPlots(plotsRes.data)
        setDiseases(diseasesRes.data)
        setTreatments(treatmentsRes.data)
      })
      .catch((err) => {
        console.error("Error fetching sanidad data:", err)
        setFetchError("Error al cargar datos. Recargá la página.")
      })
  }, [])

  // Group plots by vineyard for selector
  const plotsWithVineyard = plots.map(plot => ({
    ...plot,
    vineyard_nombre: plot.vineyard_nombre || "Sin viñedo",
  }))

  // Fetch rows + plants when plot selected
  useEffect(() => {
    if (!selectedPlotId) {
      setRows([])
      setPlants([])
      setActiveDiseasePlantIds(new Set())
      setActiveTreatmentPlantIds(new Set())
      return
    }

    let cancelled = false

    const fetchData = async () => {
      setLoading(true)
      try {
        const [rowsRes, plantsRes] = await Promise.all([
          api.get(`/vine-rows/getVineRows?plot_id=${selectedPlotId}`),
          api.get(`/plants/getPlants?plot_id=${selectedPlotId}`),
        ])

        if (cancelled) return

        setRows(rowsRes.data)
        setPlants(plantsRes.data)

        // Fetch active diseases and treatments for each planted plant
        const plantedPlants = plantsRes.data as Plant[]
        if (plantedPlants.length > 0) {
          setLoadingHealth(true)
          try {
            const [diseaseResults, treatmentResults] = await Promise.all([
              Promise.all(
                plantedPlants.map(plant =>
                  api.get(`/plant-diseases/getPlantDiseases/${plant.id}`)
                    .then(res => ({ plantId: plant.id, hasData: res.data.length > 0 }))
                    .catch(() => ({ plantId: plant.id, hasData: false }))
                )
              ),
              Promise.all(
                plantedPlants.map(plant =>
                  api.get(`/plant-treatments/getPlantTreatments/${plant.id}`)
                    .then(res => ({ plantId: plant.id, hasData: res.data.length > 0 }))
                    .catch(() => ({ plantId: plant.id, hasData: false }))
                )
              ),
            ])

            if (cancelled) return

            const diseaseIds = new Set<number>()
            const treatmentIds = new Set<number>()
            for (const r of diseaseResults) {
              if (r.hasData) diseaseIds.add(r.plantId)
            }
            for (const r of treatmentResults) {
              if (r.hasData) treatmentIds.add(r.plantId)
            }
            setActiveDiseasePlantIds(diseaseIds)
            setActiveTreatmentPlantIds(treatmentIds)
          } finally {
            if (!cancelled) setLoadingHealth(false)
          }
        }
      } catch {
        // handled by caller
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, [selectedPlotId])

  const getPlantForCell = (rowNumero: number, cellIdx: number) => {
    const rowPlants = plants.filter(p => p.row_numero === rowNumero)
    return rowPlants[cellIdx]
  }

  const selectedPlot = plotsWithVineyard.find(p => p.id === selectedPlotId)
  const maxPlantsInRow = rows.length > 0 ? Math.max(...rows.map(r => r.plant_count), 0) : 0

  const handleCellClick = (plant: Plant) => {
    setSelectedPlant(plant)
  }

  const handleNavigate = (path: string) => {
    setSelectedPlant(null)
    navigate(path)
  }

  return (
    <div className="w-full p-6 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Sanidad 🏥</h1>
        <p className="text-slate-400 text-sm">
          Mapa de salud de plantas por parcela
        </p>
      </div>

      {/* Error state */}
      {fetchError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4">
          {fetchError}
        </div>
      )}

      {/* Controls: plot selector + mode toggle + catalog button */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Plot selector - shows all plots if vineyards is empty */}
        <select
          value={selectedPlotId || ""}
          onChange={e => setSelectedPlotId(e.target.value ? Number(e.target.value) : null)}
          className="flex-1 min-w-[200px] p-2.5 rounded-lg bg-slate-700 text-white outline-none text-sm"
        >
          <option value="">Seleccionar parcela...</option>
          {plotsWithVineyard.map(plot => (
            <option key={plot.id} value={plot.id}>
              {plot.nombre} ({plot.vineyard_nombre})
            </option>
          ))}
        </select>

        {/* Mode toggle */}
        <div className="flex bg-slate-700 rounded-lg p-1">
          <button
            onClick={() => setMode("disease")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              mode === "disease"
                ? "bg-red-600 text-white"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Enfermedades
          </button>
          <button
            onClick={() => setMode("treatment")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              mode === "treatment"
                ? "bg-blue-600 text-white"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Tratamientos
          </button>
        </div>

        {/* Catalog button - always visible */}
        <button
          onClick={() => setCatalogOpen(true)}
          className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition flex items-center gap-2"
        >
          📋 Ver catálogo
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="w-full p-6 text-slate-300 text-center">Cargando...</div>
      )}

      {/* Empty state */}
      {!loading && !selectedPlotId && (
        <div className="bg-slate-800 rounded-xl p-12 text-center">
          <p className="text-slate-400">Selecciona una parcela para ver el mapa de sanidad.</p>
        </div>
      )}

      {!loading && selectedPlotId && rows.length === 0 && (
        <div className="bg-slate-800 rounded-xl p-12 text-center">
          <p className="text-slate-400">No hay filas creadas en esta parcela.</p>
        </div>
      )}

      {/* Grid */}
      {!loading && selectedPlotId && rows.length > 0 && (
        <>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-violet-700 border border-violet-600" /> Tinta</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-lime-500 border border-lime-400" /> Blanca</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-rose-400 border border-rose-300" /> Rosada</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-slate-700 border border-slate-600" /> Sin planta</span>
            <span className="flex items-center gap-1">
              <span className={`w-3 h-3 rounded-sm border-2 border-red-500 ${loadingHealth ? "animate-pulse" : ""}`} />
              {loadingHealth ? "Verificando..." : "Con enfermedad"}
            </span>
            <span className="flex items-center gap-1">
              <span className={`w-3 h-3 rounded-sm border-2 border-cyan-400 ${loadingHealth ? "animate-pulse" : ""}`} />
              {loadingHealth ? "Verificando..." : "Con tratamiento"}
            </span>
          </div>

          {/* Plot info */}
          <p className="text-slate-400 text-sm">
            {selectedPlot?.vineyard_nombre} → {selectedPlot?.nombre} — {rows.length} filas · {plants.length} plantas
          </p>

          {/* Grid rendering */}
          <div className="bg-slate-800 rounded-xl p-4 overflow-auto">
            <div className="space-y-1 min-w-fit">
              {rows.map(row => (
                <div key={row.id} className="flex items-center gap-1">
                  <span className="text-xs text-slate-500 w-10 text-right mr-2 shrink-0">F{row.numero}</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: Math.max(maxPlantsInRow, 1) }).map((_, idx) => {
                      const plant = getPlantForCell(row.numero, idx)
                      const hasDisease = plant ? activeDiseasePlantIds.has(plant.id) : false
                      const hasTreatment = plant ? activeTreatmentPlantIds.has(plant.id) : false

                      // Visual priority: disease (red) > treatment (cyan) > none
                      const healthIndicator = hasDisease
                        ? "border-red-500 ring-1 ring-red-500/40"
                        : hasTreatment
                          ? "border-cyan-400 ring-1 ring-cyan-400/40"
                          : ""

                      return (
                        <button
                          key={idx}
                          onClick={() => plant && handleCellClick(plant)}
                          title={plant
                            ? `${plant.varietal_nombre} (F${row.numero} #${idx + 1})${hasDisease ? " ⚠️ Enfermedad" : ""}${hasTreatment ? " 💊 Tratamiento" : ""}`
                            : `F${row.numero} #${idx + 1} — vacía`}
                          className={`w-5 h-5 rounded-sm border transition-all shrink-0 ${
                            plant
                              ? `${varietalColor[plant.varietal_tipo] || "bg-slate-600 border-slate-500"} hover:opacity-80`
                              : "bg-slate-700 border-slate-600 opacity-30"
                          } ${healthIndicator} ${
                            plant ? "cursor-pointer" : "cursor-default"
                          }`}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* PlantHealthModal */}
      {selectedPlant && (
        <PlantHealthModal
          plant={selectedPlant}
          mode={mode}
          diseases={diseases}
          treatments={treatments}
          onClose={() => setSelectedPlant(null)}
          onNavigate={handleNavigate}
          onCatalogOpen={() => {
            setSelectedPlant(null)
            setCatalogOpen(true)
          }}
        />
      )}

      {/* CatalogDrawer */}
      <CatalogDrawer
        mode={mode}
        open={catalogOpen}
        onClose={() => setCatalogOpen(false)}
      />
    </div>
  )
}
