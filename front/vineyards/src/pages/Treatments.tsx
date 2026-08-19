import { useEffect, useState } from "react"
import { api } from "../services/api"
import { canDelete } from "../utils/role"

type Treatment = {
  id: number
  nombre: string
  descripcion: string | null
  deleted_at: string | null
}

export default function Treatments() {
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [loading, setLoading] = useState(true)
  const [showDeleted, setShowDeleted] = useState(false)
  const [editingTreatment, setEditingTreatment] = useState<Treatment | null>(null)
  const [editForm, setEditForm] = useState({ nombre: "", descripcion: "" })
  const [createForm, setCreateForm] = useState({ nombre: "", descripcion: "" })
  const [showCreate, setShowCreate] = useState(false)

  const canDel = canDelete()

  useEffect(() => {
    api.get("/treatments/getTreatments")
      .then(res => setTreatments(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await api.post("/treatments/create", createForm)
      const newTreatment = { id: res.data.id, ...createForm, deleted_at: null }
      setTreatments(prev => [...prev, newTreatment])
      setCreateForm({ nombre: "", descripcion: "" })
      setShowCreate(false)
    } catch (err: any) {
      alert(err.response?.data?.message || "Error al crear")
    }
  }

  const startEdit = (t: Treatment) => {
    setEditingTreatment(t)
    setEditForm({ nombre: t.nombre, descripcion: t.descripcion || "" })
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTreatment) return
    try {
      await api.put(`/treatments/update/${editingTreatment.id}`, editForm)
      setTreatments(prev => prev.map(t => t.id === editingTreatment.id ? { ...t, ...editForm } : t))
      setEditingTreatment(null)
    } catch (err: any) {
      alert(err.response?.data?.message || "Error al actualizar")
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este tratamiento?")) return
    try {
      await api.delete(`/treatments/delete/${id}`)
      setTreatments(prev => prev.map(t => t.id === id ? { ...t, deleted_at: new Date().toISOString() } : t))
    } catch {
      alert("Error al eliminar")
    }
  }

  const handleRestore = async (id: number) => {
    try {
      await api.put(`/treatments/restore/${id}`)
      setTreatments(prev => prev.map(t => t.id === id ? { ...t, deleted_at: null } : t))
    } catch {
      alert("Error al restaurar")
    }
  }

  if (loading) return <div className="w-full p-6 text-slate-300 text-center">Cargando...</div>

  const active = treatments.filter(t => !t.deleted_at)
  const deleted = treatments.filter(t => t.deleted_at)
  const display = showDeleted ? deleted : active

  return (
    <div className="w-full p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tratamientos 💊</h1>
          <p className="text-slate-400 text-sm">
            {active.length} registrados
            {deleted.length > 0 && ` · ${deleted.length} eliminados`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowDeleted(!showDeleted)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${showDeleted ? "bg-amber-600/20 text-amber-400 hover:bg-amber-600/30" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}>
            {showDeleted ? "← Ver activos" : "Ver eliminados"}
          </button>
          <button onClick={() => setShowCreate(!showCreate)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            + Nuevo tratamiento
          </button>
        </div>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-slate-800 rounded-xl p-6 max-w-lg space-y-4">
          <h3 className="text-white font-semibold">Nuevo tratamiento</h3>
          <input type="text" placeholder="Nombre" value={createForm.nombre} onChange={e => setCreateForm({ ...createForm, nombre: e.target.value })} required className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none" />
          <textarea placeholder="Descripción" value={createForm.descripcion} onChange={e => setCreateForm({ ...createForm, descripcion: e.target.value })} rows={3} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none resize-none" />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold py-2.5 rounded-lg">Crear</button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition">Cancelar</button>
          </div>
        </form>
      )}

      {editingTreatment && (
        <form onSubmit={handleEditSubmit} className="bg-slate-800 rounded-xl p-6 max-w-lg space-y-4">
          <h3 className="text-white font-semibold">Editar tratamiento</h3>
          <input type="text" placeholder="Nombre" value={editForm.nombre} onChange={e => setEditForm({ ...editForm, nombre: e.target.value })} required className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none" />
          <textarea placeholder="Descripción" value={editForm.descripcion} onChange={e => setEditForm({ ...editForm, descripcion: e.target.value })} rows={3} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none resize-none" />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold py-2.5 rounded-lg">Guardar</button>
            <button type="button" onClick={() => setEditingTreatment(null)} className="px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition">Cancelar</button>
          </div>
        </form>
      )}

      {display.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-12 text-center">
          <p className="text-slate-400">{showDeleted ? "No hay tratamientos eliminados" : "No hay tratamientos registrados."}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {display.map(t => (
            <div key={t.id} className={`rounded-xl p-4 transition space-y-2 ${t.deleted_at ? "bg-slate-800/50 opacity-50 border border-slate-700/50" : "bg-slate-800 hover:border-slate-600 border border-slate-700"}`}>
              <p className={`font-semibold ${t.deleted_at ? "text-slate-500" : "text-white"}`}>{t.nombre}</p>
              {t.descripcion && <p className={`text-sm ${t.deleted_at ? "text-slate-600" : "text-slate-400"}`}>{t.descripcion}</p>}
              {t.deleted_at && <p className="text-xs text-red-400">Eliminado</p>}
              <div className="pt-2 border-t border-slate-700/50 flex gap-2">
                {!t.deleted_at && <button onClick={() => startEdit(t)} className="flex-1 text-xs text-blue-400 hover:text-blue-500 transition">✏️ Editar</button>}
                {t.deleted_at && <button onClick={() => handleRestore(t.id)} className="flex-1 text-xs text-amber-400 hover:text-amber-500 transition">Restaurar</button>}
                {!t.deleted_at && canDel && <button onClick={() => handleDelete(t.id)} className="text-xs text-red-400 hover:text-red-500 transition">🗑️</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
