import { useEffect, useState } from "react"
import { api } from "../services/api"
import { useNavigate, useParams } from "react-router-dom"
import { varietalColor, varietalBadgeColor } from "../constants/varietalColors"
import { getPlantsForRow, getAlignment, getTerrazasStagger, type FormaParcela } from "../lib/plot-grid-utils"

type Plant = {
  id: number
  varietal_id: number | null
  varietal_nombre: string | null
  varietal_tipo: string | null
  row_numero: number
  vine_row_id: number
  posicion_en_fila: number | null
  latitud: number | null
  tutor: boolean
}

type VineRow = {
  id: number
  numero: number
  plant_count: number
}

type PlotInfo = {
  forma_parcela: string | null
  terreno: string | null
}

export default function PlotMap() {
  const { plotId } = useParams()
  const navigate = useNavigate()

  const [rows, setRows] = useState<VineRow[]>([])
  const [plants, setPlants] = useState<Plant[]>([])
  const [plotInfo, setPlotInfo] = useState<PlotInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCell, setSelectedCell] = useState<{ rowNumero: number; cellIdx: number } | null>(null)
  const [showSinTutor, setShowSinTutor] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get(`/vine-rows/getVineRows?plot_id=${plotId}`),
      api.get(`/plants/getPlants?plot_id=${plotId}`),
      api.get(`/plots/getPlot/${plotId}`),
    ])
      .then(([rowsRes, plantsRes, plotRes]) => {
        setRows(rowsRes.data)
        setPlants(plantsRes.data)
        setPlotInfo({ forma_parcela: plotRes.data.forma_parcela, terreno: plotRes.data.terreno })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [plotId])

  const getPlantForCell = (rowNumero: number, cellIdx: number) => {
    const row = rows.find(r => r.numero === rowNumero)
    if (!row) return undefined
    const rowPlants = getPlantsForRow(plants, row.id)
    return rowPlants[cellIdx]
  }

  const totalPlants = rows.reduce((sum, r) => sum + r.plant_count, 0)
  const plantedCount = plants.length
  const progress = totalPlants > 0 ? Math.round((plantedCount / totalPlants) * 100) : 0

  const formaParcela = (plotInfo?.forma_parcela || 'rectangular') as FormaParcela

  if (loading) return <div className="w-full p-6 text-slate-300 text-center">Cargando...</div>

  if (rows.length === 0) {
    return (
      <div className="w-full p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Mapa de Plantación 🗺️</h1>
          <p className="text-slate-400 text-sm">Parcela #{plotId}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-12 text-center">
          <p className="text-slate-400">No hay filas creadas aún.</p>
          <button
            onClick={() => navigate(`/plots/${plotId}/rows`)}
            className="mt-4 text-emerald-400 hover:text-emerald-300 text-sm transition"
          >
            Crear filas →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mapa de Plantación 🗺️</h1>
          <p className="text-slate-400 text-sm">
            Parcela #{plotId} — {rows.length} filas · {plantedCount} plantas cargadas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-slate-500">Progreso</p>
            <p className="text-lg font-bold text-emerald-400">{progress}%</p>
          </div>
          <div className="w-32 bg-slate-700 rounded-full h-2">
            <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="flex gap-3 text-xs flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-violet-700 border border-violet-600" /> Tinta</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-lime-500 border border-lime-400" /> Blanca</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-rose-400 border border-rose-300" /> Rosada</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-slate-700 border border-slate-600" /> Sin planta</span>
        <button
          onClick={() => setShowSinTutor(!showSinTutor)}
          className={`px-2 py-0.5 rounded text-xs font-medium transition ${
            showSinTutor
              ? "bg-orange-600/30 text-orange-400 border border-orange-500/50"
              : "bg-slate-700 text-slate-400 border border-slate-600"
          }`}
        >
          {showSinTutor ? "Ocultar sin tutor" : "Mostrar sin tutor"}
        </button>
      </div>

      <div className="bg-slate-800 rounded-xl p-4 overflow-auto">
        <div className="space-y-1 min-w-fit">
          {rows.map(row => {
            const rowPlants = getPlantsForRow(plants, row.id)
            const align = getAlignment(formaParcela)
            const marginLeft = formaParcela === 'terrazas' ? getTerrazasStagger(row.numero) : 0
            return (
              <div key={row.id} className="flex items-center gap-1">
                <span className="text-xs text-slate-500 w-10 text-right mr-2 shrink-0">F{row.numero}</span>
                <div className="flex gap-0.5" style={{ justifyContent: align.justifyContent, marginLeft }}>
                  {rowPlants.map((plant, idx) => {
                    const isSelected = selectedCell?.rowNumero === row.numero && selectedCell?.cellIdx === idx
                    const isSinPlanta = plant && plant.varietal_id === null
                    const isSinTutor = showSinTutor && plant && plant.tutor === false

                    return (
                      <button
                        key={plant.id}
                        onClick={() => setSelectedCell({ rowNumero: row.numero, cellIdx: idx })}
                        title={plant ? (isSinPlanta ? `Sin planta (F${row.numero}, Pos ${plant.posicion_en_fila ?? idx + 1})` : `${plant.varietal_nombre} (F${row.numero}, Pos ${plant.posicion_en_fila ?? idx + 1})`) : `F${row.numero} #${idx + 1} — vacía`}
                        className={`w-5 h-5 rounded-sm border transition-all shrink-0 ${
                          isSinPlanta
                            ? "bg-slate-700 border-slate-600 hover:opacity-80"
                            : plant
                              ? `${plant.varietal_tipo ? varietalColor[plant.varietal_tipo] : "bg-slate-600 border-slate-500"} hover:opacity-80`
                              : "bg-slate-700 border-slate-600 opacity-30"
                        } ${isSinTutor ? "border-orange-400" : ""} ${isSelected ? "ring-2 ring-white scale-125 z-10" : ""}`}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {selectedCell && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setSelectedCell(null)}>
          <div className="bg-slate-800 rounded-xl p-6 max-w-sm w-full mx-4 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white">
              Fila {selectedCell.rowNumero} — Posición {selectedCell.cellIdx + 1}
            </h3>
            {(() => {
              const plant = getPlantForCell(selectedCell.rowNumero, selectedCell.cellIdx)
              if (!plant) return <p className="text-slate-400 text-sm">Sin planta asignada</p>
              if (plant.varietal_id === null) {
                return (
                  <div className="space-y-2">
                    <p className="text-slate-300 text-sm font-medium">Esta celda no tiene planta registrada</p>
                    <button
                      onClick={() => {
                        setSelectedCell(null)
                        navigate(`/plots/${plotId}/rows`)
                      }}
                      className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-medium transition"
                    >
                      Ir a crear plantas
                    </button>
                  </div>
                )
              }
              return (
                <div className="space-y-2">
                  <p className="text-white">
                    <span className="text-slate-400">Varietal:</span> {plant.varietal_nombre}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                    plant.varietal_tipo ? varietalBadgeColor[plant.varietal_tipo] : "bg-slate-600/30 text-slate-400"
                  }`}>
                    {plant.varietal_tipo}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedCell(null)
                      navigate(`/plants/${plant.id}`)
                    }}
                    className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-medium transition"
                  >
                    Ver historial y estado
                  </button>
                </div>
              )
            })()}
            <button
              onClick={() => setSelectedCell(null)}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-medium transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
