import { useEffect, useState } from "react"
import { api } from "../services/api"
import { useNavigate } from "react-router-dom"
import { isAdmin, canDelete } from "../utils/role"

type User = {
  id: number
  nombre: string
  apellido: string
  dni: string
  email: string
  rol: string
  deleted_at: string | null
}

export default function GetUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showDeleted, setShowDeleted] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState({ nombre: "", apellido: "", dni: "", email: "", rol: "", password: "" })
  const navigate = useNavigate()
  const admin = isAdmin()
  const canDel = canDelete()

  useEffect(() => {
    if (!admin) {
      navigate("/profile")
      return
    }
    api.get("/users/getUsers")
      .then(res => setUsers(res.data))
      .catch(() => setError("Error al cargar usuarios"))
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar usuario?")) return
    try {
      await api.delete(`/users/deleteUser/${id}`)
      setUsers(prev => prev.map(u => u.id === id ? { ...u, deleted_at: new Date().toISOString() } : u))
    } catch (err) {
       console.log(err);
    }
  }

  const handleRestore = async (id: number) => {
    try {
      await api.patch(`/users/restoreUser/${id}`)
      setUsers(prev => prev.map(u => u.id === id ? { ...u, deleted_at: null } : u))
    } catch (err) {
      console.log(err)
    }
  }

  const startEdit = (user: User) => {
    setEditingUser(user)
    setEditForm({ nombre: user.nombre, apellido: user.apellido, dni: user.dni, email: user.email, rol: user.rol, password: "" })
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    try {
      const payload: Record<string, string> = {
        nombre: editForm.nombre,
        apellido: editForm.apellido,
        dni: editForm.dni,
        email: editForm.email,
        rol: editForm.rol,
      }
      if (editForm.password) payload.password = editForm.password
      await api.patch(`/users/updateUser/${editingUser.id}`, payload)
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...editForm, password: undefined } : u))
      setEditingUser(null)
    } catch (err: any) {
      alert(err.response?.data?.message || "Error al actualizar")
    }
  }

  const active = users.filter(u => !u.deleted_at)
  const deleted = users.filter(u => u.deleted_at)
  const display = showDeleted ? deleted : active

  if (editingUser) {
    return (
      <div className="w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Editar Usuario</h1>
          <button onClick={() => setEditingUser(null)} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">← Volver</button>
        </div>
        <form onSubmit={handleEditSubmit} className="bg-slate-800 rounded-xl p-6 max-w-md space-y-4">
          <input type="text" name="nombre" placeholder="Nombre" value={editForm.nombre} onChange={e => setEditForm({ ...editForm, nombre: e.target.value })} required className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none" />
          <input type="text" name="apellido" placeholder="Apellido" value={editForm.apellido} onChange={e => setEditForm({ ...editForm, apellido: e.target.value })} required className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none" />
          <input type="text" name="dni" placeholder="DNI" value={editForm.dni} onChange={e => setEditForm({ ...editForm, dni: e.target.value })} required className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none" />
          <input type="email" name="email" placeholder="Email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} required className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none" />
          <input type="password" name="password" placeholder="Nueva contraseña (dejar vacío para no cambiar)" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none" />
          <select name="rol" value={editForm.rol} onChange={e => setEditForm({ ...editForm, rol: e.target.value })} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none">
            <option value="operario">operario</option>
            <option value="enologo">enologo</option>
            <option value="admin">admin</option>
          </select>
          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold py-2.5 rounded-lg">Guardar cambios</button>
        </form>
      </div>
    )
  }

  return (
    <div className="w-full p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">
          Usuarios 👥
        </h1>
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
            onClick={() => navigate("/users/create")}
            className="bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold px-4 py-2 rounded-lg"
          >
            + Nuevo usuario
          </button>
        </div>
      </div>

      {loading && (
        <p className="text-slate-300 text-center">Cargando...</p>
      )}

      {error && (
        <p className="text-red-400 text-sm text-center">{error}</p>
      )}

      {!loading && display.length === 0 && (
        <p className="text-slate-400 text-center">
          {showDeleted ? "No hay usuarios eliminados" : "No hay usuarios cargados"}
        </p>
      )}

      {!loading && display.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {display.map(user => (
            <div
              key={user.id}
              className={`rounded-xl p-4 transition space-y-2 ${
                user.deleted_at
                  ? "bg-slate-800/50 opacity-50 border border-slate-700/50"
                  : "bg-slate-800 hover:bg-slate-700/60 border border-slate-700"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className={`font-semibold ${user.deleted_at ? "text-slate-500" : "text-white"}`}>
                    {user.nombre} {user.apellido}
                  </p>
                  <p className={`text-sm ${user.deleted_at ? "text-slate-600" : "text-slate-400"}`}>{user.email}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                  user.deleted_at ? "bg-slate-700/50 text-slate-600" : "bg-slate-700 text-emerald-400"
                }`}>
                  {user.rol}
                </span>
              </div>
              <div className="text-xs text-slate-500 space-y-1">
                <p>DNI: {user.dni}</p>
                {user.deleted_at && <p className="text-red-400">Eliminado</p>}
              </div>
              <div className="pt-2 border-t border-slate-700/50 flex justify-end gap-2">
                {user.deleted_at && admin && (
                  <button
                    onClick={() => handleRestore(user.id)}
                    className="text-amber-400 hover:text-amber-500 transition text-sm font-medium"
                  >
                    Restaurar
                  </button>
                )}
                {!user.deleted_at && (
                  <button
                    onClick={() => startEdit(user)}
                    className="text-blue-400 hover:text-blue-500 transition text-sm"
                  >
                    ✏️
                  </button>
                )}
                {!user.deleted_at && canDel && (
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="text-red-400 hover:text-red-500 transition text-sm"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
