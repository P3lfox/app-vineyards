import { useEffect, useState } from "react"
import { api } from "../services/api"
import { useNavigate } from "react-router-dom"
import { isAdmin, canDelete } from "../utils/role"

type Vineyard = {
  id: number
  nombre: string
  ubicacion: string
  created_at: string
  deleted_at: string | null
  varietales: { id: number; nombre: string; tipo: string }[]
}

export default function GetVineyards() {
  const [vineyards, setVineyards] = useState<Vineyard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showDeleted, setShowDeleted] = useState(false)
  const [editing, setEditing] = useState<Vineyard | null>(null)
  const [editForm, setEditForm] = useState({ nombre: "", ubicacion: "" })
  const navigate = useNavigate()
  const admin = isAdmin()
  const canDel = canDelete()

  useEffect(() => {
    api.get("/vineyard/getVineyard")
      .then(res => setVineyards(res.data))
      .catch(() => setError("Error al cargar viñedos"))
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar viñedo?")) return
    try {
      await api.delete(`/vineyard/deleteVineyard/${id}`)
      setVineyards(prev => prev.map(v => v.id === id ? { ...v, deleted_at: new Date().toISOString() } : v))
    } catch (err) {
      console.log(err)
    }
  }

  const handleRestore = async (id: number) => {
    try {
      await api.patch(`/vineyard/restoreVineyard/${id}`)
      setVineyards(prev => prev.map(v => v.id === id ? { ...v, deleted_at: null } : v))
    } catch (err) {
      console.log(err)
    }
  }

  const startEdit = (v: Vineyard) => {
    setEditing(v)
    setEditForm({ nombre: v.nombre, ubicacion: v.ubicacion })
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    try {
      await api.patch(`/vineyard/updateVineyard/${editing.id}`, editForm)
      setVineyards(prev => prev.map(v => v.id === editing.id ? { ...v, ...editForm } : v))
      setEditing(null)
    } catch (err: any) {
      alert(err.response?.data?.message || "Error al actualizar")
    }
  }

  const active = vineyards.filter(v => !v.deleted_at)
  const deleted = vineyards.filter(v => v.deleted_at)
  const display = showDeleted ? deleted : active

  if (editing) {
    return (
      <div className="w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Editar Viñedo</h1>
          <button onClick={() => setEditing(null)} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">← Volver</button>
        </div>
        <form onSubmit={handleEditSubmit} className="bg-slate-800 rounded-xl p-6 max-w-md space-y-4">
          <input type="text" name="nombre" placeholder="Nombre del viñedo" value={editForm.nombre} onChange={e => setEditForm({ ...editForm, nombre: e.target.value })} required className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none" />
          <input type="text" name="ubicacion" placeholder="Ubicación" value={editForm.ubicacion} onChange={e => setEditForm({ ...editForm, ubicacion: e.target.value })} required className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none" />
          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold py-2.5 rounded-lg">Guardar cambios</button>
        </form>
      </div>
    )
  }

  return (
    <div className="w-full p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Viñedos 🍇</h1>
          <p className="text-slate-400 text-sm">
            {active.length} activos{admin && deleted.length > 0 && ` · ${deleted.length} eliminados`}
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
              {showDeleted ? "← Ver activos" : "Ver eliminados"}
            </button>
          )}
          <button
            onClick={() => navigate("/vineyards/create")}
            className="bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold px-4 py-2 rounded-lg"
          >
            + Nuevo viñedo
          </button>
        </div>
      </div>

      {loading && <p className="text-slate-300 text-center">Cargando...</p>}
      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      {!loading && display.length === 0 && (
        <p className="text-slate-400 text-center">
          {showDeleted ? "No hay viñedos eliminados" : "No hay viñedos cargados"}
        </p>
      )}

      {!loading && display.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {display.map(v => (
            <div
              key={v.id}
              className={`rounded-xl p-4 transition space-y-3 ${
                v.deleted_at
                  ? "bg-slate-800/50 opacity-50 border border-slate-700/50"
                  : "bg-slate-800 hover:bg-slate-700/60 border border-slate-700"
              }`}
            >
              <div>
                <p className={`font-semibold ${v.deleted_at ? "text-slate-500" : "text-white"}`}>{v.nombre}</p>
                <p className={`text-sm ${v.deleted_at ? "text-slate-600" : "text-slate-400"}`}>{v.ubicacion}</p>
              </div>

              {v.varietales.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {v.varietales.slice(0, 5).map((varietal: any) => (
                    <span
                      key={varietal.id}
                      className={`text-xs px-2 py-0.5 rounded ${
                        v.deleted_at ? "bg-slate-700/50 text-slate-600" : "bg-slate-700 text-emerald-400"
                      }`}
                    >
                      {varietal.nombre}
                    </span>
                  ))}
                  {v.varietales.length > 5 && (
                    <span className="text-xs text-slate-500">+{v.varietales.length - 5}</span>
                  )}
                </div>
              )}

              <p className="text-xs text-slate-500">
                Creado: {new Date(v.created_at).toLocaleDateString()}
                {v.deleted_at && <span className="text-red-400 ml-2">· Eliminado</span>}
              </p>

              <div className="pt-2 border-t border-slate-700/50 flex justify-between">
                {!v.deleted_at && (
                  <button
                    onClick={() => navigate(`/vineyards/${v.id}/plots`)}
                    className="text-emerald-400 hover:text-emerald-500 transition text-sm font-medium"
                  >
                    Ver parcelas →
                  </button>
                )}
                <div className="flex gap-2 ml-auto">
                  {v.deleted_at && admin && (
                    <button
                      onClick={() => handleRestore(v.id)}
                      className="text-amber-400 hover:text-amber-500 transition text-sm font-medium"
                    >
                      Restaurar
                    </button>
                  )}
                  {!v.deleted_at && (
                    <button
                      onClick={() => startEdit(v)}
                      className="text-blue-400 hover:text-blue-500 transition text-sm"
                    >
                      ✏️
                    </button>
                  )}
                  {!v.deleted_at && canDel && (
                    <button
                      onClick={() => handleDelete(v.id)}
                      className="text-red-400 hover:text-red-500 transition text-sm"
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
