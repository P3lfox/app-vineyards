import { useEffect, useState } from "react"
import { api } from "../services/api"
import { useNavigate } from "react-router-dom"

export default function CreateVineyard() {
  const [data, setData] = useState({ nombre: "", ubicacion: "" })
  const [varietals, setVarietals] = useState([])
  const [selected, setSelected] = useState([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get("/varietals")
      .then(res => setVarietals(res.data))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value })
  }

  const toggleVarietal = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post("/vineyard/createVineyard", {
        ...data,
        varietal_ids: selected
      })
      alert("Viñedo creado 🍇")
      navigate("/vineyards")
    } catch (err) {
      console.error(err)
      alert("Error al crear el viñedo")
    }
  }

  const filtered = varietals.filter(v =>
    v.nombre.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="w-full p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Crear Viñedo 🍇</h1>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <input
          type="text"
          name="nombre"
          placeholder="Nombre del viñedo"
          value={data.nombre}
          onChange={handleChange}
          required
          className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none"
        />
        <input
          type="text"
          name="ubicacion"
          placeholder="Ubicación"
          value={data.ubicacion}
          onChange={handleChange}
          required
          className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none"
        />

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Varietales ({selected.length} seleccionados)</label>
          <input
            type="text"
            placeholder="Buscar varietal..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none text-sm"
          />
          <div className="bg-slate-800 rounded-lg max-h-64 overflow-y-auto border border-slate-700">
            {loading ? (
              <p className="p-3 text-slate-400 text-sm">Cargando...</p>
            ) : filtered.length === 0 ? (
              <p className="p-3 text-slate-400 text-sm">Sin resultados</p>
            ) : (
              filtered.map(v => (
                <label
                  key={v.id}
                  className={`flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-slate-700/50 transition border-b border-slate-700/50 last:border-0 ${
                    selected.includes(v.id) ? "bg-emerald-600/20" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(v.id)}
                    onChange={() => toggleVarietal(v.id)}
                    className="accent-emerald-500"
                  />
                  <span className="text-white">{v.nombre}</span>
                  <span className="text-slate-500 text-xs ml-auto capitalize">{v.tipo}</span>
                </label>
              ))
            )}
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold py-2.5 rounded-lg"
        >
          Crear viñedo
        </button>
      </form>
    </div>
  )
}
