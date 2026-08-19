import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "../services/api"

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    api
      .post("/auth/login", { email, password })
      .then((res) => {
        localStorage.setItem("token", res.data.token)
        localStorage.setItem("role", res.data.user.rol)
        localStorage.setItem("userId", res.data.user.id)
        navigate("/")
      })
      .catch(() => {
        setError("Credenciales inválidas")
      })
  }

  return (
    <div className="min-h-screen w-screen lex items-center justify-center bg-slate-900 flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="bg-slate-800 p-8 rounded-2xl shadow-lg w-full max-w-sm space-y-4 "
      >
        <h1 className="text-2xl font-bold text-white text-center">
          Iniciar sesión 🍇
        </h1>

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 rounded bg-slate-700 text-white outline-none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Contraseña"
          className="w-full p-2 rounded bg-slate-700 text-white outline-none"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold py-2 rounded"
        >
          Entrar
        </button>
      </form>
    </div>
  )
}
