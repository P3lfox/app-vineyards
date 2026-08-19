import { useEffect, useState } from "react"
import { api } from "../services/api"
import { useNavigate, useParams } from "react-router-dom"
import { isAdmin, canDelete } from "../utils/role"

type Plot = {
  id: number
  nombre: string
  area_m2: number | null
  vineyard_id: number
  vineyard_nombre: string
  irrigation_system_id: number | null
  sistema_tipo: string | null
  forma_parcela: string | null
  terreno: string | null
  created_at: string
  deleted_at: string | null
}

type IrrigationSystem = {
  id: number
  tipo: string
}

export default function Plots() {
  const { vineyardId } = useParams()
  const [plots, setPlots] = useState<Plot[]>([])
  const [systems, setSystems] = useState<IrrigationSystem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)
  const [editing, setEditing] = useState<Plot | null>(null)
  const [form, setForm] = useState({ nombre: "", area_m2: "", irrigation_system_id: "", forma_parcela: "rectangular", terreno: "plano" })
  const [editForm, setEditForm] = useState({ nombre: "", area_m2: "", irrigation_system_id: "", forma_parcela: "rectangular", terreno: "plano" })
  const navigate = useNavigate()
  const admin = isAdmin()
  const canDel = canDelete()

  const endpoint = vineyardId
    ? `/plots/getPlots?vineyard_id=${vineyardId}`
    : `/plots/getPlots`

  useEffect(() => {
    Promise.all([
      api.get(endpoint),
      api.get("/irrigation-systems/getIrrigationSystems"),
    ])
      .then(([plotsRes, systemsRes]) => {
        setPlots(plotsRes.data)
        setSystems(systemsRes.data)
      })
      .catch(() => setError("Error al cargar parcelas"))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        ...form,
        area_m2: parseFloat(form.area_m2) || null,
        vineyard_id: vineyardId ? parseInt(vineyardId) : undefined,
        irrigation_system_id: form.irrigation_system_id ? parseInt(form.irrigation_system_id) : null,
      }
      const res = await api.post("/plots/createPlot", payload)
      setPlots(prev => [...prev, res.data])
      setShowForm(false)
      setForm({ nombre: "", area_m2: "", irrigation_system_id: "", forma_parcela: "rectangular", terreno: "plano" })
    } catch {
      alert("Error al crear la parcela")
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar esta parcela?")) return
    try {
      await api.delete(`/plots/deletePlot/${id}`)
      setPlots(prev => prev.map(p => p.id === id ? { ...p, deleted_at: new Date().toISOString() } : p))
    } catch {
      alert("Error al eliminar")
    }
  }

  const handleRestore = async (id: number) => {
    try {
      await api.patch(`/plots/restorePlot/${id}`)
      setPlots(prev => prev.map(p => p.id === id ? { ...p, deleted_at: null } : p))
    } catch {
      alert("Error al restaurar")
    }
  }

  const startEdit = (p: Plot) => {
    setEditing(p)
    setEditForm({
      nombre: p.nombre,
      area_m2: p.area_m2?.toString() || "",
      irrigation_system_id: p.irrigation_system_id?.toString() || "",
      forma_parcela: p.forma_parcela || "rectangular",
      terreno: p.terreno || "plano",
    })
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    try {
      await api.patch(`/plots/updatePlot/${editing.id}`, {
        nombre: editForm.nombre,
        area_m2: editForm.area_m2 ? parseFloat(editForm.area_m2) : null,
        irrigation_system_id: editForm.irrigation_system_id ? parseInt(editForm.irrigation_system_id) : null,
        forma_parcela: editForm.forma_parcela,
        terreno: editForm.terreno,
      })
      const updatedSystem = systems.find(s => s.id === parseInt(editForm.irrigation_system_id))
      setPlots(prev => prev.map(p => p.id === editing.id ? {
        ...p,
        nombre: editForm.nombre,
        area_m2: editForm.area_m2 ? parseFloat(editForm.area_m2) : null,
        irrigation_system_id: editForm.irrigation_system_id ? parseInt(editForm.irrigation_system_id) : null,
        sistema_tipo: updatedSystem?.tipo || null,
        forma_parcela: editForm.forma_parcela,
        terreno: editForm.terreno,
      } : p))
      setEditing(null)
    } catch (err: any) {
      alert(err.response?.data?.message || "Error al actualizar")
    }
  }

  const active = plots.filter(p => !p.deleted_at)
  const deleted = plots.filter(p => p.deleted_at)
  const display = showDeleted ? deleted : active

  if (editing) {
    return (
      <div className="w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Editar Parcela</h1>
          <button onClick={() => setEditing(null)} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">← Volver</button>
        </div>
        <form onSubmit={handleEditSubmit} className="bg-slate-800 rounded-xl p-6 max-w-md space-y-4">
          <input type="text" name="nombre" placeholder="Nombre" value={editForm.nombre} onChange={e => setEditForm({ ...editForm, nombre: e.target.value })} required className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none" />
          <input type="number" name="area_m2" placeholder="Superficie (m²)" value={editForm.area_m2} onChange={e => setEditForm({ ...editForm, area_m2: e.target.value })} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none" />
          <select value={editForm.irrigation_system_id} onChange={e => setEditForm({ ...editForm, irrigation_system_id: e.target.value })} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none">
            <option value="">Sin sistema de riego</option>
            {systems.map(s => <option key={s.id} value={s.id}>{s.tipo}</option>)}
          </select>
          <select value={editForm.forma_parcela} onChange={e => setEditForm({ ...editForm, forma_parcela: e.target.value })} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none">
            <option value="rectangular">Rectangular</option>
            <option value="trapezoidal">Trapezoidal</option>
            <option value="abanicado">Abanicado</option>
            <option value="terrazas">Terrazas</option>
            <option value="irregular">Irregular</option>
          </select>
          <select value={editForm.terreno} onChange={e => setEditForm({ ...editForm, terreno: e.target.value })} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none">
            <option value="plano">Plano</option>
            <option value="ladera">Ladera</option>
            <option value="pendiente">Pendiente</option>
            <option value="con_cauce">Con cauce</option>
          </select>
          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold py-2.5 rounded-lg">Guardar cambios</button>
        </form>
      </div>
    )
  }

  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Parcelas 🗺️</h1>
          <p className="text-slate-400 text-sm">
            {vineyardId ? `Viñedo #${vineyardId}` : "Todas las parcelas"}
            {admin && deleted.length > 0 && ` · ${active.length} activas · ${deleted.length} eliminadas`}
          </p>
        </div>
        <div className="flex gap-2">
          {admin && deleted.length > 0 && (
            <button
              onClick={() => setShowDeleted(!showDeleted)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                showDeleted
                  ? "bg-amber-600/20 text-amber-400 hover:bg-amber-600/30"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {showDeleted ? "← Ver activas" : "Ver eliminadas"}
            </button>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold px-4 py-2 rounded-lg"
          >
            {showForm ? "Cancelar" : "+ Nueva parcela"}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-slate-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Nueva parcela</h2>
          <form onSubmit={handleSubmit} className="flex gap-3 flex-wrap">
            <input
              type="text"
              name="nombre"
              placeholder="Nombre"
              value={form.nombre}
              onChange={handleChange}
              required
              className="flex-1 min-w-[200px] p-2.5 rounded-lg bg-slate-700 text-white outline-none"
            />
            <input
              type="number"
              name="area_m2"
              placeholder="Superficie (m²)"
              value={form.area_m2}
              onChange={handleChange}
              className="w-40 p-2.5 rounded-lg bg-slate-700 text-white outline-none"
            />
            <select
              value={form.irrigation_system_id}
              onChange={e => setForm({ ...form, irrigation_system_id: e.target.value })}
              className="flex-1 min-w-[200px] p-2.5 rounded-lg bg-slate-700 text-white outline-none"
            >
              <option value="">Sin sistema de riego</option>
              {systems.map(s => <option key={s.id} value={s.id}>{s.tipo}</option>)}
            </select>
            <select
              value={form.forma_parcela}
              onChange={e => setForm({ ...form, forma_parcela: e.target.value })}
              className="flex-1 min-w-[200px] p-2.5 rounded-lg bg-slate-700 text-white outline-none"
            >
              <option value="rectangular">Rectangular</option>
              <option value="trapezoidal">Trapezoidal</option>
              <option value="abanicado">Abanicado</option>
              <option value="terrazas">Terrazas</option>
              <option value="irregular">Irregular</option>
            </select>
            <select
              value={form.terreno}
              onChange={e => setForm({ ...form, terreno: e.target.value })}
              className="flex-1 min-w-[200px] p-2.5 rounded-lg bg-slate-700 text-white outline-none"
            >
              <option value="plano">Plano</option>
              <option value="ladera">Ladera</option>
              <option value="pendiente">Pendiente</option>
              <option value="con_cauce">Con cauce</option>
            </select>
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold px-6 py-2.5 rounded-lg"
            >
              Crear
            </button>
          </form>
        </div>
      )}

      {loading && <p className="text-slate-300 text-center">Cargando...</p>}
      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      {!loading && display.length === 0 && (
        <div className="bg-slate-800 rounded-xl p-12 text-center">
          <p className="text-slate-400">
            {showDeleted ? "No hay parcelas eliminadas" : "No hay parcelas registradas."}
          </p>
          {!showDeleted && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-emerald-400 hover:text-emerald-300 text-sm transition"
            >
              Crear la primera parcela →
            </button>
          )}
        </div>
      )}

      {!loading && display.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {display.map(plot => (
            <div
              key={plot.id}
              className={`rounded-xl p-5 transition space-y-3 ${
                plot.deleted_at
                  ? "bg-slate-800/50 opacity-50 border border-slate-700/50"
                  : "bg-slate-800 hover:border-slate-600 border border-slate-700"
              }`}
            >
              <div>
                <h3 className={`font-semibold text-lg ${plot.deleted_at ? "text-slate-500" : "text-white"}`}>{plot.nombre}</h3>
                <p className={`text-xs ${plot.deleted_at ? "text-slate-600" : "text-slate-400"}`}>Viñedo: {plot.vineyard_nombre}</p>
                {plot.area_m2 && (
                  <p className={`text-sm font-medium ${plot.deleted_at ? "text-slate-600" : "text-emerald-400"}`}>
                    {plot.area_m2 >= 10000
                      ? `${(plot.area_m2 / 10000).toFixed(2)} ha`
                      : `${plot.area_m2} m²`}
                  </p>
                )}
                {plot.sistema_tipo && (
                  <p className="text-xs text-cyan-400 capitalize">Sistema: {plot.sistema_tipo}</p>
                )}
                {plot.forma_parcela && plot.forma_parcela !== 'rectangular' && (
                  <p className="text-xs text-amber-400 capitalize">Forma: {plot.forma_parcela}</p>
                )}
                {plot.terreno && plot.terreno !== 'plano' && (
                  <p className="text-xs text-orange-400 capitalize">Terreno: {plot.terreno}</p>
                )}
              </div>

              <p className="text-xs text-slate-500">
                Creada: {new Date(plot.created_at).toLocaleDateString()}
                {plot.deleted_at && <span className="text-red-400 ml-2">· Eliminada</span>}
              </p>

              <div className="flex gap-2 pt-2 border-t border-slate-700/50">
                {!plot.deleted_at && (
                  <>
                    <button
                      onClick={() => navigate(`/plots/${plot.id}/map`)}
                      className="flex-1 text-xs bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 py-2 rounded-lg transition font-medium"
                    >
                      🗺️ Mapa
                    </button>
                    <button
                      onClick={() => navigate(`/plots/${plot.id}/map3d`)}
                      className="flex-1 text-xs bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 py-2 rounded-lg transition font-medium"
                    >
                      🧊 3D
                    </button>
                    <button
                      onClick={() => navigate(`/plots/${plot.id}/rows`)}
                      className="flex-1 text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 py-2 rounded-lg transition font-medium"
                    >
                      Ver filas →
                    </button>
                  </>
                )}
                <div className="flex gap-2 ml-auto">
                  {plot.deleted_at && admin && (
                    <button
                      onClick={() => handleRestore(plot.id)}
                      className="text-xs text-amber-400 hover:text-amber-500 transition font-medium"
                    >
                      Restaurar
                    </button>
                  )}
                  {!plot.deleted_at && (
                    <button
                      onClick={() => startEdit(plot)}
                      className="text-blue-400 hover:text-blue-500 transition text-sm"
                    >
                      ✏️
                    </button>
                  )}
                  {!plot.deleted_at && canDel && (
                    <button
                      onClick={() => handleDelete(plot.id)}
                      className="text-xs bg-red-600/20 hover:bg-red-600/30 text-red-400 px-3 py-2 rounded-lg transition"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
