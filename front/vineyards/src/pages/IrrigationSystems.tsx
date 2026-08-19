import { useEffect, useState } from "react"
import { api } from "../services/api"

type IrrigationSystem = {
  id: number
  tipo: string
  descripcion: string | null
}

export default function IrrigationSystems() {
  const [systems, setSystems] = useState<IrrigationSystem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get("/irrigation-systems/getIrrigationSystems")
      .then(res => setSystems(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="w-full p-6 text-slate-300 text-center">Cargando...</div>

  return (
    <div className="w-full p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Sistemas de Riego 💧</h1>
        <p className="text-slate-400 text-sm">
          {systems.length} tipos disponibles
        </p>
      </div>

      {systems.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-12 text-center">
          <p className="text-slate-400">No hay sistemas de riego registrados.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {systems.map(s => (
            <div key={s.id} className="rounded-xl p-4 bg-slate-800 border border-slate-700 space-y-2">
              <p className="font-semibold capitalize text-white">{s.tipo}</p>
              {s.descripcion && <p className="text-sm text-slate-400">{s.descripcion}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
