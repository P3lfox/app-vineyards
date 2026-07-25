import { useEffect, useState } from "react"
import { api } from "../services/api"

type Plot = {
  id: number
  nombre: string
  area_m2?: number
}

type Plant = {
  plant_id: number
  codigo: string | null
  varietal_nombre: string
  varietal_tipo: string
  ya_podada: boolean
}

type Row = {
  row_id: number
  row_numero: number
  parcela_nombre: string
  plants: Plant[]
}

type PruningFormData = {
  tipo_poda: string
  intensidad: string
  fecha: string
  observaciones: string
}

type Phase = "select-plot" | "select-row" | "pruning" | "row-complete" | "all-done"

// ---- Session Persistence ----

interface PruningSessionState {
  plotId: number
  rowId: number
  direction: "forward" | "backward"
  currentPlantIndex: number
  prunedPlantIds: number[]
  startedAt: string
  campania: number
  lastUpdatedAt: string
  podaTaskId?: number | null
}

const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24h

function getSessionKey(plotId: number): string {
  return `pruning-session-${plotId}`
}

function saveSession(plotId: number, state: PruningSessionState): void {
  try {
    sessionStorage.setItem(getSessionKey(plotId), JSON.stringify(state))
  } catch {
    // sessionStorage may be full or unavailable — silently ignore
  }
}

