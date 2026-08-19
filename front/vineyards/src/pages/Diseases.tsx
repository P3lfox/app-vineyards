import { useEffect, useState } from "react"
import { api } from "../services/api"
import { canDelete } from "../utils/role"

type Disease = {
  id: number
  nombre: string
  tipo: string
  descripcion: string | null
  gravedad: string
  deleted_at: string | null
}

const tipoOptions = ["criptogamica", "plaga", "virus", "carencia_nutricional"]
const gravedadOptions = ["leve", "moderada", "grave", "critica"]

const gravedadColor: Record<string, string> = {
  leve: "bg-yellow-500/20 text-yellow-400",
  moderada: "bg-orange-500/20 text-orange-400",
  grave: "bg-red-500/20 text-red-400",
  critica: "bg-red-700/20 text-red-500",
}

export default function Diseases() {
  const [diseases, setDiseases] = useState<Disease[]>([])
  const [loading, setLoading] = useState(true)
  const [showDeleted, setShowDeleted] = useState(false)
  const [editingDisease, setEditingDisease] = useState<Disease | null>(null)
  const [editForm, setEditForm] = useState({ nombre: "", tipo: "criptogamica", descripcion: "", gravedad: "leve" })
  const [createForm, setCreateForm] = useState({ nombre: "", tipo: "criptogamica", descripcion: "", gravedad: "leve" })
  const [showCreate, setShowCreate] = useState(false)

  const canDel = canDelete()

  useEffect(() => {
    api.get("/diseases/getDiseases")
      .then(res => setDiseases(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await api.post("/diseases/create", createForm)
      const newDisease = { id: res.data.id, ...createForm, deleted_at: null }
      setDiseases(prev => [...prev, newDisease])
      setCreateForm({ nombre: "", tipo: "criptogamica", descripcion: "", gravedad: "leve" })
      setShowCreate(false)
    } catch (err: any) {
      alert(err.response?.data?.message || "Error al crear")
    }
  }

  const startEdit = (d: Disease) => {
    setEditingDisease(d)
    setEditForm({ nombre: d.nombre, tipo: d.tipo, descripcion: d.descripcion || "", gravedad: d.gravedad })
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingDisease) return
    try {
      await api.put(`/diseases/update/${editingDisease.id}`, editForm)
      setDiseases(prev => prev.map(d => d.id === editingDisease.id ? { ...d, ...editForm } : d))
      setEditingDisease(null)
    } catch (err: any) {
      alert(err.response?.data?.message || "Error al actualizar")
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar esta enfermedad?")) return
    try {
      await api.delete(`/diseases/delete/${id}`)
      setDiseases(prev => prev.map(d => d.id === id ? { ...d, deleted_at: new Date().toISOString() } : d))
    } catch {
      alert("Error al eliminar")
    }
  }

  const handleRestore = async (id: number) => {
    try {
      await api.put(`/diseases/restore/${id}`)
      setDiseases(prev => prev.map(d => d.id === id ? { ...d, deleted_at: null } : d))
    } catch {
      alert("Error al restaurar")
    }
  }

  if (loading) return <div className="w-full p-6 text-slate-300 text-center">Cargando...</div>

  const active = diseases.filter(d => !d.deleted_at)
  const deleted = diseases.filter(d => d.deleted_at)
  const display = showDeleted ? deleted : active

  return (
    <div className="w-full p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Enfermedades 🦠</h1>
          <p className="text-slate-400 text-sm">
            {active.length} registradas
            {deleted.length > 0 && ` · ${deleted.length} eliminadas`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDeleted(!showDeleted)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              showDeleted ? "bg-amber-600/20 text-amber-400 hover:bg-amber-600/30" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            {showDeleted ? "← Ver activas" : "Ver eliminadas"}
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            + Nueva enfermedad
          </button>
        </div>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-slate-800 rounded-xl p-6 max-w-lg space-y-4">
          <h3 className="text-white font-semibold">Nueva enfermedad</h3>
          <input type="text" placeholder="Nombre" value={createForm.nombre} onChange={e => setCreateForm({ ...createForm, nombre: e.target.value })} required className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none" />
          <select value={createForm.tipo} onChange={e => setCreateForm({ ...createForm, tipo: e.target.value })} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none">
            {tipoOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={createForm.gravedad} onChange={e => setCreateForm({ ...createForm, gravedad: e.target.value })} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none">
            {gravedadOptions.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <textarea placeholder="Descripción" value={createForm.descripcion} onChange={e => setCreateForm({ ...createForm, descripcion: e.target.value })} rows={2} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none resize-none" />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold py-2.5 rounded-lg">Crear</button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition">Cancelar</button>
          </div>
        </form>
      )}

      {editingDisease && (
        <form onSubmit={handleEditSubmit} className="bg-slate-800 rounded-xl p-6 max-w-lg space-y-4">
          <h3 className="text-white font-semibold">Editar enfermedad</h3>
          <input type="text" placeholder="Nombre" value={editForm.nombre} onChange={e => setEditForm({ ...editForm, nombre: e.target.value })} required className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none" />
          <select value={editForm.tipo} onChange={e => setEditForm({ ...editForm, tipo: e.target.value })} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none">
            {tipoOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={editForm.gravedad} onChange={e => setEditForm({ ...editForm, gravedad: e.target.value })} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none">
            {gravedadOptions.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <textarea placeholder="Descripción" value={editForm.descripcion} onChange={e => setEditForm({ ...editForm, descripcion: e.target.value })} rows={2} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none resize-none" />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold py-2.5 rounded-lg">Guardar</button>
            <button type="button" onClick={() => setEditingDisease(null)} className="px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition">Cancelar</button>
          </div>
        </form>
      )}

      {display.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-12 text-center">
          <p className="text-slate-400">{showDeleted ? "No hay enfermedades eliminadas" : "No hay enfermedades registradas."}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {display.map(d => (
            <div key={d.id} className={`rounded-xl p-4 transition space-y-2 ${d.deleted_at ? "bg-slate-800/50 opacity-50 border border-slate-700/50" : "bg-slate-800 hover:border-slate-600 border border-slate-700"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className={`font-semibold ${d.deleted_at ? "text-slate-500" : "text-white"}`}>{d.nombre}</p>
                  <span className={`text-xs px-2 py-0.5 rounded capitalize ${d.deleted_at ? "bg-slate-700/50 text-slate-600" : "bg-slate-700 text-slate-400"}`}>{d.tipo}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded capitalize ${gravedadColor[d.gravedad]}`}>{d.gravedad}</span>
              </div>
              {d.descripcion && <p className={`text-sm ${d.deleted_at ? "text-slate-600" : "text-slate-400"}`}>{d.descripcion}</p>}
              {d.deleted_at && <p className="text-xs text-red-400">Eliminada</p>}
              <div className="pt-2 border-t border-slate-700/50 flex gap-2">
                {!d.deleted_at && <button onClick={() => startEdit(d)} className="flex-1 text-xs text-blue-400 hover:text-blue-500 transition">✏️ Editar</button>}
                {d.deleted_at && <button onClick={() => handleRestore(d.id)} className="flex-1 text-xs text-amber-400 hover:text-amber-500 transition">Restaurar</button>}
                {!d.deleted_at && canDel && <button onClick={() => handleDelete(d.id)} className="text-xs text-red-400 hover:text-red-500 transition">🗑️</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
