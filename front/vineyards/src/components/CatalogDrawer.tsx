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

type Treatment = {
  id: number
  nombre: string
  descripcion: string | null
  deleted_at: string | null
}

type CatalogItem = Disease | Treatment

const tipoOptions = ["criptogamica", "plaga", "virus", "carencia_nutricional"]
const gravedadOptions = ["leve", "moderada", "grave", "critica"]

const gravedadColor: Record<string, string> = {
  leve: "bg-yellow-500/20 text-yellow-400",
  moderada: "bg-orange-500/20 text-orange-400",
  grave: "bg-red-500/20 text-red-400",
  critica: "bg-red-700/20 text-red-500",
}

interface CatalogDrawerProps {
  mode: "disease" | "treatment"
  open: boolean
  onClose: () => void
}

function isDisease(item: CatalogItem): item is Disease {
  return "tipo" in item && "gravedad" in item
}

export default function CatalogDrawer({ mode, open, onClose }: CatalogDrawerProps) {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showDeleted, setShowDeleted] = useState(false)
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const canDel = canDelete()
  const isDiseaseMode = mode === "disease"

  const fetchUrl = isDiseaseMode ? "/diseases/getDiseases" : "/treatments/getTreatments"
  const createUrl = isDiseaseMode ? "/diseases/create" : "/treatments/create"
  const updateUrl = (id: number) => isDiseaseMode ? `/diseases/update/${id}` : `/treatments/update/${id}`
  const deleteUrl = (id: number) => isDiseaseMode ? `/diseases/delete/${id}` : `/treatments/delete/${id}`
  const restoreUrl = (id: number) => isDiseaseMode ? `/diseases/restore/${id}` : `/treatments/restore/${id}`

  const title = isDiseaseMode ? "Enfermedades" : "Tratamientos"
  const singular = isDiseaseMode ? "enfermedad" : "tratamiento"
  const newLabel = isDiseaseMode ? "Nueva enfermedad" : "Nuevo tratamiento"
  const editLabel = isDiseaseMode ? "Editar enfermedad" : "Editar tratamiento"
  const noneLabel = isDiseaseMode ? "No hay enfermedades registradas." : "No hay tratamientos registrados."
  const noneDeletedLabel = isDiseaseMode ? "No hay enfermedades eliminadas" : "No hay tratamientos eliminados"
  const deletedLabel = isDiseaseMode ? "Eliminada" : "Eliminado"
  const verActivas = isDiseaseMode ? "Ver activas" : "Ver activos"
  const verEliminadas = isDiseaseMode ? "Ver eliminadas" : "Ver eliminados"

  const [createForm, setCreateForm] = useState<Record<string, string>>(
    isDiseaseMode
      ? { nombre: "", tipo: "criptogamica", descripcion: "", gravedad: "leve" }
      : { nombre: "", descripcion: "" }
  )

  const [editForm, setEditForm] = useState<Record<string, string>>(
    isDiseaseMode
      ? { nombre: "", tipo: "criptogamica", descripcion: "", gravedad: "leve" }
      : { nombre: "", descripcion: "" }
  )

  useEffect(() => {
    if (!open) return
    api.get(fetchUrl)
      .then(res => setItems(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, fetchUrl])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await api.post(createUrl, createForm)
      const newItem = { id: res.data.id, ...createForm, deleted_at: null } as CatalogItem
      setItems(prev => [...prev, newItem])
      setCreateForm(
        isDiseaseMode
          ? { nombre: "", tipo: "criptogamica", descripcion: "", gravedad: "leve" }
          : { nombre: "", descripcion: "" }
      )
      setShowCreate(false)
    } catch {
      alert(`Error al crear ${singular}`)
    }
  }

  const startEdit = (item: CatalogItem) => {
    setEditingItem(item)
    if (isDiseaseMode && isDisease(item)) {
      setEditForm({ nombre: item.nombre, tipo: item.tipo, descripcion: item.descripcion || "", gravedad: item.gravedad })
    } else {
      setEditForm({ nombre: item.nombre, descripcion: (item as Treatment).descripcion || "" })
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return
    try {
      await api.put(updateUrl(editingItem.id), editForm)
      setItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...editForm } : i))
      setEditingItem(null)
    } catch {
      alert(`Error al actualizar ${singular}`)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(`¿Eliminar este ${singular}?`)) return
    try {
      await api.delete(deleteUrl(id))
      setItems(prev => prev.map(i => i.id === id ? { ...i, deleted_at: new Date().toISOString() } : i))
    } catch {
      alert(`Error al eliminar ${singular}`)
    }
  }

  const handleRestore = async (id: number) => {
    try {
      await api.put(restoreUrl(id))
      setItems(prev => prev.map(i => i.id === id ? { ...i, deleted_at: null } : i))
    } catch {
      alert(`Error al restaurar ${singular}`)
    }
  }

  if (!open) return null

  const active = items.filter(i => !i.deleted_at)
  const deleted = items.filter(i => i.deleted_at)
  const display = showDeleted ? deleted : active

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-slate-800 shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <p className="text-slate-400 text-sm">
              {active.length} {isDiseaseMode ? (active.length === 1 ? "registrada" : "registradas") : (active.length === 1 ? "registrado" : "registrados")}
              {deleted.length > 0 && ` · ${deleted.length} eliminados`}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition text-xl">✕</button>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-slate-700 flex gap-2">
          {canDel && (
            <button
              onClick={() => { setShowCreate(!showCreate); setEditingItem(null) }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              + {newLabel}
            </button>
          )}
          {canSeeDeleted() && deleted.length > 0 && (
            <button
              onClick={() => setShowDeleted(!showDeleted)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                showDeleted ? "bg-amber-600/20 text-amber-400 hover:bg-amber-600/30" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {showDeleted ? `← ${verActivas}` : verEliminadas}
            </button>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && <div className="text-slate-300 text-center">Cargando...</div>}

          {/* Create form */}
          {showCreate && canDel && (
            <form onSubmit={handleCreate} className="bg-slate-700/50 rounded-xl p-4 space-y-3">
              <h3 className="text-white font-semibold">{newLabel}</h3>
              <input
                type="text" placeholder="Nombre" value={createForm.nombre}
                onChange={e => setCreateForm({ ...createForm, nombre: e.target.value })}
                required className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none"
              />
              {isDiseaseMode && (
                <>
                  <select value={createForm.tipo} onChange={e => setCreateForm({ ...createForm, tipo: e.target.value })} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none">
                    {tipoOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select value={createForm.gravedad} onChange={e => setCreateForm({ ...createForm, gravedad: e.target.value })} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none">
                    {gravedadOptions.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </>
              )}
              <textarea
                placeholder="Descripción" value={createForm.descripcion}
                onChange={e => setCreateForm({ ...createForm, descripcion: e.target.value })}
                rows={2} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none resize-none"
              />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold py-2.5 rounded-lg">Crear</button>
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition">Cancelar</button>
              </div>
            </form>
          )}

          {/* Edit form */}
          {editingItem && canDel && (
            <form onSubmit={handleEditSubmit} className="bg-slate-700/50 rounded-xl p-4 space-y-3">
              <h3 className="text-white font-semibold">{editLabel}</h3>
              <input
                type="text" placeholder="Nombre" value={editForm.nombre}
                onChange={e => setEditForm({ ...editForm, nombre: e.target.value })}
                required className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none"
              />
              {isDiseaseMode && (
                <>
                  <select value={editForm.tipo} onChange={e => setEditForm({ ...editForm, tipo: e.target.value })} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none">
                    {tipoOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select value={editForm.gravedad} onChange={e => setEditForm({ ...editForm, gravedad: e.target.value })} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none">
                    {gravedadOptions.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </>
              )}
              <textarea
                placeholder="Descripción" value={editForm.descripcion}
                onChange={e => setEditForm({ ...editForm, descripcion: e.target.value })}
                rows={2} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none resize-none"
              />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold py-2.5 rounded-lg">Guardar</button>
                <button type="button" onClick={() => setEditingItem(null)} className="px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition">Cancelar</button>
              </div>
            </form>
          )}

          {/* Item list */}
          {display.length === 0 ? (
            <div className="bg-slate-800 rounded-xl p-12 text-center">
              <p className="text-slate-400">{showDeleted ? noneDeletedLabel : noneLabel}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {display.map(item => (
                <div
                  key={item.id}
                  className={`rounded-xl p-4 transition space-y-2 ${
                    item.deleted_at
                      ? "bg-slate-800/50 opacity-50 border border-slate-700/50"
                      : "bg-slate-800 hover:border-slate-600 border border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`font-semibold ${item.deleted_at ? "text-slate-500" : "text-white"}`}>{item.nombre}</p>
                      {isDisease(item) && (
                        <span className={`text-xs px-2 py-0.5 rounded capitalize ${item.deleted_at ? "bg-slate-700/50 text-slate-600" : "bg-slate-700 text-slate-400"}`}>
                          {item.tipo}
                        </span>
                      )}
                    </div>
                    {isDisease(item) && (
                      <span className={`text-xs px-2 py-0.5 rounded capitalize ${gravedadColor[item.gravedad]}`}>{item.gravedad}</span>
                    )}
                  </div>
                  {item.descripcion && <p className={`text-sm ${item.deleted_at ? "text-slate-600" : "text-slate-400"}`}>{item.descripcion}</p>}
                  {item.deleted_at && <p className="text-xs text-red-400">{deletedLabel}</p>}
                  <div className="pt-2 border-t border-slate-700/50 flex gap-2">
                    {!item.deleted_at && canDel && (
                      <button onClick={() => startEdit(item)} className="flex-1 text-xs text-blue-400 hover:text-blue-500 transition">✏️ Editar</button>
                    )}
                    {item.deleted_at && canDel && (
                      <button onClick={() => handleRestore(item.id)} className="flex-1 text-xs text-amber-400 hover:text-amber-500 transition">Restaurar</button>
                    )}
                    {!item.deleted_at && canDel && (
                      <button onClick={() => handleDelete(item.id)} className="text-xs text-red-400 hover:text-red-500 transition">🗑️</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function canSeeDeleted(): boolean {
  return localStorage.getItem("role") === "admin"
}