function loadSession(plotId: number): PruningSessionState | null {
  try {
    const raw = sessionStorage.getItem(getSessionKey(plotId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as PruningSessionState
    const age = Date.now() - new Date(parsed.startedAt).getTime()
    if (age > SESSION_EXPIRY_MS) {
      sessionStorage.removeItem(getSessionKey(plotId))
      return null
    }
    return parsed
  } catch {
    sessionStorage.removeItem(getSessionKey(plotId))
    return null
  }
}

function clearSession(plotId: number): void {
  try {
    sessionStorage.removeItem(getSessionKey(plotId))
  } catch {
    // ignore
  }
}

export default function Prunings() {
  const [phase, setPhase] = useState<Phase>("select-plot")
  const [plots, setPlots] = useState<Plot[]>([])
  const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)

  // Campaign state (Phase 3)
  const currentYear = new Date().getFullYear()
  const [campania, setCampania] = useState(currentYear)
  const campaniaOptions = [currentYear, currentYear - 1, currentYear - 2]

  // Session restore state (Phase 2)
  const [showResumePrompt, setShowResumePrompt] = useState(false)
  const [savedSession, setSavedSession] = useState<PruningSessionState | null>(null)

  // Pruning state
  const [currentRowIndex, setCurrentRowIndex] = useState(0)
  const [currentPlantIndex, setCurrentPlantIndex] = useState(0)
  const [direction, setDirection] = useState<"forward" | "backward">("forward")
  const [completedRowIds, setCompletedRowIds] = useState<Set<number>>(new Set())
  const [prunedCount, setPrunedCount] = useState(0)
  const [skippedCount, setSkippedCount] = useState(0)
  const [initialUnprunedCount, setInitialUnprunedCount] = useState(0)
  const [lastFinishedPlantIndex, setLastFinishedPlantIndex] = useState<number | null>(null)
  const [formData, setFormData] = useState<PruningFormData>({
    tipo_poda: "",
    intensidad: "",
    fecha: new Date().toISOString().split("T")[0],
    observaciones: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track pruned plant IDs for session persistence
  const [prunedPlantIds, setPrunedPlantIds] = useState<number[]>([])

  // Optional task integration (Phase 4)
  const [podaTaskId, setPodaTaskId] = useState<number | null>(null)

  // Load plots on mount
  useEffect(() => {
    api.get("/plots/getPlots").then((res) => setPlots(res.data))
  }, [])

  // Phase 2: Check sessionStorage for valid session on mount
  useEffect(() => {
    if (phase !== "select-plot" || !selectedPlot) return
    const session = loadSession(selectedPlot.id)
    if (session) {
      setSavedSession(session)
      setShowResumePrompt(true)
    }
  }, [phase, selectedPlot])

  // Load rows for selected plot
  const loadRows = async (plotId: number, campaignYear?: number) => {
    setLoading(true)
    setError(null)
    const year = campaignYear ?? campania
    try {
      const res = await api.get("/plant-prunings/getPlantsForPruning", {
        params: { plot_id: plotId, campania: year },
      })
      setRows(res.data.rows)
      if (res.data.rows.length === 0) {
        setError("Esta parcela no tiene plantas registradas.")
        return
      }
      setPhase("select-row")
    } catch {
      setError("Error al cargar las filas de la parcela.")
    } finally {
      setLoading(false)
    }
  }

  // Start pruning from selected row
  const startPruning = (rowIndex: number, resumeFrom?: PruningSessionState) => {
    const row = rows[rowIndex]
    const unpruned = row.plants.filter((p) => !p.ya_podada).length

    if (resumeFrom) {
      // Resume from saved session
      setCurrentRowIndex(rowIndex)
      setCurrentPlantIndex(resumeFrom.currentPlantIndex)
      setDirection(resumeFrom.direction)
      setCompletedRowIds(new Set())
      setPrunedCount(0)
      setSkippedCount(0)
      setInitialUnprunedCount(unpruned)
      setLastFinishedPlantIndex(null)
      setPrunedPlantIds(resumeFrom.prunedPlantIds)
      setCampania(resumeFrom.campania)
      if (resumeFrom.podaTaskId) setPodaTaskId(resumeFrom.podaTaskId)
      // Restore ya_podada flags for pruned plants
      resumeFrom.prunedPlantIds.forEach((id) => {
        const plant = row.plants.find((p) => p.plant_id === id)
        if (plant) plant.ya_podada = true
      })
    } else {
      setCurrentRowIndex(rowIndex)
      setCurrentPlantIndex(0)
      setDirection("forward")
      setCompletedRowIds(new Set())
      setPrunedCount(0)
      setSkippedCount(0)
      setInitialUnprunedCount(unpruned)
      setLastFinishedPlantIndex(null)
      setPrunedPlantIds([])
    }

    // Phase 4: Fire-and-forget task creation
    try {
      const userId = localStorage.getItem("userId")
      if (userId) {
        api.post("/tasks/createTask", {
          descripcion: `Poda — Campaña ${campania}`,
          plot_id: selectedPlot?.id,
          asignado_a_ids: [parseInt(userId)],
          estado: "en_progreso",
        }).then((res) => {
          setPodaTaskId(res.data.id)
        }).catch(() => {
          // Silent failure — pruning must not be blocked
        })
      }
    } catch {
      // Silent failure
    }

    setPhase("pruning")
  }

  // Get current row and current plant
  const currentRow = rows[currentRowIndex]
  const currentPlants = currentRow?.plants ?? []
  const orderedPlants =
    direction === "backward" ? [...currentPlants].reverse() : currentPlants

  // Phase 2: Save session on every state change (after prune, skip, row transition)
  useEffect(() => {
    if (phase !== "pruning" || !selectedPlot || !currentRow) return
    const state: PruningSessionState = {
      plotId: selectedPlot.id,
      rowId: currentRow.row_id,
      direction,
      currentPlantIndex,
      prunedPlantIds,
      startedAt: savedSession?.startedAt ?? new Date().toISOString(),
      campania,
      lastUpdatedAt: new Date().toISOString(),
      podaTaskId,
    }
    saveSession(selectedPlot.id, state)
  }, [phase, selectedPlot, currentRow, direction, currentPlantIndex, prunedPlantIds, campania, savedSession, podaTaskId])

  // Skip already pruned plants
  // Use both prunedPlantIds (this session) and ya_podada (previous sessions)
  const getNextUnprunedIndex = (startIndex: number) => {
    for (let i = startIndex; i < orderedPlants.length; i++) {
      const plant = orderedPlants[i]
      const podadaEnSesion = prunedPlantIds.includes(plant.plant_id)
      if (!podadaEnSesion && !plant.ya_podada) return i
    }
    return -1 // all remaining are pruned
  }

  // Handle save and next
  const handleSave = async () => {
    if (!formData.tipo_poda || !formData.intensidad || !formData.fecha) {
      return
    }

    const plant = orderedPlants[currentPlantIndex]
    setSaving(true)
    setError(null)

    try {
      await api.post("/plant-prunings/create", {
        plant_id: plant.plant_id,
        tipo_poda: formData.tipo_poda,
        intensidad: formData.intensidad,
        fecha: formData.fecha,
        observaciones: formData.observaciones || null,
      })

      setPrunedCount((c) => c + 1)
      setPrunedPlantIds((prev) => [...prev, plant.plant_id])
      plant.ya_podada = true

      // Find next unpruned plant
      const nextIdx = getNextUnprunedIndex(currentPlantIndex + 1)

      if (nextIdx === -1) {
        // Row complete — track the physical position where we finished
        const originalIndex = direction === "backward"
          ? currentPlants.length - 1 - currentPlantIndex
          : currentPlantIndex
        setLastFinishedPlantIndex(originalIndex)

        // Compute completed set with current row added
        const newCompleted = new Set([...completedRowIds, currentRow.row_id])
        setCompletedRowIds(newCompleted)

        // Check adjacent rows for auto-advance
        const currentRowNum = currentRow.row_numero
        const prevRow = rows.find(
          (r) => r.row_numero === currentRowNum - 1 && !newCompleted.has(r.row_id)
        )
        const nextRow = rows.find(
          (r) => r.row_numero === currentRowNum + 1 && !newCompleted.has(r.row_id)
        )
        const availableAdjacent = []
        if (prevRow) {
          availableAdjacent.push({ row: prevRow, direction: "backward" as const })
        }
        if (nextRow) {
          availableAdjacent.push({ row: nextRow, direction: "forward" as const })
        }

        if (availableAdjacent.length === 1) {
          // Auto-advance to the only available adjacent row
          const target = availableAdjacent[0]
          const targetRowIdx = rows.findIndex((r) => r.row_id === target.row.row_id)
          continueToRow(targetRowIdx, target.direction, originalIndex)
        } else {
          setPhase("row-complete")
        }
      } else {
        setCurrentPlantIndex(nextIdx)
        setFormData({
          tipo_poda: "",
          intensidad: "",
          fecha: formData.fecha,
          observaciones: "",
        })
      }
    } catch {
      setError("Error al registrar la poda. Intentá de nuevo.")
    } finally {
      setSaving(false)
    }
  }

  // Skip current plant (already pruned or user skips)
  const handleSkip = () => {
    setSkippedCount((c) => c + 1)
    const nextIdx = getNextUnprunedIndex(currentPlantIndex + 1)
    if (nextIdx === -1) {
      // Row complete — track the physical position where we finished
      const originalIndex = direction === "backward"
        ? currentPlants.length - 1 - currentPlantIndex
        : currentPlantIndex
      setLastFinishedPlantIndex(originalIndex)

      // Compute completed set with current row added
      const newCompleted = new Set([...completedRowIds, currentRow.row_id])
      setCompletedRowIds(newCompleted)

      // Check adjacent rows for auto-advance
      const currentRowNum = currentRow.row_numero
      const prevRow = rows.find(
        (r) => r.row_numero === currentRowNum - 1 && !newCompleted.has(r.row_id)
      )
      const nextRow = rows.find(
        (r) => r.row_numero === currentRowNum + 1 && !newCompleted.has(r.row_id)
      )
      const availableAdjacent = []
      if (prevRow) {
        availableAdjacent.push({ row: prevRow, direction: "backward" as const })
      }
      if (nextRow) {
        availableAdjacent.push({ row: nextRow, direction: "forward" as const })
      }

      if (availableAdjacent.length === 1) {
        const target = availableAdjacent[0]
        const targetRowIdx = rows.findIndex((r) => r.row_id === target.row.row_id)
        continueToRow(targetRowIdx, target.direction, originalIndex)
      } else {
        setPhase("row-complete")
      }
    } else {
      setCurrentPlantIndex(nextIdx)
    }
  }

  // Continue to adjacent row
  const continueToRow = async (newRowIndex: number, newDirection: "forward" | "backward", finishedIdx?: number | null) => {
    const row = rows[newRowIndex]
    const effectiveFinishedIdx = finishedIdx ?? lastFinishedPlantIndex

    // Reload fresh data from backend to get accurate ya_podada status
    setLoading(true)
    try {
      const res = await api.get("/plant-prunings/getPlantsForPruning", {
        params: { plot_id: selectedPlot?.id, campania },
      })
      setRows(res.data.rows)
      const freshRow = res.data.rows.find((r: Row) => r.row_id === row.row_id)
      if (!freshRow) {
        setError("No se pudo recargar la fila.")
        setPhase("row-complete")
        return
      }

      const unpruned = freshRow.plants.filter((p: Plant) => !p.ya_podada).length

      // If all plants are already pruned, skip this row
      if (unpruned === 0) {
        const newCompleted = new Set([...completedRowIds, freshRow.row_id])
        setCompletedRowIds(newCompleted)
        setError(`Fila ${freshRow.row_numero}: todas las plantas ya están podadas en esta campaña.`)
        setPhase("row-complete")
        return
      }

      // Find starting plant based on where we finished the previous row
      let startIdx = 0
      if (effectiveFinishedIdx !== null && effectiveFinishedIdx >= 0) {
        const targetIdx = Math.min(effectiveFinishedIdx, freshRow.plants.length - 1)

        let bestIdx = -1
        let bestDist = Infinity
        for (let i = 0; i < freshRow.plants.length; i++) {
          if (!freshRow.plants[i].ya_podada) {
            const dist = Math.abs(i - targetIdx)
            if (dist < bestDist) {
              bestDist = dist
              bestIdx = i
            }
          }
        }

        if (bestIdx !== -1) {
          startIdx = newDirection === "backward"
            ? freshRow.plants.length - 1 - bestIdx
            : bestIdx
        } else {
          startIdx = newDirection === "backward"
            ? freshRow.plants.length - 1
            : 0
        }
      } else {
        startIdx = newDirection === "backward"
          ? freshRow.plants.length - 1
          : 0
      }

      const newRowIdx = res.data.rows.findIndex((r: Row) => r.row_id === freshRow.row_id)
      setCurrentRowIndex(newRowIdx)
      setCurrentPlantIndex(startIdx)
      setDirection(newDirection)
      setPrunedCount(0)
      setSkippedCount(0)
      setInitialUnprunedCount(unpruned)
      setFormData({
        tipo_poda: "",
        intensidad: "",
        fecha: formData.fecha,
        observaciones: "",
      })
      setPhase("pruning")
    } catch {
      setError("Error al recargar datos de la fila.")
      setPhase("row-complete")
    } finally {
      setLoading(false)
    }
  }

  // Get adjacent row suggestions
  const getAdjacentRows = () => {
    const suggestions: { row: Row; direction: "forward" | "backward"; label: string }[] = []
    const currentRowNum = currentRow.row_numero

    // Previous row (lower number)
    const prevRow = rows.find(
      (r) => r.row_numero === currentRowNum - 1 && !completedRowIds.has(r.row_id)
    )
    if (prevRow) {
      suggestions.push({ row: prevRow, direction: "backward", label: `Fila ${prevRow.row_numero} (atrás)` })
    }

    // Next row (higher number)
    const nextRow = rows.find(
      (r) => r.row_numero === currentRowNum + 1 && !completedRowIds.has(r.row_id)
    )
    if (nextRow) {
      suggestions.push({ row: nextRow, direction: "forward", label: `Fila ${nextRow.row_numero} (adelante)` })
    }

    return suggestions
  }

  // Check if all rows are done
  const remainingRows = rows.filter((r) => !completedRowIds.has(r.row_id))

  // ---- RENDER ----

  // Phase: Select Plot
  if (phase === "select-plot") {
    return (
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Podas ✂️</h1>
          <p className="text-slate-400 mt-1">Seleccioná una parcela para comenzar la poda</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4">
            {error}
          </div>
        )}

        {/* Phase 2: Resume prompt */}
        {showResumePrompt && savedSession && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-emerald-400 mb-2">Sesión anterior encontrada</h2>
            <p className="text-slate-300 mb-4">
              Tenés una sesión de poda en progreso para la parcela. ¿Querés continuar?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowResumePrompt(false)
                  // Find the row index from saved session
                  const rowIndex = rows.findIndex((r) => r.row_id === savedSession.rowId)
                  if (rowIndex >= 0) {
                    startPruning(rowIndex, savedSession)
                  } else {
                    // Row not found — start fresh
                    clearSession(savedSession.plotId)
                    setShowResumePrompt(false)
                    setSavedSession(null)
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold px-6 py-2.5 rounded-xl"
              >
                Reanudar
              </button>
              <button
                onClick={() => {
                  clearSession(savedSession.plotId)
                  setShowResumePrompt(false)
                  setSavedSession(null)
                }}
                className="bg-slate-700 hover:bg-slate-600 transition text-slate-300 font-medium px-6 py-2.5 rounded-xl"
              >
                Nueva sesión
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plots.map((plot) => (
            <button
              key={plot.id}
              onClick={() => {
                setSelectedPlot(plot)
                loadRows(plot.id)
              }}
              className="bg-slate-800 hover:bg-slate-700 transition rounded-2xl p-6 text-left border border-slate-700 hover:border-emerald-500/50"
            >
              <p className="text-lg font-semibold text-white">{plot.nombre}</p>
              {plot.area_m2 && (
                <p className="text-sm text-slate-400 mt-1">{plot.area_m2} m²</p>
              )}
            </button>
          ))}
        </div>

        {plots.length === 0 && (
          <div className="bg-slate-800 rounded-2xl p-12 text-center">
            <p className="text-4xl mb-3">🗺️</p>
            <p className="text-slate-400">No hay parcelas registradas.</p>
          </div>
        )}
      </div>
    )
  }

  // Phase: Select Row
  if (phase === "select-row") {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setPhase("select-plot")
                setSelectedPlot(null)
                setShowResumePrompt(false)
                setSavedSession(null)
              }}
              className="text-slate-400 hover:text-white transition"
            >
              ← Volver
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">Podas — Campaña {campania} ✂️</h1>
              <p className="text-slate-400 mt-1">
                Parcela: <span className="text-emerald-400 font-medium">{selectedPlot?.nombre}</span> · Elegí la fila de inicio
              </p>
            </div>
          </div>

          {/* Phase 3: Campaign selector */}
          <select
            value={campania}
            onChange={(e) => {
              const newCampania = parseInt(e.target.value, 10)
              setCampania(newCampania)
              if (selectedPlot) loadRows(selectedPlot.id, newCampania)
            }}
            className="bg-slate-700 text-white rounded-lg px-3 py-2 outline-none border border-slate-600 focus:border-emerald-500"
          >
            {campaniaOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-slate-800 rounded-2xl p-5 animate-pulse h-16" />
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map((row, idx) => {
              const unpruned = row.plants.filter((p) => !p.ya_podada).length
              const total = row.plants.length
              return (
                <button
                  key={row.row_id}
                  onClick={() => startPruning(idx)}
                  className="bg-slate-800 hover:bg-slate-700 transition rounded-2xl p-6 text-left border border-slate-700 hover:border-emerald-500/50"
                >
                  <p className="text-lg font-semibold text-white">Fila {row.row_numero}</p>
                  <p className="text-sm text-slate-400 mt-1">
                    {total} planta{total !== 1 ? "s" : ""} · {unpruned} sin podar
                  </p>
                  {unpruned === 0 && (
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full mt-2 inline-block">
                      Todas podadas
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Phase: Row Complete
  if (phase === "row-complete") {
    const adjacentRows = getAdjacentRows()
    const allDone = remainingRows.length === 0

    return (
      <div className="p-8 space-y-6">
        <div className="bg-slate-800 rounded-2xl p-8 text-center">
          <p className="text-5xl mb-4">✅</p>
          <h2 className="text-2xl font-bold text-white mb-2">
            Fila {currentRow.row_numero} completada
          </h2>
          <p className="text-slate-400">
            {prunedCount} planta{prunedCount !== 1 ? "s" : ""} podada{prunedCount !== 1 ? "s" : ""}
            {skippedCount > 0 && ` · ${skippedCount} saltada${skippedCount !== 1 ? "s" : ""}`}
          </p>
        </div>

        {allDone ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-8 text-center">
            <p className="text-4xl mb-3">🎉</p>
            <h2 className="text-2xl font-bold text-emerald-400 mb-2">¡Poda completada!</h2>
            <p className="text-slate-400">
              Todas las filas de <span className="text-white font-medium">{currentRow.parcela_nombre}</span> fueron podadas.
            </p>
            <button
              onClick={() => {
                // Phase 2: Clear session on completion
                if (selectedPlot) clearSession(selectedPlot.id)
                // Phase 4: Fire-and-forget task completion
                if (podaTaskId) {
                  api.patch(`/tasks/updateTask/${podaTaskId}`, { estado: "completada" }).catch(() => {})
                }
                setPhase("select-plot")
                setPrunedCount(0)
                setSkippedCount(0)
                setCompletedRowIds(new Set())
                setPodaTaskId(null)
              }}
              className="mt-6 bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold px-6 py-3 rounded-xl"
            >
              Podar otra parcela
            </button>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">¿Con qué fila querés continuar?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {adjacentRows.map((suggestion) => (
                <button
                  key={suggestion.row.row_id}
                  onClick={() =>
                    continueToRow(
                      rows.findIndex((r) => r.row_id === suggestion.row.row_id),
                      suggestion.direction
                    )
                  }
                  className="bg-slate-700 hover:bg-slate-600 transition rounded-xl p-5 text-left border border-slate-600 hover:border-emerald-500/50"
                >
                  <p className="text-lg font-semibold text-white">{suggestion.label}</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Dirección: {suggestion.direction === "forward" ? "→ (de inicio a fin)" : "← (de fin a inicio)"}
                  </p>
                </button>
              ))}
            </div>
            {adjacentRows.length === 0 && (
              <p className="text-slate-400 text-center py-4">
                No hay filas adyacentes disponibles. Volvé a seleccionar fila.
              </p>
            )}
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setPhase("select-row")}
                className="text-slate-400 hover:text-white transition text-sm"
              >
                ← Elegir otra fila manualmente
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Phase: Active Pruning
  if (phase === "pruning" && currentRow) {
    const plant = orderedPlants[currentPlantIndex]
    const progressPct = initialUnprunedCount > 0 ? (prunedCount / initialUnprunedCount) * 100 : 0

    return (
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Podas — Campaña {campania} ✂️</h1>
            <p className="text-slate-400 mt-1">
              {currentRow.parcela_nombre} · Fila {currentRow.row_numero} ·{" "}
              {direction === "forward" ? "→ Avance" : "← Retroceso"}
            </p>
          </div>
          <button
            onClick={() => {
              // Phase 2: Clear session on exit
              if (selectedPlot) clearSession(selectedPlot.id)
              setPhase("select-row")
            }}
            className="text-slate-400 hover:text-white transition text-sm"
          >
            Salir
          </button>
        </div>

        {/* Progress bar */}
        <div className="bg-slate-800 rounded-2xl p-4">
          <div className="flex justify-between text-sm text-slate-400 mb-2">
            <span>Planta {prunedCount + 1} de {initialUnprunedCount}</span>
            <span>Fila {currentRow.row_numero}</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(progressPct, 100)}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4">
            {error}
          </div>
        )}

        {/* Plant info */}
        <div className="bg-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center text-2xl">
              🌿
            </div>
            <div>
              <p className="text-lg font-semibold text-white">
                Planta {direction === "backward" ? orderedPlants.length - currentPlantIndex : currentPlantIndex + 1}
              </p>
              <p className="text-sm text-slate-400">
                {plant.varietal_nombre} ({plant.varietal_tipo})
                {plant.codigo && ` · ${plant.codigo}`}
              </p>
            </div>
          </div>

          {/* Pruning form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Tipo de poda *</label>
              <select
                value={formData.tipo_poda}
                onChange={(e) => setFormData({ ...formData, tipo_poda: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none border border-slate-600 focus:border-emerald-500"
              >
                <option value="">Seleccionar...</option>
                <option value="formacion">Formación</option>
                <option value="mantenimiento">Mantenimiento</option>
                <option value="produccion">Producción</option>
                <option value="sanitaria">Sanitaria</option>
                <option value="renovacion">Renovación</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-1 block">Intensidad *</label>
              <select
                value={formData.intensidad}
                onChange={(e) => setFormData({ ...formData, intensidad: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none border border-slate-600 focus:border-emerald-500"
              >
                <option value="">Seleccionar...</option>
                <option value="corta">Corta</option>
                <option value="mixta">Mixta</option>
                <option value="larga">Larga</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-1 block">Fecha *</label>
              <input
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none border border-slate-600 focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm text-slate-400 mb-1 block">Observaciones</label>
              <textarea
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                placeholder="Notas opcionales..."
                rows={2}
                className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none border border-slate-600 focus:border-emerald-500 resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              disabled={saving || !formData.tipo_poda || !formData.intensidad || !formData.fecha}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-white font-semibold py-3 rounded-xl"
            >
              {saving ? "Guardando..." : "Guardar y siguiente →"}
            </button>
            <button
              onClick={handleSkip}
              className="px-6 bg-slate-700 hover:bg-slate-600 transition text-slate-300 font-medium py-3 rounded-xl"
            >
              Saltar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
