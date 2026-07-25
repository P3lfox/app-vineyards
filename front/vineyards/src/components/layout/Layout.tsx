import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { isAdmin } from "../../utils/role"

const navItems = [
  { to: "/", label: "Dashboard", icon: "📊" },
  { to: "/vineyards", label: "Viñedos", icon: "🍇" },
  { to: "/plots", label: "Parcelas", icon: "🗺️" },
  { to: "/harvests", label: "Cosechas", icon: "🌾" },
  { to: "/tasks", label: "Tareas", icon: "✅" },
  { to: "/sanidad", label: "Sanidad", icon: "🏥" },
  { to: "/prunings", label: "Podas", icon: "✂️" },
  { to: "/irrigation-systems", label: "Riego", icon: "💧" },
]

export default function Layout() {
  const navigate = useNavigate()
  const admin = isAdmin()
  const role = localStorage.getItem("role") ?? "operario"

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("role")
    localStorage.removeItem("userId")
    navigate("/login")
  }

  return (
    <div className="flex min-h-screen bg-slate-900 text-white">
      <aside className="w-64 bg-slate-800 flex flex-col shadow-xl">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold text-emerald-400">🍇 Viñedos</h1>
          <p className="text-xs text-slate-400 mt-1 capitalize">Rol: {role}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-emerald-600 text-white"
                    : "text-slate-300 hover:bg-slate-700 hover:text-white"
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          {admin && (
            <NavLink
              to="/users"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-emerald-600 text-white"
                    : "text-slate-300 hover:bg-slate-700 hover:text-white"
                }`
              }
            >
              <span>👥</span>
              Usuarios
            </NavLink>
          )}

          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-emerald-600 text-white"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`
            }
          >
            <span>👤</span>
            Mi Perfil
          </NavLink>
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-red-600/20 hover:text-red-400 transition-all"
          >
            <span>🚪</span> Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
