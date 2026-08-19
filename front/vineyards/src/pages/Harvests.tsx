import { useEffect, useState } from "react"
import { api } from "../services/api"

type VarietalBreakdown = {
  varietal_nombre: string
  varietal_tipo: string
  racimos: number
  kg_estimados: number
}

type PlotData = {
  plot_id: number
  plot_nombre: string
  varietal_breakdown: VarietalBreakdown[]
  total_racimos: number
  kg_estimados: number
  plantas_con_datos: number
  total_plantas: number
  cobertura_pct: number
}

type VineyardData = {
  vineyard_id: number
  vineyard_nombre: string
  plots: PlotData[]
}

type EstimateResponse = {
  vineyards: VineyardData[]
  totals: {
    total_racimos: number
    kg_estimados: number
    total_plantas: number
    plantas_con_datos: number
    cobertura_pct: number
  }
}

type Vineyard = {
  id: number
  nombre: string
  ubicacion: string
}

type Plot = {
  id: number
  nombre: string
  vineyard_id: number
}

const tipoColor: Record<string, string> = {
  tinta: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  blanca: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  rosada: "bg-pink-500/20 text-pink-400 border-pink-500/30",
}

export default function Harvests() {
  const [vineyards, setVineyards] = useState<Vineyard[]>([])
  const [plots, setPlots] = useState<Plot[]>([])
  const [selectedVineyard, setSelectedVineyard] = useState<number | "">("")
  const [selectedPlot, setSelectedPlot] = useState<number | "">("")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [estimate, setEstimate] = useState<EstimateResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [expandedPlot, setExpandedPlot] = useState<number | null>(null)

  useEffect(() => {
    api.get("/vineyard/getVineyard")
      .then((res) => setVineyards(res.data))
      .catch(() => setError("Error al cargar viñedos"))
  }, [])

  useEffect(() => {
    if (!selectedVineyard) {
      setPlots([])
      return
    }
    api.get(`/plots/getPlots?vineyard_id=${selectedVineyard}`)
      .then((res) => setPlots(res.data))
      .catch(() => setError("Error al cargar parcelas"))
  }, [selectedVineyard])

  const handleFetchEstimate = async () => {
    if (!selectedVineyard && !selectedPlot) {
      setError("Seleccioná un viñedo o parcela")
      return
    }

    setLoading(true)
    setError("")
    setEstimate(null)

    try {
      const params = new URLSearchParams()
      if (selectedVineyard) params.set("vineyard_id", String(selectedVineyard))
      if (selectedPlot) params.set("plot_id", String(selectedPlot))
      if (fechaDesde) params.set("fecha_desde", fechaDesde)
      if (fechaHasta) params.set("fecha_hasta", fechaHasta)

      const res = await api.get(`/plant-yield/estimate?${params.toString()}`)
      setEstimate(res.data)
    } catch {
      setError("Error al obtener estimación de cosecha")
    } finally {
      setLoading(false)
    }
  }

  const handleVineyardChange = (vineyardId: number | "") => {
    setSelectedVineyard(vineyardId)
    setSelectedPlot("")
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">
          Estimación de Cosecha
        </h1>
        <p className="text-slate-400 mt-1">
          Calculada a partir de datos de racimos por planta · <span className="text-amber-400 font-semibold">ESTIMACIÓN</span>
        </p>
      </div>

      {/* Filters */}
      <div className="bg-slate-800 rounded-2xl p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Viñedo</label>
            <select
              value={selectedVineyard}
              onChange={(e) => handleVineyardChange(e.target.value ? Number(e.target.value) : "")}
              className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none"
            >
              <option value="">Todos</option>
              {vineyards.map((v) => (
                <option key={v.id} value={v.id}>{v.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Parcela</label>
            <select
              value={selectedPlot}
              onChange={(e) => setSelectedPlot(e.target.value ? Number(e.target.value) : "")}
              className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none"
            >
              <option value="">Todas</option>
              {plots.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none"
            />
          </div>
        </div>

        <button
          onClick={handleFetchEstimate}
          disabled={loading}
          className="mt-4 w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition text-white font-semibold px-5 py-2.5 rounded-xl"
        >
          {loading ? "Calculando..." : "Calcular estimación"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
          {error}
          <button
            onClick={handleFetchEstimate}
            className="ml-2 underline hover:text-red-300"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-slate-800 rounded-2xl p-5 animate-pulse h-24" />
          ))}
        </div>
      )}

      {/* Results */}
      {estimate && !loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-800 rounded-2xl p-5">
              <p className="text-sm text-slate-400">Total racimos</p>
              <p className="text-2xl font-bold text-white">{estimate.totals.total_racimos.toLocaleString()}</p>
            </div>
            <div className="bg-slate-800 rounded-2xl p-5">
              <p className="text-sm text-slate-400">Kg estimados</p>
              <p className="text-2xl font-bold text-amber-400">{estimate.totals.kg_estimados.toLocaleString()} kg</p>
            </div>
            <div className="bg-slate-800 rounded-2xl p-5">
              <p className="text-sm text-slate-400">Cobertura</p>
              <div className="flex items-center gap-2">
                <p className={`text-2xl font-bold ${estimate.totals.cobertura_pct < 50 ? "text-red-400" : "text-emerald-400"}`}>
                  {estimate.totals.cobertura_pct}%
                </p>
                {estimate.totals.cobertura_pct < 50 && (
                  <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30">
                    BAJA
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {estimate.totals.plantas_con_datos} de {estimate.totals.total_plantas} plantas con datos
              </p>
            </div>
          </div>

          {/* Plots Table */}
          {estimate.vineyards.length === 0 ? (
            <div className="bg-slate-800 rounded-2xl p-12 text-center">
              <p className="text-4xl mb-3">📊</p>
              <p className="text-slate-400">No hay datos de rendimiento para esta selección.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {estimate.vineyards.map((vineyard) => (
                <div key={vineyard.vineyard_id} className="bg-slate-800 rounded-2xl overflow-hidden">
                  <div className="px-6 py-3 bg-slate-700/50">
                    <h3 className="font-semibold text-white">{vineyard.vineyard_nombre}</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-400">
                        <th className="text-left px-6 py-3"></th>
                        <th className="text-left px-6 py-3">Parcela</th>
                        <th className="text-right px-6 py-3">Racimos</th>
                        <th className="text-right px-6 py-3">Kg est.</th>
                        <th className="text-right px-6 py-3">Cobertura</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vineyard.plots.map((plot) => (
                        <>
                          <tr
                            key={plot.plot_id}
                            className="border-b border-slate-700/50 hover:bg-slate-700/30 transition text-slate-300 cursor-pointer"
                            onClick={() => setExpandedPlot(expandedPlot === plot.plot_id ? null : plot.plot_id)}
                          >
                            <td className="px-6 py-4 text-slate-500 w-8">
                              {expandedPlot === plot.plot_id ? "▼" : "▶"}
                            </td>
                            <td className="px-6 py-4 font-medium text-white">{plot.plot_nombre}</td>
                            <td className="px-6 py-4 text-right">{plot.total_racimos.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right font-semibold text-amber-400">
                              {plot.kg_estimados.toLocaleString()} kg
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={plot.cobertura_pct < 50 ? "text-red-400" : "text-emerald-400"}>
                                {plot.cobertura_pct}%
                              </span>
                            </td>
                          </tr>
                          {expandedPlot === plot.plot_id && plot.varietal_breakdown.length > 0 && (
                            <tr className="bg-slate-700/20">
                              <td colSpan={5} className="px-6 py-4">
                                <div className="ml-8">
                                  <p className="text-xs text-slate-500 mb-2 font-semibold uppercase tracking-wider">Desglose por varietal</p>
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="text-slate-400">
                                        <th className="text-left py-1">Varietal</th>
                                        <th className="text-left py-1">Tipo</th>
                                        <th className="text-right py-1">Racimos</th>
                                        <th className="text-right py-1">Kg est.</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {plot.varietal_breakdown.map((v, idx) => (
                                        <tr key={idx} className="text-slate-300">
                                          <td className="py-1 text-white">{v.varietal_nombre}</td>
                                          <td className="py-1">
                                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${tipoColor[v.varietal_tipo] || "bg-slate-500/20 text-slate-400 border-slate-500/30"}`}>
                                              {v.varietal_tipo}
                                            </span>
                                          </td>
                                          <td className="py-1 text-right">{v.racimos}</td>
                                          <td className="py-1 text-right text-amber-400">{v.kg_estimados} kg</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Empty state before any search */}
      {!estimate && !loading && !error && (
        <div className="bg-slate-800 rounded-2xl p-12 text-center">
          <p className="text-4xl mb-3">🍇</p>
          <p className="text-slate-400">Seleccioná un viñedo o parcela para ver la estimación.</p>
        </div>
      )}
    </div>
  )
}
