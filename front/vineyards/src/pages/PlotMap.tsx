import { useEffect, useState } from "react"
import { api } from "../services/api"
import { useNavigate, useParams } from "react-router-dom"
import { varietalColor, varietalBadgeColor } from "../constants/varietalColors"

type Varietal = {
  id: number
  nombre: string
  tipo: string
}

type Plant = {
  id: number
  varietal_nombre: string
  varietal_tipo: string
  row_numero: number
  latitud: number | null
}

type VineRow = {
  id: number
  numero: number
  plant_count: number
}

export default function PlotMap() {
  const { plotId } = useParams()
  const navigate = useNavigate()

  const [rows, setRows] = useState<VineRow[]>([])
  const [plants, setPlants] = useState<Plant[]>([])
  const [varietals, setVarietals] = useState<Varietal[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCell, setSelectedCell] = useState<{ rowNumero: number; cellIdx: number } | null>(null)

  useEffect(() => {
    Promise.all([
      api.get(`/vine-rows/getVineRows?plot_id=${plotId}`),
      api.get(`/plants/getPlants?plot_id=${plotId}`),
    ])
      .then(([rowsRes, plantsRes]) => {
        setRows(rowsRes.data)
        setPlants(plantsRes.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [plotId])

  useEffect(() => {
    api.get(`/plots/getPlot/${plotId}`)
      .then(res => api.get(`/varietals/vineyard/${res.data.vineyard_id}`))
      .then(res => setVarietals(res.data))
      .catch(() => {})
  }, [plotId])

  const getPlantForCell = (rowNumero: number, cellIdx: number) => {
    const rowPlants = plants.filter(p => p.row_numero === rowNumero)
    return rowPlants[cellIdx]
  }

  const totalPlants = rows.reduce((sum, r) => sum + r.plant_count, 0)
  const plantedCount = plants.length
  const progress = totalPlants > 0 ? Math.round((plantedCount / totalPlants) * 100) : 0

  const maxPlantsInRow = Math.max(...rows.map(r => r.plant_count), 0)

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

      <div className="flex gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-violet-700 border border-violet-600" /> Tinta</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-lime-500 border border-lime-400" /> Blanca</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-rose-400 border border-rose-300" /> Rosada</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-slate-700 border border-slate-600" /> Sin planta</span>
      </div>

      <div className="bg-slate-800 rounded-xl p-4 overflow-auto">
        <div className="space-y-1 min-w-fit">
          {rows.map(row => (
            <div key={row.id} className="flex items-center gap-1">
              <span className="text-xs text-slate-500 w-10 text-right mr-2 shrink-0">F{row.numero}</span>
              <div className="flex gap-0.5">
                {Array.from({ length: Math.max(maxPlantsInRow, 1) }).map((_, idx) => {
                  const plant = getPlantForCell(row.numero, idx)
                  const isSelected = selectedCell?.rowNumero === row.numero && selectedCell?.cellIdx === idx

                  return (
                    <button
                      key={idx}
                      onClick={() => plant && setSelectedCell({ rowNumero: row.numero, cellIdx: idx })}
                      title={plant ? `${plant.varietal_nombre} (F${row.numero} #${idx + 1})` : `F${row.numero} #${idx + 1} — vacía`}
                      className={`w-5 h-5 rounded-sm border transition-all shrink-0 ${
                        plant
                          ? `${varietalColor[plant.varietal_tipo] || "bg-slate-600 border-slate-500"} hover:opacity-80`
                          : "bg-slate-700 border-slate-600 opacity-30"
                      } ${isSelected ? "ring-2 ring-white scale-125 z-10" : ""}`}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedCell && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setSelectedCell(null)}>
          <div className="bg-slate-800 rounded-xl p-6 max-w-sm w-full mx-4 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white">
              Fila {selectedCell.rowNumero} — Planta {selectedCell.cellIdx + 1}
            </h3>
            {(() => {
              const plant = getPlantForCell(selectedCell.rowNumero, selectedCell.cellIdx)
              if (!plant) return <p className="text-slate-400 text-sm">Sin planta asignada</p>
              return (
                <div className="space-y-2">
                  <p className="text-white">
                    <span className="text-slate-400">Varietal:</span> {plant.varietal_nombre}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                    varietalBadgeColor[plant.varietal_tipo] || "bg-slate-600/30 text-slate-400"
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
