import { useEffect, useState } from "react"
import { api } from "../services/api"

type User = {
  id: number
  nombre: string
  apellido: string
  dni: string
  email: string
  rol: string
}

export default function Profile() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ nombre: "", apellido: "", dni: "", email: "", password: "" })

  useEffect(() => {
    api.get("/users/me")
      .then(res => {
        setUser(res.data)
        setForm({ nombre: res.data.nombre, apellido: res.data.apellido, dni: res.data.dni, email: res.data.email, password: "" })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    try {
      const payload: Record<string, string> = {
        nombre: form.nombre,
        apellido: form.apellido,
        dni: form.dni,
        email: form.email,
      }
      if (form.password) payload.password = form.password
      await api.patch(`/users/updateUser/${user.id}`, payload)
      alert("Perfil actualizado ✅")
      setForm({ ...form, password: "" })
    } catch (err: any) {
      alert(err.response?.data?.message || "Error al actualizar")
    }
  }

  if (loading) return <div className="w-full p-6 text-slate-300 text-center">Cargando...</div>
  if (!user) return <div className="w-full p-6 text-red-400 text-center">Error al cargar perfil</div>

  return (
    <div className="w-full p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Mi Perfil 👤</h1>

      <form onSubmit={handleSubmit} className="bg-slate-800 rounded-xl p-6 max-w-md space-y-4">
        <input type="text" name="nombre" placeholder="Nombre" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none" />
        <input type="text" name="apellido" placeholder="Apellido" value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} required className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none" />
        <input type="text" name="dni" placeholder="DNI" value={form.dni} onChange={e => setForm({ ...form, dni: e.target.value })} required className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none" />
        <input type="email" name="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none" />
        <input type="password" name="password" placeholder="Nueva contraseña (dejar vacío para no cambiar)" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none" />

        <div className="bg-slate-700/50 rounded-lg p-3">
          <p className="text-xs text-slate-400">Rol</p>
          <p className="text-sm text-white capitalize">{user.rol}</p>
        </div>

        <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold py-2.5 rounded-lg">Guardar cambios</button>
      </form>
    </div>
  )
}
