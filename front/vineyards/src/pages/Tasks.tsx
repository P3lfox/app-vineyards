import { useEffect, useState } from "react"
import { api } from "../services/api"
import { useParams } from "react-router-dom"

type Assignee = {
  id: number
  nombre: string
  apellido: string
  rol: string
}

type Task = {
  id: number
  descripcion: string
  estado: "pendiente" | "en_progreso" | "completada"
  fecha_limite?: string
  plot_id?: number
  parcela?: string
  asignados?: Assignee[]
  completed_at?: string
  deleted_at?: string
}

type UserOption = {
  id: number
  nombre: string
  apellido: string
  rol: string
}

type Plot = {
  id: number
  nombre: string
  variedad: string
}

type CurrentUser = {
  id: number
  role: string
}

const estadoConfig = {
  pendiente: {
    label: "Pendiente",
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    dot: "bg-yellow-400",
  },
  en_progreso: {
    label: "En progreso",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    dot: "bg-blue-400",
  },
  completada: {
    label: "Completada",
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-400",
  },
}

const columns: Array<Task["estado"]> = ["pendiente", "en_progreso", "completada"]

// --- Helpers ---

/**
 * Extract current user from JWT stored in localStorage.
 */
const getCurrentUser = (): CurrentUser | null => {
  try {
    const token = localStorage.getItem("token")
    if (!token) return null
    const payload = JSON.parse(atob(token.split(".")[1]))
    return { id: payload.id, role: payload.role }
  } catch {
    return null
  }
}

/**
 * Returns true if user is admin OR is assigned to the task.
 */
const canUserModifyTask = (task: Task, usuario: CurrentUser | null): boolean => {
  if (!usuario) return false
  if (usuario.role === "admin") return true
  return task.asignados?.some((a) => a.id === usuario.id) ?? false
}

/**
 * Compute countdown string for completed tasks.
 * Returns "se eliminará en Xh Ym" if < 2h, "pendiente de eliminación" if >= 2h, null if no completed_at.
 */
const timeUntilAutoDelete = (completedAt?: string): string | null => {
  if (!completedAt) return null
  const completed = new Date(completedAt).getTime()
  const now = Date.now()
  const diffMs = now - completed
  const twoHoursMs = 2 * 60 * 60 * 1000

  if (diffMs >= twoHoursMs) return "pendiente de eliminación"

  const remaining = twoHoursMs - diffMs
  const hours = Math.floor(remaining / (60 * 60 * 1000))
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000))

  if (hours > 0) return `se eliminará en ${hours}h ${minutes}m`
  return `se eliminará en ${minutes}m`
}

