import { useEffect, useState } from "react"
import { api } from "../services/api"
import { useNavigate } from "react-router-dom"
import { canDelete, isAdmin } from "../utils/role"

type IrrigationEvent = {
  id: number
  plot_id: number
  plot_nombre: string
  sistema_tipo: string | null
  fecha: string
  duracion_min: number | null
  mm_aplicados: number | null
  presion_media_bar: number | null
  caudal_l_h: number | null
  estado: "created" | "in_progress" | "completed"
  observaciones: string | null
  deleted_at: string | null
}

type Plot = {
  id: number
  nombre: string
  deleted_at: string | null
  irrigation_system_id: number | null
  sistema_tipo: string | null
}

type IrrigationSystem = {
  id: number
  tipo: string
  descripcion: string | null
  presion_media_bar: number | null
  caudal_l_h: number | null
}

const todayStr = () => new Date().toISOString().split("T")[0]

const sistemaIcon: Record<string, string> = {
  goteo: "💧",
  manta: "🌊",
  aspersión: "🌧️",
  surco: "〰️",
  microaspersión: "🔹",
}

const estadoBadge: Record<string, string> = {
  created: "bg-slate-600/30 text-slate-400",
  in_progress: "bg-yellow-600/30 text-yellow-400",
  completed: "bg-emerald-600/30 text-emerald-400",
}

const estadoLabel: Record<string, string> = {
  created: "Creado",
  in_progress: "En progreso",
  completed: "Completado",
}

