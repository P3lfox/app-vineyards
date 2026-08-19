import { useEffect, useState } from "react"
import { api } from "../services/api"
import { useNavigate } from "react-router-dom"

type Stats = {
  totalVineyards: number
  totalPlots: number
  totalHarvests: number
  pendingTasks: number
  totalUsers: number
  lastHarvest?: string
}

type RecentTask = {
  id: number
  descripcion: string
  estado: "pendiente" | "en_progreso" | "completada"
  parcela?: string
  fecha: string
}

const estadoColor: Record<string, string> = {
  pendiente: "bg-yellow-500/20 text-yellow-400",
  en_progreso: "bg-blue-500/20 text-blue-400",
  completada: "bg-emerald-500/20 text-emerald-400",
}

const estadoLabel: Record<string, string> = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  completada: "Completada",
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [tasks, setTasks] = useState<RecentTask[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // Ajustá estos endpoints a los que ya tenés en tu back
    Promise.all([
      api.get("/stats").catch(() => ({ data: null })),
      api.get("/tasks/getTasks").catch(() => ({ data: [] })),
    ]).then(([statsRes, tasksRes]) => {
      setStats(statsRes.data)
      setTasks((tasksRes.data ?? []).slice(0, 5))
      setLoading(false)
    })
  }, [])

  const statCards = [
    {
      label: "Viñedos",
      value: stats?.totalVineyards ?? "—",
      icon: "🍇",
      color: "from-emerald-600/30 to-emerald-600/5",
      accent: "text-emerald-400",
      action: () => navigate("/vineyards"),
    },
    {
      label: "Parcelas",
      value: stats?.totalPlots ?? "—",
      icon: "🗺️",
      color: "from-sky-600/30 to-sky-600/5",
      accent: "text-sky-400",
      action: () => navigate("/plots"),
    },
    {
      label: "Cosechas",
      value: stats?.totalHarvests ?? "—",
      icon: "🌾",
      color: "from-amber-600/30 to-amber-600/5",
      accent: "text-amber-400",
      action: () => navigate("/harvests"),
    },
    {
      label: "Tareas pendientes",
      value: stats?.pendingTasks ?? "—",
      icon: "✅",
      color: "from-violet-600/30 to-violet-600/5",
      accent: "text-violet-400",
      action: () => navigate("/tasks"),
    },
    {
      label: "Usuarios",
      value: stats?.totalUsers ?? "—",
      icon: "👥",
      color: "from-rose-600/30 to-rose-600/5",
      accent: "text-rose-400",
      action: () => navigate("/users"),
    },
  ]

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">Resumen general del sistema</p>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-slate-800 rounded-2xl p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {statCards.map((card) => (
            <button
              key={card.label}
              onClick={card.action}
              className={`bg-gradient-to-br ${card.color} bg-slate-800 border border-slate-700 rounded-2xl p-5 text-left hover:scale-105 transition-transform cursor-pointer`}
            >
              <div className="text-2xl mb-2">{card.icon}</div>
              <div className={`text-3xl font-bold ${card.accent}`}>{card.value}</div>
              <div className="text-slate-400 text-sm mt-1">{card.label}</div>
            </button>
          ))}
        </div>
      )}

      {/* Recent tasks */}
      <div className="bg-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Tareas recientes</h2>
          <button
            onClick={() => navigate("/tasks")}
            className="text-emerald-400 text-sm hover:text-emerald-300 transition"
          >
            Ver todas →
          </button>
        </div>

        {tasks.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">No hay tareas registradas</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between bg-slate-700/40 rounded-xl px-4 py-3"
              >
                <div>
                  <p className="text-white text-sm font-medium">{task.descripcion}</p>
                  {task.parcela && (
                    <p className="text-slate-400 text-xs mt-0.5">Parcela: {task.parcela}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 text-xs">{task.fecha}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${estadoColor[task.estado]}`}>
                    {estadoLabel[task.estado]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="bg-slate-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Acciones rápidas</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate("/vineyards/create")}
            className="bg-emerald-600 hover:bg-emerald-700 transition text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            + Nuevo viñedo
          </button>
          <button
            onClick={() => navigate("/harvests/create")}
            className="bg-amber-600 hover:bg-amber-700 transition text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            + Registrar cosecha
          </button>
          <button
            onClick={() => navigate("/tasks/create")}
            className="bg-violet-600 hover:bg-violet-700 transition text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            + Nueva tarea
          </button>
          <button
            onClick={() => navigate("/users/create")}
            className="bg-slate-700 hover:bg-slate-600 transition text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            + Nuevo usuario
          </button>
        </div>
      </div>
    </div>
  )
}
