import { useEffect, useState } from "react"
import { api } from "../services/api"
import { useNavigate, useParams } from "react-router-dom"
import { isAdmin, canDelete } from "../utils/role"

type VineRow = {
  id: number
  numero: number
  plot_id: number
  plant_count: number
  longitud_m: number | null
  num_plantas_esperadas: number | null
  created_at: string
  deleted_at: string | null
}

export default function VineRows() {
  const { plotId } = useParams()
  const [rows, setRows] = useState<VineRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)
  const [editing, setEditing] = useState<VineRow | null>(null)
  const [form, setForm] = useState({ numero: "", longitud_m: "", num_plantas_esperadas: "" })
  const [editForm, setEditForm] = useState({ numero: "", longitud_m: "", num_plantas_esperadas: "" })
  const navigate = useNavigate()
  const admin = isAdmin()
  const canDel = canDelete()

  useEffect(() => {
    if (!plotId) return
    api.get(`/vine-rows/getVineRows?plot_id=${plotId}`)
      .then(res => setRows(res.data))
      .catch(() => setError("Error al cargar filas"))
      .finally(() => setLoading(false))
  }, [plotId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await api.post("/vine-rows/createVineRow", {
        plot_id: parseInt(plotId!),
        numero: parseInt(form.numero),
        longitud_m: form.longitud_m ? parseFloat(form.longitud_m) : null,
        num_plantas_esperadas: form.num_plantas_esperadas ? parseInt(form.num_plantas_esperadas) : null,
      })
      setRows(prev => [...prev, res.data])
      setShowForm(false)
      setForm({ numero: "", longitud_m: "", num_plantas_esperadas: "" })
      navigate(`/plots/${plotId}/rows/${res.data.id}/plants`)
    } catch {
      alert("Error al crear la fila")
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar esta fila?")) return
    try {
      await api.delete(`/vine-rows/deleteVineRow/${id}`)
      setRows(prev => prev.map(r => r.id === id ? { ...r, deleted_at: new Date().toISOString() } : r))
    } catch {
      alert("Error al eliminar")
    }
  }

  const handleRestore = async (id: number) => {
    try {
      await api.patch(`/vine-rows/restoreVineRow/${id}`)
      setRows(prev => prev.map(r => r.id === id ? { ...r, deleted_at: null } : r))
    } catch {
      alert("Error al restaurar")
    }
  }

  const startEdit = (r: VineRow) => {
    setEditing(r)
    setEditForm({
      numero: r.numero.toString(),
      longitud_m: r.longitud_m?.toString() || "",
      num_plantas_esperadas: r.num_plantas_esperadas?.toString() || "",
    })
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    try {
      await api.patch(`/vine-rows/updateVineRow/${editing.id}`, {
        numero: parseInt(editForm.numero),
        longitud_m: editForm.longitud_m ? parseFloat(editForm.longitud_m) : null,
        num_plantas_esperadas: editForm.num_plantas_esperadas ? parseInt(editForm.num_plantas_esperadas) : null,
      })
      setRows(prev => prev.map(r => r.id === editing.id ? {
        ...r,
        numero: parseInt(editForm.numero),
        longitud_m: editForm.longitud_m ? parseFloat(editForm.longitud_m) : null,
        num_plantas_esperadas: editForm.num_plantas_esperadas ? parseInt(editForm.num_plantas_esperadas) : null,
      } : r))
      setEditing(null)
    } catch (err: any) {
      alert(err.response?.data?.message || "Error al actualizar")
    }
  }

  const active = rows.filter(r => !r.deleted_at)
  const deleted = rows.filter(r => r.deleted_at)
  const display = showDeleted ? deleted : active

  if (editing) {
    return (
      <div className="w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Editar Fila</h1>
          <button onClick={() => setEditing(null)} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">← Volver</button>
        </div>
        <form onSubmit={handleEditSubmit} className="bg-slate-800 rounded-xl p-6 max-w-md space-y-4">
          <input type="number" name="numero" placeholder="Número de fila" value={editForm.numero} onChange={e => setEditForm({ ...editForm, numero: e.target.value })} required min="1" className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none" />
          <input type="number" name="longitud_m" placeholder="Longitud (m, opcional)" value={editForm.longitud_m} onChange={e => setEditForm({ ...editForm, longitud_m: e.target.value })} step="0.01" min="0" className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none" />
          <input type="number" name="num_plantas_esperadas" placeholder="Plantas esperadas (opcional)" value={editForm.num_plantas_esperadas} onChange={e => setEditForm({ ...editForm, num_plantas_esperadas: e.target.value })} min="1" className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none" />
          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold py-2.5 rounded-lg">Guardar cambios</button>
        </form>
      </div>
    )
  }

  return (
    <div className="w-full p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Filas de Vid 🌿</h1>
          <p className="text-slate-400 text-sm">Parcela #{plotId}
            {admin && deleted.length > 0 && ` · ${active.length} activas · ${deleted.length} eliminadas`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/plots/${plotId}/map`)}
            className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            🗺️ Mapa
          </button>
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
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            {showForm ? "Cancelar" : "+ Nueva fila"}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-slate-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Nueva fila</h2>
        <form onSubmit={handleSubmit} className="flex gap-3 flex-wrap items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Número de fila</label>
            <input
              type="number"
              name="numero"
              placeholder="Número"
              value={form.numero}
              onChange={handleChange}
              required
              min="1"
              className="w-32 p-2.5 rounded-lg bg-slate-700 text-white outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Longitud (m, opcional)</label>
            <input
              type="number"
              name="longitud_m"
              placeholder="45.5"
              value={form.longitud_m}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="w-32 p-2.5 rounded-lg bg-slate-700 text-white outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Plantas esperadas</label>
            <input
              type="number"
              name="num_plantas_esperadas"
              placeholder="30"
              value={form.num_plantas_esperadas}
              onChange={handleChange}
              min="1"
              className="w-32 p-2.5 rounded-lg bg-slate-700 text-white outline-none"
            />
          </div>
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-medium transition"
          >
            Crear y cargar plantas →
          </button>
        </form>
        </div>
      )}

      {loading && <p className="text-slate-300 text-center">Cargando...</p>}
      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      {!loading && display.length === 0 && (
        <div className="bg-slate-800 rounded-xl p-12 text-center">
          <p className="text-slate-400">
            {showDeleted ? "No hay filas eliminadas" : "No hay filas registradas."}
          </p>
          {!showDeleted && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-emerald-400 hover:text-emerald-300 text-sm transition"
            >
              Crear la primera fila →
            </button>
          )}
        </div>
      )}

      {!loading && display.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {display.map(row => (
            <div
              key={row.id}
              className={`rounded-xl p-4 transition space-y-2 ${
                row.deleted_at
                  ? "bg-slate-800/50 opacity-50 border border-slate-700/50"
                  : "bg-slate-800 hover:border-slate-600 border border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className={`font-semibold ${row.deleted_at ? "text-slate-500" : "text-white"}`}>Fila #{row.numero}</h3>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  row.deleted_at ? "bg-slate-700/50 text-slate-600" : "bg-slate-700 text-emerald-400"
                }`}>
                  {row.plant_count} planta{row.plant_count !== 1 ? "s" : ""}
                </span>
              </div>
              {row.num_plantas_esperadas && (
                <p className={`text-xs ${row.deleted_at ? "text-slate-600" : "text-slate-400"}`}>
                  {row.plant_count}/{row.num_plantas_esperadas} plantas
                </p>
              )}
              {row.longitud_m && (
                <p className={`text-xs ${row.deleted_at ? "text-slate-600" : "text-slate-400"}`}>
                  {row.longitud_m} m
                </p>
              )}
              {row.deleted_at && <p className="text-xs text-red-400">Eliminada</p>}
              <div className="flex gap-2 pt-2 border-t border-slate-700/50">
                {!row.deleted_at && (
                  <button
                    onClick={() => navigate(`/plots/${plotId}/rows/${row.id}/plants`)}
                    className="flex-1 text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 py-2 rounded-lg transition font-medium"
                  >
                    Cargar plantas →
                  </button>
                )}
                <div className="flex gap-2 ml-auto">
                  {row.deleted_at && admin && (
                    <button
                      onClick={() => handleRestore(row.id)}
                      className="text-xs text-amber-400 hover:text-amber-500 transition font-medium"
                    >
                      Restaurar
                    </button>
                  )}
                  {!row.deleted_at && (
                    <button
                      onClick={() => startEdit(row)}
                      className="text-blue-400 hover:text-blue-500 transition text-sm"
                    >
                      ✏️
                    </button>
                  )}
                  {!row.deleted_at && canDel && (
                    <button
                      onClick={() => handleDelete(row.id)}
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
