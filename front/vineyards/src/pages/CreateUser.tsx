import { useState } from "react"

export default function CreateUser() {
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    password: "",
    rol: "operario",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const res = await fetch("http://localhost:3000/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })

    const data = await res.json()

    if (!res.ok) {
      alert(data.message || "Error al crear usuario")
      return
    }

    alert("Usuario creado correctamente ✅")
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Crear usuario</h2>

      <input name="nombre" placeholder="Nombre" onChange={handleChange} />
      <input name="apellido" placeholder="Apellido" onChange={handleChange} />
      <input name="email" placeholder="Email" onChange={handleChange} />
      <input name="password" type="password" placeholder="Contraseña" onChange={handleChange} />

      <select name="rol" onChange={handleChange}>
        <option value="operario">Operario</option>
        <option value="enologo">Enólogo</option>
        <option value="admin">Admin</option>
      </select>

      <button type="submit">Crear</button>
    </form>
  )
}