export default function IrrigationEvents() {
  const [events, setEvents] = useState<IrrigationEvent[]>([])
  const [plots, setPlots] = useState<Plot[]>([])
  const [loading, setLoading] = useState(true)
  const [showDeleted, setShowDeleted] = useState(false)
  const [createForm, setCreateForm] = useState({ plot_id: "", fecha: todayStr(), duracion_min: "", mm_aplicados: "", presion_media_bar: "", caudal_l_h: "", observaciones: "" })
  const [showCreate, setShowCreate] = useState(false)
  const [detailEvent, setDetailEvent] = useState<IrrigationEvent & { coverage?: any[]; impact?: any[] } | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [systems, setSystems] = useState<IrrigationSystem[]>([])
  const [showCatalog, setShowCatalog] = useState(false)

  const canDel = canDelete()
  const admin = isAdmin()
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      api.get("/irrigation-events/getAllIrrigationEvents"),
      api.get("/plots/getPlots"),
      api.get("/irrigation-systems/getIrrigationSystems"),
    ])
      .then(([eventsRes, plotsRes, systemsRes]) => {
        setEvents(eventsRes.data)
        setPlots(plotsRes.data)
        setSystems(systemsRes.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await api.post("/irrigation-events/create", {
        plot_id: parseInt(createForm.plot_id),
        fecha: createForm.fecha,
        duracion_min: createForm.duracion_min ? parseFloat(createForm.duracion_min) : null,
        mm_aplicados: createForm.mm_aplicados ? parseFloat(createForm.mm_aplicados) : null,
        presion_media_bar: createForm.presion_media_bar ? parseFloat(createForm.presion_media_bar) : null,
        caudal_l_h: createForm.caudal_l_h ? parseFloat(createForm.caudal_l_h) : null,
        observaciones: createForm.observaciones || null,
      })
      const plot = plots.find(p => p.id === parseInt(createForm.plot_id))
      const newEvent: IrrigationEvent = {
        id: res.data.id,
        plot_id: parseInt(createForm.plot_id),
        plot_nombre: plot?.nombre || "",
        sistema_tipo: plot?.sistema_tipo || null,
        fecha: createForm.fecha,
        duracion_min: createForm.duracion_min ? parseFloat(createForm.duracion_min) : null,
        mm_aplicados: createForm.mm_aplicados ? parseFloat(createForm.mm_aplicados) : null,
        presion_media_bar: createForm.presion_media_bar ? parseFloat(createForm.presion_media_bar) : null,
        caudal_l_h: createForm.caudal_l_h ? parseFloat(createForm.caudal_l_h) : null,
        estado: "created",
        observaciones: createForm.observaciones || null,
        deleted_at: null,
      }
      setEvents(prev => [newEvent, ...prev])
      setCreateForm({ plot_id: "", fecha: todayStr(), duracion_min: "", mm_aplicados: "", presion_media_bar: "", caudal_l_h: "", observaciones: "" })
      setShowCreate(false)
    } catch (err: any) {
      alert(err.response?.data?.message || "Error al crear")
    }
  }

  const handleStart = async (id: number) => {
    setActionLoading(id)
    try {
      await api.put(`/irrigation-events/startEvent/${id}`)
      setEvents(prev => prev.map(ev => ev.id === id ? { ...ev, estado: "in_progress" as const } : ev))
      navigate(`/irrigation-events/${id}/map`)
    } catch (err: any) {
      alert(err.response?.data?.message || "Error al iniciar evento")
    } finally {
      setActionLoading(null)
    }
  }

  const handleViewDetail = async (id: number) => {
    setLoadingDetail(true)
    setDetailEvent(null)
    try {
      const res = await api.get(`/irrigation-events/getIrrigationEvent/${id}`)
      setDetailEvent(res.data)
    } catch {
      alert("Error al obtener detalle")
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este evento de riego?")) return
    try {
      await api.delete(`/irrigation-events/delete/${id}`)
      setEvents(prev => prev.map(ev => ev.id === id ? { ...ev, deleted_at: new Date().toISOString() } : ev))
    } catch {
      alert("Error al eliminar")
    }
  }

  const handleRestore = async (id: number) => {
    try {
      await api.put(`/irrigation-events/restore/${id}`)
      setEvents(prev => prev.map(ev => ev.id === id ? { ...ev, deleted_at: null } : ev))
    } catch {
      alert("Error al restaurar")
    }
  }

  if (loading) return <div className="w-full p-6 text-slate-300 text-center">Cargando...</div>

  const active = events.filter(ev => !ev.deleted_at)
  const deleted = events.filter(ev => ev.deleted_at)
  const display = showDeleted ? deleted : active

  const activePlots = plots.filter(p => !p.deleted_at)

  return (
    <div className="w-full p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Eventos de Riego 🚿</h1>
          <p className="text-slate-400 text-sm">
            {active.length} registrados
            {deleted.length > 0 && ` · ${deleted.length} eliminados`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCatalog(true)}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition flex items-center gap-2"
          >
            📋 Ver catálogo
          </button>
          {admin && deleted.length > 0 && (
            <button onClick={() => setShowDeleted(!showDeleted)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${showDeleted ? "bg-amber-600/20 text-amber-400 hover:bg-amber-600/30" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}>
              {showDeleted ? "← Ver activos" : "Ver eliminados"}
            </button>
          )}
          <button onClick={() => setShowCreate(!showCreate)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            + Nuevo evento
          </button>
        </div>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-slate-800 rounded-xl p-6 max-w-lg space-y-4">
          <h3 className="text-white font-semibold">Nuevo evento de riego</h3>
          <select value={createForm.plot_id} onChange={e => setCreateForm({ ...createForm, plot_id: e.target.value })} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none" required>
            <option value="">Seleccionar parcela</option>
            {activePlots.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.sistema_tipo ? `(${p.sistema_tipo})` : ""}</option>)}
          </select>
          <input type="date" value={createForm.fecha} onChange={e => setCreateForm({ ...createForm, fecha: e.target.value })} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none" required />
          <div className="grid grid-cols-2 gap-3">
            <input type="number" step="1" placeholder="Duración (min)" value={createForm.duracion_min} onChange={e => setCreateForm({ ...createForm, duracion_min: e.target.value })} className="p-2.5 rounded-lg bg-slate-700 text-white outline-none" />
            <input type="number" step="0.01" placeholder="mm aplicados" value={createForm.mm_aplicados} onChange={e => setCreateForm({ ...createForm, mm_aplicados: e.target.value })} className="p-2.5 rounded-lg bg-slate-700 text-white outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" step="0.01" placeholder="Presión media (bar)" value={createForm.presion_media_bar} onChange={e => setCreateForm({ ...createForm, presion_media_bar: e.target.value })} className="p-2.5 rounded-lg bg-slate-700 text-white outline-none" />
            <input type="number" step="0.01" placeholder="Caudal (L/h)" value={createForm.caudal_l_h} onChange={e => setCreateForm({ ...createForm, caudal_l_h: e.target.value })} className="p-2.5 rounded-lg bg-slate-700 text-white outline-none" />
          </div>
          <textarea placeholder="Observaciones" value={createForm.observaciones} onChange={e => setCreateForm({ ...createForm, observaciones: e.target.value })} rows={2} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none resize-none" />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold py-2.5 rounded-lg">Crear</button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition">Cancelar</button>
          </div>
        </form>
      )}

      {display.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-12 text-center">
          <p className="text-slate-400">{showDeleted ? "No hay eventos eliminados" : "No hay eventos de riego registrados."}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {display.map(ev => (
            <div key={ev.id} className={`rounded-xl p-4 transition space-y-2 ${ev.deleted_at ? "bg-slate-800/50 opacity-50 border border-slate-700/50" : "bg-slate-800 hover:border-slate-600 border border-slate-700"}`}>
              <div className="flex items-center justify-between">
                <p className={`font-semibold ${ev.deleted_at ? "text-slate-500" : "text-white"}`}>{ev.plot_nombre}</p>
                <span className={`text-xs px-2 py-0.5 rounded capitalize ${estadoBadge[ev.estado] || "bg-slate-600/30 text-slate-400"}`}>
                  {estadoLabel[ev.estado] || ev.estado}
                </span>
              </div>
              {ev.sistema_tipo && <p className={`text-sm capitalize ${ev.deleted_at ? "text-slate-600" : "text-cyan-400"}`}>{ev.sistema_tipo}</p>}
              <div className="flex gap-4 text-xs text-slate-500">
                <span>{ev.fecha.split("T")[0]}</span>
                {ev.duracion_min && <span>{ev.duracion_min} min</span>}
                {ev.mm_aplicados && <span>{ev.mm_aplicados} mm</span>}
              </div>
              {(ev.presion_media_bar || ev.caudal_l_h) && (
                <div className="flex gap-4 text-xs text-slate-500">
                  {ev.presion_media_bar && <span>{ev.presion_media_bar} bar</span>}
                  {ev.caudal_l_h && <span>{ev.caudal_l_h} L/h</span>}
                </div>
              )}
              {ev.observaciones && <p className={`text-sm ${ev.deleted_at ? "text-slate-600" : "text-slate-400"}`}>{ev.observaciones}</p>}
              {ev.deleted_at && <p className="text-xs text-red-400">Eliminado</p>}
              <div className="pt-2 border-t border-slate-700/50 flex gap-2">
                {!ev.deleted_at && ev.estado === "created" && (
                  <button
                    onClick={() => handleStart(ev.id)}
                    disabled={actionLoading === ev.id}
                    className="flex-1 text-xs bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 py-2 rounded-lg transition font-medium disabled:opacity-50"
                  >
                    {actionLoading === ev.id ? "Iniciando..." : "▶ Iniciar"}
                  </button>
                )}
                {!ev.deleted_at && ev.estado === "in_progress" && (
                  <button
                    onClick={() => navigate(`/irrigation-events/${ev.id}/map`)}
                    className="flex-1 text-xs bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 py-2 rounded-lg transition font-medium"
                  >
                    ▶ Continuar
                  </button>
                )}
                <button onClick={() => handleViewDetail(ev.id)} className="flex-1 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 py-2 rounded-lg transition font-medium">
                  Ver detalle
                </button>
                {!ev.deleted_at && canDel && (
                  <button onClick={() => handleDelete(ev.id)} className="text-xs text-red-400 hover:text-red-500 transition">🗑️</button>
                )}
                {ev.deleted_at && (
                  <button onClick={() => handleRestore(ev.id)} className="flex-1 text-xs text-amber-400 hover:text-amber-500 transition">Restaurar</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de detalle */}
      {detailEvent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setDetailEvent(null)}>
          <div className="bg-slate-800 rounded-xl p-6 max-w-lg w-full mx-4 space-y-4 max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Detalle del evento</h3>
              <button onClick={() => setDetailEvent(null)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="space-y-2 text-sm">
              <p><span className="text-slate-400">Parcela:</span> <span className="text-white">{detailEvent.plot_nombre}</span></p>
              {detailEvent.sistema_tipo && <p><span className="text-slate-400">Sistema:</span> <span className="text-cyan-400 capitalize">{detailEvent.sistema_tipo}</span></p>}
              <p><span className="text-slate-400">Fecha:</span> <span className="text-white">{detailEvent.fecha.split("T")[0]}</span></p>
              <p><span className="text-slate-400">Estado:</span> <span className={`px-2 py-0.5 rounded text-xs ${estadoBadge[detailEvent.estado]}`}>{estadoLabel[detailEvent.estado]}</span></p>
              {detailEvent.duracion_min && <p><span className="text-slate-400">Duración:</span> <span className="text-white">{detailEvent.duracion_min} min</span></p>}
              {detailEvent.mm_aplicados && <p><span className="text-slate-400">mm aplicados:</span> <span className="text-white">{detailEvent.mm_aplicados}</span></p>}
              {detailEvent.presion_media_bar && <p><span className="text-slate-400">Presión:</span> <span className="text-white">{detailEvent.presion_media_bar} bar</span></p>}
              {detailEvent.caudal_l_h && <p><span className="text-slate-400">Caudal:</span> <span className="text-white">{detailEvent.caudal_l_h} L/h</span></p>}
              {detailEvent.observaciones && <p><span className="text-slate-400">Observaciones:</span> <span className="text-white">{detailEvent.observaciones}</span></p>}
            </div>

            {detailEvent.coverage && detailEvent.coverage.length > 0 && (
              <div>
                <h4 className="text-white font-semibold mb-2">Cobertura ({detailEvent.coverage.length} filas)</h4>
                <div className="bg-slate-700/50 rounded-lg p-3 space-y-1 max-h-40 overflow-auto">
                  {detailEvent.coverage.map((c: any, i: number) => (
                    <p key={i} className="text-xs text-slate-300">Fila #{c.vine_row_id}: {c.cobertura}</p>
                  ))}
                </div>
              </div>
            )}

            {detailEvent.impact && detailEvent.impact.length > 0 && (
              <div>
                <h4 className="text-white font-semibold mb-2">Impacto ({detailEvent.impact.length} plantas)</h4>
                <div className="bg-slate-700/50 rounded-lg p-3 space-y-1 max-h-40 overflow-auto">
                  {detailEvent.impact.map((i: any, idx: number) => (
                    <p key={idx} className="text-xs text-slate-300">
                      Planta #{i.plant_id}: {i.llegada_agua ? "✅ Llegó agua" : "❌ No llegó"} {i.hubo_cortes ? "(con cortes)" : ""}
                      {i.observaciones ? ` — ${i.observaciones}` : ""}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <button onClick={() => setDetailEvent(null)} className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-medium transition">
              Cerrar
            </button>
          </div>
        </div>
      )}

      {loadingDetail && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 text-white">Cargando detalle...</div>
        </div>
      )}

      {/* Catálogo de sistemas de riego */}
      {showCatalog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCatalog(false)}>
          <div className="bg-slate-800 rounded-xl max-w-2xl w-full mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-700 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-bold text-white">Catálogo de Sistemas de Riego 💧</h3>
                <p className="text-slate-400 text-sm">5 tipos fijos de riego</p>
              </div>
              <button onClick={() => setShowCatalog(false)} className="text-slate-400 hover:text-white transition text-xl">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {systems.map(s => (
                <div key={s.id} className="bg-slate-700/50 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{sistemaIcon[s.tipo] || "💧"}</span>
                    <h4 className="text-white font-semibold capitalize">{s.tipo}</h4>
                  </div>
                  {s.descripcion && (
                    <p className="text-sm text-slate-300 leading-relaxed">{s.descripcion}</p>
                  )}
                  <div className="flex gap-4 text-xs text-slate-400">
                    {s.presion_media_bar !== null && s.presion_media_bar > 0 && (
                      <span>Presión: <span className="text-white">{s.presion_media_bar} bar</span></span>
                    )}
                    {s.caudal_l_h !== null && s.caudal_l_h > 0 && (
                      <span>Caudal: <span className="text-white">{s.caudal_l_h} L/h</span></span>
                    )}
                    {s.presion_media_bar === 0 && s.caudal_l_h === 0 && (
                      <span className="text-slate-500">Sin presión ni caudal (riego gravitacional)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-700 shrink-0">
              <button onClick={() => setShowCatalog(false)} className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-medium transition">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
