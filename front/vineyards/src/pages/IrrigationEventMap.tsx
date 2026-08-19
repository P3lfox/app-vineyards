import { useEffect, useState } from "react"
import { api } from "../services/api"
import { useNavigate, useParams } from "react-router-dom"
import { varietalColor } from "../constants/varietalColors"
import { getPlantsForRow, getAlignment, getTerrazasStagger, type FormaParcela } from "../lib/plot-grid-utils"

type Plant = {
  id: number
  varietal_nombre: string
  varietal_tipo: string
  row_numero: number
  vine_row_id: number
  posicion_en_fila: number | null
  latitud: number | null
}

type VineRow = {
  id: number
  numero: number
  plant_count: number
}

type CoverageRecord = {
  id: number
  irrigation_event_id: number
  vine_row_id: number
  cobertura: "completa" | "parcial" | "irregular" | "ninguna"
}

type ImpactRecord = {
  id: number
  irrigation_event_id: number
  plant_id: number
  llegada_agua: "nada" | "poco" | "media" | "mucha"
  hubo_cortes: boolean
  observaciones: string | null
}

type IrrigationEvent = {
  id: number
  plot_id: number
  plot_nombre: string
  sistema_tipo: string | null
  fecha: string
  estado: string
  coverage: CoverageRecord[]
  impact: ImpactRecord[]
}