export default function Tasks() {
  const { plotId } = useParams()
  const [tasks, setTasks] = useState<Task[]>([])
  const [plots, setPlots] = useState<Plot[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    descripcion: "",
    estado: "pendiente",
    fecha_limite: "",
    plot_id: plotId ?? "",
    asignado_a_ids: [] as number[],
  })

  // Edit modal state
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editForm, setEditForm] = useState({
    descripcion: "",
    fecha_limite: "",
    asignado_a_ids: [] as number[],
  })
  const [showEditModal, setShowEditModal] = useState(false)

  // Admin toggle for deleted tasks
  const [includeDeleted, setIncludeDeleted] = useState(false)

  // Drag-and-drop state
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null)
  const [dropTarget, setDropTarget] = useState<Task["estado"] | null>(null)

  // Current user
  const usuario = getCurrentUser()

  useEffect(() => {
    const params = new URLSearchParams()
    if (plotId) params.set("plot_id", plotId)
    if (includeDeleted && usuario?.role === "admin") params.set("include_deleted", "1")
    const queryString = params.toString()
    const endpoint = `/tasks/getTasks${queryString ? `?${queryString}` : ""}`
    Promise.all([
      api.get(endpoint),
      api.get("/plots/getPlots"),
      api.get("/users/active"),
    ])
      .then(([taskRes, plotRes, userRes]) => {
        setTasks(taskRes.data)
        setPlots(plotRes.data)
        setUsers(userRes.data)
      })
      .finally(() => setLoading(false))
  }, [plotId, includeDeleted, usuario?.role])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleUserToggle = (userId: number) => {
    setForm((prev) => {
      const isSelected = prev.asignado_a_ids.includes(userId)
      return {
        ...prev,
        asignado_a_ids: isSelected
          ? prev.asignado_a_ids.filter((id) => id !== userId)
          : [...prev.asignado_a_ids, userId],
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        descripcion: form.descripcion,
        estado: form.estado,
        fecha_limite: form.fecha_limite,
        plot_id: form.plot_id ? parseInt(form.plot_id) : undefined,
        asignado_a_ids: form.asignado_a_ids,
      }
      const res = await api.post("/tasks/createTask", payload)
      setTasks((prev) => [res.data, ...prev])
      setShowForm(false)
      setForm({ descripcion: "", estado: "pendiente", fecha_limite: "", plot_id: plotId ?? "", asignado_a_ids: [] })
    } catch {
      alert("Error al crear la tarea")
    }
  }

  const handleEstadoChange = async (id: number, nuevoEstado: Task["estado"]) => {
    try {
      const res = await api.post(`/tasks/transitionTask/${id}`, { estado: nuevoEstado })
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...res.data } : t))
      )
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Error al actualizar estado"
      alert(message)
    }
  }

  const handleEditOpen = (task: Task) => {
    setEditingTask(task)
    setEditForm({
      descripcion: task.descripcion,
      fecha_limite: task.fecha_limite ?? "",
      asignado_a_ids: task.asignados?.map((a) => a.id) ?? [],
    })
    setShowEditModal(true)
  }

  const handleEditClose = () => {
    setShowEditModal(false)
    setEditingTask(null)
  }

  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value })
  }

  const handleEditUserToggle = (userId: number) => {
    setEditForm((prev) => {
      const isSelected = prev.asignado_a_ids.includes(userId)
      return {
        ...prev,
        asignado_a_ids: isSelected
          ? prev.asignado_a_ids.filter((id) => id !== userId)
          : [...prev.asignado_a_ids, userId],
      }
    })
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTask) return
    try {
      const payload = {
        descripcion: editForm.descripcion,
        fecha_limite: editForm.fecha_limite,
        asignado_a_ids: editForm.asignado_a_ids,
      }
      const res = await api.patch(`/tasks/updateTask/${editingTask.id}`, payload)
      setTasks((prev) =>
        prev.map((t) => (t.id === editingTask.id ? { ...t, ...res.data } : t))
      )
      handleEditClose()
    } catch {
      alert("Error al editar la tarea")
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar esta tarea?")) return
    try {
      await api.delete(`/tasks/deleteTask/${id}`)
      setTasks((prev) => prev.filter((t) => t.id !== id))
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Error al eliminar"
      alert(message)
    }
  }

  // --- Drag-and-drop handlers ---

  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData("text/plain", String(taskId))
    e.dataTransfer.effectAllowed = "move"
    setDraggedTaskId(taskId)
  }

  const handleDragOver = (e: React.DragEvent, estado: Task["estado"]) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDropTarget(estado)
  }

  const handleDragLeave = () => {
    setDropTarget(null)
  }

  const handleDrop = async (e: React.DragEvent, targetEstado: Task["estado"]) => {
    e.preventDefault()
    setDropTarget(null)
    const taskId = parseInt(e.dataTransfer.getData("text/plain"))
    if (isNaN(taskId)) return

    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.estado === targetEstado) return

    const canModify = canUserModifyTask(task, usuario)
    if (!canModify) {
      alert("No tienes permiso para mover esta tarea")
      return
    }

    // Check role transition rules
    if (usuario?.role !== "admin" && usuario?.role !== "enologo") {
      // Operario: only pendiente → en_progreso
      if (!(task.estado === "pendiente" && targetEstado === "en_progreso")) {
        alert("Solo puedes mover tareas de Pendiente a En progreso")
        return
      }
    }

    try {
      const res = await api.post(`/tasks/transitionTask/${taskId}`, { estado: targetEstado })
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...res.data } : t))
      )
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Error al mover la tarea"
      alert(message)
    } finally {
      setDraggedTaskId(null)
    }
  }

  const handleDragEnd = () => {
    setDraggedTaskId(null)
    setDropTarget(null)
  }

  const tasksByEstado = (estado: Task["estado"]) =>
    tasks.filter((t) => t.estado === estado)

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Tareas ✅</h1>
          <p className="text-slate-400 mt-1">
            {plotId ? `Parcela #${plotId}` : "Todas las tareas"} · {tasks.length} total
          </p>
        </div>
        <div className="flex items-center gap-3">
          {usuario?.role === "admin" && (
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeDeleted}
                onChange={(e) => setIncludeDeleted(e.target.checked)}
                className="accent-violet-500"
              />
              Ver eliminadas
            </label>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-violet-600 hover:bg-violet-700 transition text-white font-semibold px-5 py-2.5 rounded-xl"
          >
            {showForm ? "Cancelar" : "+ Nueva tarea"}
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Nueva tarea</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <textarea
              name="descripcion"
              placeholder="Descripción de la tarea"
              value={form.descripcion}
              onChange={handleChange}
              required
              rows={2}
              className="p-2.5 rounded-lg bg-slate-700 text-white outline-none sm:col-span-2 resize-none"
            />
            <input
              type="date"
              name="fecha_limite"
              value={form.fecha_limite}
              onChange={handleChange}
              className="p-2.5 rounded-lg bg-slate-700 text-white outline-none"
            />

            {/* Multi-select for assignees */}
            <div className="sm:col-span-2">
              <label className="text-sm text-slate-300 mb-1 block">Asignar a</label>
              <div className="bg-slate-700 rounded-lg p-2 max-h-40 overflow-y-auto space-y-1">
                {users.map((u) => {
                  const selected = form.asignado_a_ids.includes(u.id)
                  return (
                    <label
                      key={u.id}
                      className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition ${
                        selected ? "bg-violet-600/30" : "hover:bg-slate-600/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => handleUserToggle(u.id)}
                        className="accent-violet-500"
                      />
                      <span className="text-white text-sm">
                        {u.nombre} {u.apellido}
                      </span>
                      <span className="text-xs text-slate-400 ml-auto">({u.rol})</span>
                    </label>
                  )
                })}
              </div>
            </div>

            {!plotId && (
              <select
                name="plot_id"
                value={form.plot_id}
                onChange={handleChange}
                className="p-2.5 rounded-lg bg-slate-700 text-white outline-none"
              >
                <option value="">Sin parcela asignada</option>
                {plots.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} — {p.variedad}
                  </option>
                ))}
              </select>
            )}
            <select
              name="estado"
              value={form.estado}
              onChange={handleChange}
              className="p-2.5 rounded-lg bg-slate-700 text-white outline-none"
            >
              <option value="pendiente">Pendiente</option>
              <option value="en_progreso">En progreso</option>
              <option value="completada">Completada</option>
            </select>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="w-full bg-violet-600 hover:bg-violet-700 transition text-white font-semibold py-2.5 rounded-lg"
              >
                Crear tarea
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-slate-800 rounded-2xl p-4 animate-pulse h-48" />
          ))}
        </div>
      )}

      {/* Kanban */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map((estado) => {
            const cfg = estadoConfig[estado]
            const col = tasksByEstado(estado)
            const isDropTarget = dropTarget === estado
            return (
              <div
                key={estado}
                className={`bg-slate-800 rounded-2xl p-4 space-y-3 transition-all ${
                  isDropTarget ? "ring-2 ring-violet-500/50 bg-slate-800/80" : ""
                }`}
                onDragOver={(e) => handleDragOver(e, estado)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, estado)}
              >
                {/* Column header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <h2 className="text-white font-semibold text-sm">{cfg.label}</h2>
                  <span className="ml-auto bg-slate-700 text-slate-400 text-xs px-2 py-0.5 rounded-full">
                    {col.length}
                  </span>
                </div>

                {col.length === 0 && (
                  <p className="text-slate-500 text-xs text-center py-6">Sin tareas</p>
                )}

                {col.map((task) => {
                  const canModify = canUserModifyTask(task, usuario)
                  const isDeleted = !!task.deleted_at
                  const countdown = timeUntilAutoDelete(task.completed_at)
                  const isDragging = draggedTaskId === task.id
                  return (
                  <div
                    key={task.id}
                    draggable={canModify && !isDeleted}
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                    className={`bg-slate-700/50 rounded-xl p-3 space-y-2 border border-slate-700 hover:border-slate-600 transition ${
                      isDeleted ? "opacity-50" : ""
                    } ${
                      canModify && !isDeleted ? "cursor-grab active:cursor-grabbing" : ""
                    } ${
                      isDragging ? "opacity-40 scale-95" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-white text-sm flex-1">{task.descripcion}</p>
                      {canModify && !isDeleted && (
                        <button
                          onClick={() => handleEditOpen(task)}
                          className="text-xs px-2 py-1 bg-slate-600/50 hover:bg-slate-600 text-slate-300 rounded-lg transition shrink-0"
                          title="Editar"
                        >
                          ✏️
                        </button>
                      )}
                    </div>

                    {/* Phase 4: Poda badge */}
                    {task.descripcion.startsWith("Poda —") && (
                      <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                        ✂️ Poda
                      </span>
                    )}

                    {task.parcela && (
                      <p className="text-xs text-slate-400">🗺️ {task.parcela}</p>
                    )}
                    {task.asignados && task.asignados.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {task.asignados.map((a) => (
                          <span
                            key={a.id}
                            className="text-xs bg-violet-600/30 text-violet-300 px-2 py-0.5 rounded-full"
                          >
                            {a.nombre} {a.apellido}
                          </span>
                        ))}
                      </div>
                    )}
                    {task.fecha_limite && (
                      <p className="text-xs text-slate-400">
                        📅 {new Date(task.fecha_limite).toLocaleDateString("es-AR")}
                      </p>
                    )}

                    {/* Countdown badge for completed tasks */}
                    {countdown && (
                      <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                        ⏱️ {countdown}
                      </span>
                    )}

                    {/* Move buttons — only if user can modify */}
                    {canModify && !isDeleted && (
                      <div className="flex gap-1 pt-1">
                        {columns
                          .filter((e) => {
                            // Operario can only transition pendiente → en_progreso
                            if (usuario?.role !== "admin" && usuario?.role !== "enologo") {
                              return task.estado === "pendiente" && e === "en_progreso"
                            }
                            return e !== task.estado
                          })
                          .map((nextEstado) => (
                            <button
                              key={nextEstado}
                              onClick={() => handleEstadoChange(task.id, nextEstado)}
                              className={`flex-1 text-xs py-1 rounded-lg transition border ${estadoConfig[nextEstado].color}`}
                            >
                              → {estadoConfig[nextEstado].label}
                            </button>
                          ))}
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="text-xs px-2 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingTask && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-lg space-y-4">
            <h2 className="text-lg font-semibold text-white">Editar tarea</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <textarea
                name="descripcion"
                placeholder="Descripción de la tarea"
                value={editForm.descripcion}
                onChange={handleEditChange}
                required
                rows={3}
                className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none resize-none"
              />
              <input
                type="date"
                name="fecha_limite"
                value={editForm.fecha_limite}
                onChange={handleEditChange}
                className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none"
              />

              {/* Multi-select for assignees */}
              <div>
                <label className="text-sm text-slate-300 mb-1 block">Asignar a</label>
                <div className="bg-slate-700 rounded-lg p-2 max-h-40 overflow-y-auto space-y-1">
                  {users.map((u) => {
                    const selected = editForm.asignado_a_ids.includes(u.id)
                    return (
                      <label
                        key={u.id}
                        className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition ${
                          selected ? "bg-violet-600/30" : "hover:bg-slate-600/50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => handleEditUserToggle(u.id)}
                          className="accent-violet-500"
                        />
                        <span className="text-white text-sm">
                          {u.nombre} {u.apellido}
                        </span>
                        <span className="text-xs text-slate-400 ml-auto">({u.rol})</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleEditClose}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 transition text-white font-semibold py-2.5 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-violet-600 hover:bg-violet-700 transition text-white font-semibold py-2.5 rounded-lg"
                >
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
