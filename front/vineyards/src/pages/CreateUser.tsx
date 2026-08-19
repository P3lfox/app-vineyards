import { useState } from "react"
import { api } from "../services/api"
import { useNavigate } from "react-router-dom"

export default function CreateUser() {
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    dni:"",
    email: "",
    password: "",
    rol: "operario",
    password1: ""
  })
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if(form.password != form.password1){
      alert("Las contraseñas no son iguales!")
      return
    }
    try {
      await api.post("/users/createUser", form)
      alert("Usuario creado correctamente ✅")
      navigate("/users")
    } catch (e) {
      console.log(e)
    }
  }

  return (
    <div className="w-full flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="bg-slate-800 p-8 rounded-2xl shadow-lg w-full max-w-sm space-y-4"
      >
        <h1 className="text-2xl font-bold text-white text-center">
          Crear Usuario
        </h1>

        <input
          type="text"
          placeholder="Nombre"
          name="nombre"
          className="w-full p-2 rounded bg-slate-700 text-white outline-none"
          onChange={handleChange}
        />

        <input
          type="text"
          placeholder="Apellido"
          name="apellido"
          className="w-full p-2 rounded bg-slate-700 text-white outline-none"
          onChange={handleChange}
        />

        <input
          type="number"
          placeholder="DNI"
          name="dni"
          maxLength={8}
          className="w-full p-2 rounded bg-slate-700 text-white outline-none"
          onChange={handleChange}
        />

        <input
          type="text"
          placeholder="Email"
          name="email"
          className="w-full p-2 rounded bg-slate-700 text-white outline-none"
          onChange={handleChange}
        />

        <input
          type="password"
          placeholder="Contraseña"
          name="password"
          className="w-full p-2 rounded bg-slate-700 text-white outline-none"
          onChange={handleChange}
        />

        <input
          type="password"
          placeholder="Repetir contraseña"
          name="password1"
          className="w-full p-2 rounded bg-slate-700 text-white outline-none"
          onChange={handleChange}
        />

        <select name="rol" onChange={handleChange} className="w-full p-2 rounded bg-slate-700 text-white outline-none">
          <option value="operario">operario</option>
          <option value="enologo">enologo</option>
          <option value="admin">admin</option>
        </select>

        <button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold py-2 rounded"
        >
          Crear
        </button>
      </form>
    </div>
  )
}