export default function IrrigationEventMap() {
  const { eventId } = useParams()
  const navigate = useNavigate()

  const [event, setEvent] = useState<IrrigationEvent | null>(null)
  const [rows, setRows] = useState<VineRow[]>([])
  const [plants, setPlants] = useState<Plant[]>([])
  const [formaParcela, setFormaParcela] = useState<FormaParcela>('rectangular')
  const [loading, setLoading] = useState(true)
  const [wateredPlants, setWateredPlants] = useState<Map<number, "nada" | "poco" | "media" | "mucha">>(() => {
    // Restore from localStorage if available
    try {
      const saved = localStorage.getItem(`irrigation-event-${eventId}-watered`)
      if (saved) {
        const parsed = JSON.parse(saved) as [number, string][]
        return new Map(parsed.map(([id, level]) => [id, level as "nada" | "poco" | "media" | "mucha"]))
      }
    } catch {}
    return new Map()
  })
  const [saving, setSaving] = useState(false)
  const [showImpactModal, setShowImpactModal] = useState(false)
  const [selectedPlantForImpact, setSelectedPlantForImpact] = useState<Plant | null>(null)
  const [impactForm, setImpactForm] = useState<{ llegada_agua: "nada" | "poco" | "media" | "mucha"; hubo_cortes: boolean; observaciones: string }>({ llegada_agua: "mucha", hubo_cortes: false, observaciones: "" })

  useEffect(() => {
    if (!eventId) return
    api.get(`/irrigation-events/getIrrigationEvent/${eventId}`)
      .then(res => {
        setEvent(res.data)
        return api.get(`/plots/getPlot/${res.data.plot_id}`)
      })
      .then(plotRes => {
        setFormaParcela((plotRes.data.forma_parcela || 'rectangular') as FormaParcela)
        return Promise.all([
          api.get(`/vine-rows/getVineRows?plot_id=${plotRes.data.id}`),
          api.get(`/plants/getPlants?plot_id=${plotRes.data.id}`),
        ])
      })
      .then(([rowsRes, plantsRes]) => {
        setRows(rowsRes.data)
        setPlants(plantsRes.data)

        // Pre-populate from existing impact records (resume in_progress event)
        if (event?.impact && event.impact.length > 0) {
          const map = new Map<number, "nada" | "poco" | "media" | "mucha">()
          for (const imp of event.impact) {
            if (imp.llegada_agua !== "nada") {
              map.set(imp.plant_id, imp.llegada_agua)
            }
          }
          // Merge with localStorage data (prefer localStorage for unsaved changes)
          setWateredPlants(prev => {
            const merged = new Map(map)
            for (const [id, level] of prev) {
              merged.set(id, level)
            }
            return merged
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [eventId])

  // Persist wateredPlants to localStorage on every change
  useEffect(() => {
    if (!eventId) return
    const arr = Array.from(wateredPlants.entries())
    if (arr.length === 0) {
      localStorage.removeItem(`irrigation-event-${eventId}-watered`)
    } else {
      localStorage.setItem(`irrigation-event-${eventId}-watered`, JSON.stringify(arr))
    }
  }, [wateredPlants, eventId])

  const togglePlant = (plant: Plant) => {
    if (wateredPlants.has(plant.id)) {
      setWateredPlants(prev => {
        const next = new Map(prev)
        next.delete(plant.id)
        return next
      })
    } else {
      setWateredPlants(prev => new Map(prev).set(plant.id, "mucha"))
    }
  }

  const openImpactModal = (plant: Plant) => {
    setSelectedPlantForImpact(plant)
    const existing = wateredPlants.get(plant.id)
    setImpactForm({
      llegada_agua: existing || "mucha",
      hubo_cortes: false,
      observaciones: "",
    })
    setShowImpactModal(true)
  }

  const saveImpact = () => {
    if (!selectedPlantForImpact) return
    setWateredPlants(prev => {
      const next = new Map(prev)
      if (impactForm.llegada_agua === "nada") {
        next.delete(selectedPlantForImpact.id)
      } else {
        next.set(selectedPlantForImpact.id, impactForm.llegada_agua)
      }
      return next
    })
    setShowImpactModal(false)
    setSelectedPlantForImpact(null)
  }

  const getRowCoverage = (rowNumero: number) => {
    const row = rows.find(r => r.numero === rowNumero)
    if (!row) return "ninguna"
    const rowPlants = getPlantsForRow(plants, row.id)
    if (rowPlants.length === 0) return "ninguna"
    const wateredCount = rowPlants.filter(p => wateredPlants.has(p.id)).length
    if (wateredCount === 0) return "ninguna"
    if (wateredCount === rowPlants.length) return "completa"
    return "parcial"
  }

  const handleFinish = async () => {
    if (!event) return
    setSaving(true)
    try {
      const coverage = rows.map(row => ({
        vine_row_id: row.id,
        cobertura: getRowCoverage(row.numero),
      }))

      const impact = plants.map(plant => ({
        plant_id: plant.id,
        llegada_agua: wateredPlants.get(plant.id) || "nada",
        hubo_cortes: false,
        observaciones: null,
      }))

      await api.put(`/irrigation-events/finishEvent/${eventId}`, { coverage, impact })
      // Clean up localStorage after successful save
      localStorage.removeItem(`irrigation-event-${eventId}-watered`)
      navigate("/irrigation-events")
    } catch (err: any) {
      alert(err.response?.data?.message || "Error al finalizar evento")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="w-full p-6 text-slate-300 text-center">Cargando...</div>

  if (!event || rows.length === 0) {
    return (
      <div className="w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Mapa de Riego 💧</h1>
          <button onClick={() => navigate("/irrigation-events")} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">← Volver</button>
        </div>
        <div className="bg-slate-800 rounded-xl p-12 text-center">
          <p className="text-slate-400">No hay filas o evento no encontrado.</p>
        </div>
      </div>
    )
  }

  const wateredCount = wateredPlants.size
  const totalCount = plants.length
  const progress = totalCount > 0 ? Math.round((wateredCount / totalCount) * 100) : 0
  const isResume = event.estado === "in_progress" && (event.coverage?.length > 0 || event.impact?.length > 0)

  const llegadaColor: Record<string, string> = {
    mucha: "bg-cyan-500 border-cyan-400",
    media: "bg-blue-500 border-blue-400",
    poco: "bg-yellow-500 border-yellow-400",
  }

  return (
    <div className="w-full p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mapa de Riego 💧</h1>
          <p className="text-slate-400 text-sm">
            {isResume ? "Reanudando evento" : "Nuevo evento"} — {event.plot_nombre} {event.sistema_tipo ? `(${event.sistema_tipo})` : ""}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-slate-500">Regadas</p>
            <p className="text-lg font-bold text-cyan-400">{wateredCount}/{totalCount} ({progress}%)</p>
          </div>
          <div className="w-32 bg-slate-700 rounded-full h-2">
            <div className="bg-cyan-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <button onClick={() => navigate("/irrigation-events")} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">← Volver</button>
        </div>
      </div>

      <div className="flex gap-3 text-xs flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-cyan-500 border border-cyan-400" /> Mucha agua</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-500 border border-blue-400" /> Media agua</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-yellow-500 border border-yellow-400" /> Poca agua</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-violet-700 border border-violet-600" /> Tinta</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-lime-500 border border-lime-400" /> Blanca</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-rose-400 border border-rose-300" /> Rosada</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-slate-700 border border-slate-600" /> Sin planta</span>
      </div>

      <div className="bg-slate-800 rounded-xl p-4 overflow-auto">
        <div className="space-y-1 min-w-fit">
          {rows.map(row => {
            const rowPlants = getPlantsForRow(plants, row.id)
            const coverage = getRowCoverage(row.numero)
            const coverageColor = coverage === "completa" ? "text-emerald-400" : coverage === "parcial" ? "text-yellow-400" : "text-slate-500"
            const align = getAlignment(formaParcela)
            const marginLeft = formaParcela === 'terrazas' ? getTerrazasStagger(row.numero) : 0
            return (
              <div key={row.id} className="flex items-center gap-1">
                <span className={`text-xs w-20 text-right mr-2 shrink-0 ${coverageColor}`}>
                  F{row.numero} ({coverage})
                </span>
                <div className="flex gap-0.5" style={{ justifyContent: align.justifyContent, marginLeft }}>
                  {rowPlants.map((plant, idx) => {
                    const wateredLevel = wateredPlants.get(plant.id) || null
                    const isWatered = !!wateredLevel

                    return (
                      <button
                        key={plant.id}
                        onClick={() => isWatered ? openImpactModal(plant) : togglePlant(plant)}
                        title={`${plant.varietal_nombre} (F${row.numero}, Pos ${plant.posicion_en_fila ?? idx + 1})${isWatered ? ` — ${wateredLevel}` : ""}`}
                        className={`w-5 h-5 rounded-sm border transition-all shrink-0 ${
                          isWatered
                            ? `${llegadaColor[wateredLevel] || llegadaColor.mucha} hover:opacity-80`
                            : `${varietalColor[plant.varietal_tipo] || "bg-slate-600 border-slate-500"} hover:opacity-80`
                        }`}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-xs text-slate-500">
          Click en planta para marcar como regada. Click en planta ya regada para editar nivel de agua.
        </p>
        <button
          onClick={handleFinish}
          disabled={saving || wateredCount === 0}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg text-sm font-semibold transition"
        >
          {saving ? "Guardando..." : `Finalizar evento (${wateredCount} regadas)`}
        </button>
      </div>

      {/* Impact detail modal */}
      {showImpactModal && selectedPlantForImpact && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowImpactModal(false)}>
          <div className="bg-slate-800 rounded-xl max-w-sm w-full mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white">
              {selectedPlantForImpact.varietal_nombre}
            </h3>
            <p className="text-slate-400 text-sm">
              Fila {selectedPlantForImpact.row_numero} — Planta #{selectedPlantForImpact.id}
            </p>

            <div className="space-y-2">
              <label className="text-sm text-slate-300">Llegada de agua</label>
              <div className="grid grid-cols-4 gap-2">
                {(["nada", "poco", "media", "mucha"] as const).map(level => (
                  <button
                    key={level}
                    onClick={() => setImpactForm({ ...impactForm, llegada_agua: level })}
                    className={`py-2 rounded-lg text-xs font-medium capitalize transition ${
                      impactForm.llegada_agua === level
                        ? level === "nada" ? "bg-red-600 text-white"
                          : level === "poco" ? "bg-yellow-600 text-white"
                          : level === "media" ? "bg-blue-600 text-white"
                          : "bg-cyan-600 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hubo_cortes"
                checked={impactForm.hubo_cortes}
                onChange={e => setImpactForm({ ...impactForm, hubo_cortes: e.target.checked })}
                className="rounded bg-slate-700 border-slate-600"
              />
              <label htmlFor="hubo_cortes" className="text-sm text-slate-300">Hubo cortes de agua</label>
            </div>

            <textarea
              placeholder="Observaciones"
              value={impactForm.observaciones}
              onChange={e => setImpactForm({ ...impactForm, observaciones: e.target.value })}
              rows={2}
              className="w-full p-2 rounded-lg bg-slate-700 text-white outline-none text-sm resize-none placeholder:text-slate-500"
            />

            <div className="flex gap-2">
              <button onClick={saveImpact} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-medium transition">
                Guardar
              </button>
              <button onClick={() => setShowImpactModal(false)} className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
