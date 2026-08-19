import { useEffect, useState } from "react"
import { api } from "../services/api"
import { useNavigate, useParams } from "react-router-dom"
import { isAdmin, canDelete } from "../utils/role"
import { vigorOptions } from "../constants/plantOptions"

type Plant = {
  id: number
  codigo: string | null
  sistema_conduccion: string
  latitud: number | null
  longitud: number | null
  varietal_id: number | null
  varietal_nombre: string | null
  varietal_tipo: string | null
  vine_row_id: number
  row_numero: number
  posicion_en_fila: number | null
  deleted_at: string | null
  vigor: string | null
  tutor: boolean
  fecha_plantacion: string | null
  metodo_propagacion: string | null
  observaciones: string | null
}

type Varietal = {
  id: number
  nombre: string
  tipo: string
}

type VineRow = {
  id: number
  numero: number
  num_plantas_esperadas: number | null
}

const conduccionOptions = ["parral", "espaldera", "vaso", "lira"]
const crecimientoOptions = ["sin_crecimiento", "pequeña", "mediana", "grande"]

export default function Plants() {
  const { plotId, rowId } = useParams()
  const navigate = useNavigate()

  const [plants, setPlants] = useState<Plant[]>([])
  const [rows, setRows] = useState<VineRow[]>([])
  const [varietals, setVarietals] = useState<Varietal[]>([])
  const [loading, setLoading] = useState(true)

  const [mode, setMode] = useState<"list" | "create" | "edit">("list")
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null)
  const [showDeleted, setShowDeleted] = useState(false)
  const [editForm, setEditForm] = useState({ varietal_id: "", sistema_conduccion: "espaldera", codigo: "", latitud: "", longitud: "", vigor: "", tutor: false, fecha_plantacion: "", observaciones: "" })

  const admin = isAdmin()
  const canDel = canDelete()

  const [form, setForm] = useState({
    plantaExiste: true,
    varietal_id: "",
    sistema_conduccion: "espaldera",
    codigo: "",
    latitud: "",
    longitud: "",
    estado_salud: "bueno",
    crecimiento: "mediana",
    tutor: false,
    fecha: new Date().toISOString().split("T")[0],
    observaciones: "",
    vigor: "",
    fecha_plantacion: new Date().toISOString().split("T")[0],
    plantObservaciones: "",
    posicion_en_fila: "",
  })

  const [showPropagation, setShowPropagation] = useState(false)
  const [propagationForm, setPropagationForm] = useState({ metodo: "injerto", portainjerto: "", vivero_origen: "", fecha_plantacion: new Date().toISOString().split("T")[0] })
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get(`/vine-rows/getVineRows?plot_id=${plotId}`),
      api.get(`/plants/getPlants?plot_id=${plotId}`),
    ])
      .then(([rowsRes, plantsRes]) => {
        setRows(rowsRes.data)
        setPlants(plantsRes.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [plotId])

  useEffect(() => {
    api.get(`/plots/getPlot/${plotId}`)
      .then(res => api.get(`/varietals/vineyard/${res.data.vineyard_id}`))
      .then(res => {
        if (res.data.length > 0) setVarietals(res.data)
        else api.get("/varietals").then(r => setVarietals(r.data))
      })
      .catch(() => {})
  }, [plotId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target
    const value = "type" in target && target.type === "checkbox" ? (target as HTMLInputElement).checked : target.value
    setForm({ ...form, [target.name]: value })
  }

  const handleCreatePlant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rowId) return

    const currentRowPlants = plants.filter(p => p.vine_row_id === parseInt(rowId) && !p.deleted_at)
    const computedNextPosition = currentRowPlants.length + 1
    const assignedPos = form.posicion_en_fila ? parseInt(form.posicion_en_fila) : computedNextPosition

    try {
      const plantRes = await api.post("/plants/createPlant", {
        vine_row_id: parseInt(rowId),
        varietal_id: form.plantaExiste && form.varietal_id ? parseInt(form.varietal_id) : null,
        sistema_conduccion: form.plantaExiste ? form.sistema_conduccion : "espaldera",
        codigo: form.codigo || null,
        latitud: form.latitud ? parseFloat(form.latitud) : null,
        longitud: form.longitud ? parseFloat(form.longitud) : null,
        vigor: form.plantaExiste ? (form.vigor || null) : null,
        tutor: form.tutor,
        fecha_plantacion: form.fecha_plantacion || null,
        observaciones: form.plantObservaciones || null,
        posicion_en_fila: assignedPos,
      })

      // Only create status history if plant exists
      if (form.plantaExiste) {
        await api.post("/plants/plantStatus", {
          plant_id: plantRes.data.id,
          estado_salud: form.estado_salud,
          crecimiento: form.crecimiento,
          tutor: form.tutor,
          fecha: form.fecha_plantacion,
          observaciones: form.plantObservaciones || null,
        })
      }

      if (showPropagation && propagationForm.metodo) {
        await api.post("/plant-propagation/create", {
          plant_id: plantRes.data.id,
          metodo: propagationForm.metodo,
          portainjerto: propagationForm.portainjerto || null,
          vivero_origen: propagationForm.vivero_origen || null,
          fecha_plantacion: propagationForm.fecha_plantacion || null,
        })
        setPropagationForm({ metodo: "injerto", portainjerto: "", vivero_origen: "", fecha_plantacion: new Date().toISOString().split("T")[0] })
      }

      const currentRow = rows.find(r => r.id === parseInt(rowId))

      const selectedVarietal = form.varietal_id ? varietals.find(v => v.id === parseInt(form.varietal_id)) : null
      setPlants(prev => [...prev, { ...plantRes.data, varietal_nombre: selectedVarietal?.nombre || null, varietal_tipo: selectedVarietal?.tipo || null, row_numero: currentRow?.numero || 0, posicion_en_fila: assignedPos }])

      setForm({
        ...form,
        plantaExiste: true,
        varietal_id: "",
        codigo: "",
        latitud: "",
        longitud: "",
        estado_salud: "bueno",
        crecimiento: "mediana",
        tutor: false,
        observaciones: "",
        vigor: "",
        fecha_plantacion: new Date().toISOString().split("T")[0],
        plantObservaciones: "",
        posicion_en_fila: "",
      })

      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 1500)
    } catch (err: any) {
      alert(err.response?.data?.message || "Error al crear la planta")
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar esta planta?")) return
    try {
      await api.delete(`/plants/deletePlant/${id}`)
      setPlants(prev => prev.map(p => p.id === id ? { ...p, deleted_at: new Date().toISOString() } : p))
      if (selectedPlant?.id === id) {
        setSelectedPlant(null)
        setMode("list")
      }
    } catch {
      alert("Error al eliminar")
    }
  }

  const handleRestore = async (id: number) => {
    try {
      await api.patch(`/plants/restorePlant/${id}`)
      setPlants(prev => prev.map(p => p.id === id ? { ...p, deleted_at: null } : p))
    } catch {
      alert("Error al restaurar")
    }
  }

  const startEdit = (plant: Plant) => {
    setMode("edit")
    setEditForm({
      varietal_id: plant.varietal_id?.toString() || "",
      sistema_conduccion: plant.sistema_conduccion,
      codigo: plant.codigo || "",
      latitud: plant.latitud?.toString() || "",
      longitud: plant.longitud?.toString() || "",
      vigor: plant.vigor || "",
      tutor: plant.tutor,
      fecha_plantacion: plant.fecha_plantacion || "",
      observaciones: plant.observaciones || "",
    })
    setSelectedPlant(plant)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlant) return
    try {
      await api.patch(`/plants/updatePlant/${selectedPlant.id}`, {
        varietal_id: editForm.varietal_id ? parseInt(editForm.varietal_id) : null,
        sistema_conduccion: editForm.sistema_conduccion,
        codigo: editForm.codigo || null,
        latitud: editForm.latitud ? parseFloat(editForm.latitud) : null,
        longitud: editForm.longitud ? parseFloat(editForm.longitud) : null,
        vigor: editForm.vigor || null,
        tutor: editForm.tutor,
        fecha_plantacion: editForm.fecha_plantacion || null,
        observaciones: editForm.observaciones || null,
      })
      const selectedVarietal = editForm.varietal_id ? varietals.find(v => v.id === parseInt(editForm.varietal_id)) : null
      const updated = { ...selectedPlant, varietal_id: editForm.varietal_id ? parseInt(editForm.varietal_id) : null, varietal_nombre: selectedVarietal?.nombre || null, varietal_tipo: selectedVarietal?.tipo || null, sistema_conduccion: editForm.sistema_conduccion, codigo: editForm.codigo, latitud: editForm.latitud ? parseFloat(editForm.latitud) : null, longitud: editForm.longitud ? parseFloat(editForm.longitud) : null, vigor: editForm.vigor || null, tutor: editForm.tutor, fecha_plantacion: editForm.fecha_plantacion || null, observaciones: editForm.observaciones || null }
      setPlants(prev => prev.map(p => p.id === updated.id ? updated : p))
      setMode("list")
      setSelectedPlant(null)
    } catch (err: any) {
      alert(err.response?.data?.message || "Error al actualizar")
    }
  }

  if (loading) return <div className="w-full p-6 text-slate-300 text-center">Cargando...</div>

  if (mode === "create" && rowId) {
    const currentRow = rows.find(r => r.id === parseInt(rowId))
    const currentRowPlants = plants.filter(p => p.vine_row_id === parseInt(rowId) && !p.deleted_at)
    const nextPosition = currentRowPlants.length + 1
    const totalExpected = currentRow?.num_plantas_esperadas

    return (
      <div className="w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Nueva Planta 🌱</h1>
            <p className="text-slate-400 text-sm">
              Fila #{currentRow?.numero} — Planta #{nextPosition}{totalExpected ? ` de ${totalExpected}` : ''}
            </p>
          </div>
          <button
            onClick={() => { setMode("list"); setForm({ ...form, latitud: "", longitud: "" }) }}
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            ← Volver a la lista
          </button>
        </div>

        <form onSubmit={handleCreatePlant} className="bg-slate-800 rounded-xl p-6 max-w-lg space-y-4">
          {/* ¿Existe la planta? — FIRST field */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/50">
            <input
              type="checkbox"
              name="plantaExiste"
              checked={form.plantaExiste}
              onChange={handleChange}
              className="accent-emerald-500 w-5 h-5"
              id="plantaExiste"
            />
            <label htmlFor="plantaExiste" className="text-white font-medium cursor-pointer">
              {form.plantaExiste ? "✅ Existe la planta" : "❌ No existe la planta"}
            </label>
          </div>

          {/* Plant-specific fields — only if exists */}
          {form.plantaExiste && (
            <>
              <select
                name="varietal_id"
                value={form.varietal_id}
                onChange={handleChange}
                className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none"
              >
                <option value="">Seleccionar varietal</option>
                {varietals.map(v => (
                  <option key={v.id} value={v.id}>{v.nombre} ({v.tipo})</option>
                ))}
              </select>

              {/* Crecimiento (tamaño) — SECOND field */}
              <select
                name="crecimiento"
                value={form.crecimiento}
                onChange={handleChange}
                className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none"
              >
                <option value="">Tamaño de la planta</option>
                {crecimientoOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select
                name="sistema_conduccion"
                value={form.sistema_conduccion}
                onChange={handleChange}
                className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none"
              >
                {conduccionOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select
                name="vigor"
                value={form.vigor}
                onChange={handleChange}
                className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none"
              >
                <option value="">Vigor (opcional)</option>
                {vigorOptions.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </>
          )}

          {/* Location fields — always visible */}
          <div className="grid grid-cols-2 gap-3">
            <input type="date" name="fecha_plantacion" value={form.fecha_plantacion} onChange={handleChange} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none" />
            <input
              type="text"
              name="codigo"
              placeholder="Código"
              value={form.codigo}
              onChange={handleChange}
              className="p-2.5 rounded-lg bg-slate-700 text-white outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              inputMode="decimal"
              name="latitud"
              placeholder="Latitud"
              value={form.latitud}
              onChange={handleChange}
              className="p-2.5 rounded-lg bg-slate-700 text-white outline-none"
            />
            <input
              type="text"
              inputMode="decimal"
              name="longitud"
              placeholder="Longitud"
              value={form.longitud}
              onChange={handleChange}
              className="p-2.5 rounded-lg bg-slate-700 text-white outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-400 shrink-0">Posición en fila</label>
            <input
              type="number"
              name="posicion_en_fila"
              value={nextPosition}
              onChange={handleChange}
              min="1"
              className="w-24 p-2.5 rounded-lg bg-slate-700 text-white outline-none"
            />
            <span className="text-xs text-slate-500">
              {totalExpected ? `(de ${totalExpected})` : '(auto)'}
            </span>
          </div>

          {/* Tutor — always visible */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/50">
            <input
              type="checkbox"
              name="tutor"
              checked={form.tutor}
              onChange={handleChange}
              className="accent-emerald-500 w-5 h-5"
              id="tutor"
            />
            <label htmlFor="tutor" className="text-white font-medium cursor-pointer">
              {form.tutor ? "✅ Tiene tutor" : "❌ Sin tutor"}
            </label>
          </div>

          <textarea
            name="plantObservaciones"
            placeholder="Observaciones (opcional)"
            value={form.plantObservaciones}
            onChange={handleChange}
            rows={2}
            className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none resize-none"
          />

          <button
            type="button"
            onClick={() => setShowPropagation(!showPropagation)}
            className="w-full bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 py-2 rounded-lg text-sm font-medium transition"
          >
            {showPropagation ? "✕ Cerrar método de propagación" : "🌱 ¿Sabes el método de propagación de esta planta?"}
          </button>

          {showPropagation && (
            <div className="space-y-3 pt-2 border-t border-slate-700">
              <h4 className="text-white font-semibold text-sm">Método de propagación</h4>
              <select value={propagationForm.metodo} onChange={e => setPropagationForm({ ...propagationForm, metodo: e.target.value })} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none text-sm">
                <option value="injerto">Injerto</option>
                <option value="estaca">Estaca</option>
                <option value="acodo">Acodo</option>
                <option value="micropropagacion">Micropropagación</option>
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Portainjerto" value={propagationForm.portainjerto} onChange={e => setPropagationForm({ ...propagationForm, portainjerto: e.target.value })} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none text-sm" />
                <input placeholder="Vivero de origen" value={propagationForm.vivero_origen} onChange={e => setPropagationForm({ ...propagationForm, vivero_origen: e.target.value })} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none text-sm" />
              </div>
              <input type="date" value={propagationForm.fecha_plantacion} onChange={e => setPropagationForm({ ...propagationForm, fecha_plantacion: e.target.value })} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none text-sm" />
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold py-2.5 rounded-lg"
          >
            Guardar y continuar a la siguiente planta →
          </button>
        </form>

        {showSuccess && (
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className="bg-emerald-600 rounded-full p-6 animate-bounce shadow-2xl shadow-emerald-500/50">
              <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (mode === "edit" && selectedPlant) {
    return (
      <div className="w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Editar Planta</h1>
          <button onClick={() => { setMode("list"); setSelectedPlant(null) }} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">← Volver</button>
        </div>
        <form onSubmit={handleEditSubmit} className="bg-slate-800 rounded-xl p-6 max-w-lg space-y-4">
          <select name="varietal_id" value={editForm.varietal_id} onChange={e => setEditForm({ ...editForm, varietal_id: e.target.value })} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none">
            <option value="">Sin planta</option>
            {varietals.map(v => <option key={v.id} value={v.id}>{v.nombre} ({v.tipo})</option>)}
          </select>
          <select name="sistema_conduccion" value={editForm.sistema_conduccion} onChange={e => setEditForm({ ...editForm, sistema_conduccion: e.target.value })} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none">
            {conduccionOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select name="vigor" value={editForm.vigor} onChange={e => setEditForm({ ...editForm, vigor: e.target.value })} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none">
            <option value="">Vigor (opcional)</option>
            {vigorOptions.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input type="date" value={editForm.fecha_plantacion} onChange={e => setEditForm({ ...editForm, fecha_plantacion: e.target.value })} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none" />
            <select name="sistema_conduccion" value={editForm.sistema_conduccion} onChange={e => setEditForm({ ...editForm, sistema_conduccion: e.target.value })} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none">
              {conduccionOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-300">Tutor</label>
            <input type="checkbox" checked={editForm.tutor} onChange={e => setEditForm({ ...editForm, tutor: e.target.checked })} className="accent-emerald-500 w-4 h-4" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input type="text" name="codigo" placeholder="Código" value={editForm.codigo} onChange={e => setEditForm({ ...editForm, codigo: e.target.value })} className="p-2.5 rounded-lg bg-slate-700 text-white outline-none" />
            <input type="text" inputMode="decimal" name="latitud" placeholder="Latitud" value={editForm.latitud} onChange={e => setEditForm({ ...editForm, latitud: e.target.value })} className="p-2.5 rounded-lg bg-slate-700 text-white outline-none" />
            <input type="text" inputMode="decimal" name="longitud" placeholder="Longitud" value={editForm.longitud} onChange={e => setEditForm({ ...editForm, longitud: e.target.value })} className="p-2.5 rounded-lg bg-slate-700 text-white outline-none" />
          </div>
          <textarea name="observaciones" placeholder="Observaciones" value={editForm.observaciones} onChange={e => setEditForm({ ...editForm, observaciones: e.target.value })} rows={2} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none resize-none" />
          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold py-2.5 rounded-lg">Guardar cambios</button>
        </form>
      </div>
    )
  }

  const active = plants.filter(p => !p.deleted_at)
  const deleted = plants.filter(p => p.deleted_at)
  const display = showDeleted ? deleted : active

  return (
    <div className="w-full p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Plantas 🌱</h1>
          <p className="text-slate-400 text-sm">
            Parcela #{plotId} — {active.length} plantas
            {admin && deleted.length > 0 && ` · ${deleted.length} eliminadas`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/plots/${plotId}/map`)}
            className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            🗺️ Mapa
          </button>
          {admin && deleted.length > 0 && (
            <button
              onClick={() => setShowDeleted(!showDeleted)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                showDeleted
                  ? "bg-amber-600/20 text-amber-400 hover:bg-amber-600/30"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {showDeleted ? "← Ver activas" : "Ver eliminadas"}
            </button>
          )}
          {rowId && (
            <button
              onClick={() => { setMode("create"); setForm({ ...form, latitud: "", longitud: "" }) }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              + Nueva planta
            </button>
          )}
        </div>
      </div>

      {rows.length > 0 && !rowId && (
        <div className="bg-slate-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-3">Seleccioná una fila para cargar plantas</h3>
          <div className="flex flex-wrap gap-2">
            {rows.map(row => {
              const count = plants.filter(p => p.vine_row_id === row.id && !p.deleted_at).length
              return (
                <button
                  key={row.id}
                  onClick={() => { setMode("create"); navigate(`/plots/${plotId}/rows/${row.id}/plants`) }}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-sm transition"
                >
                  Fila #{row.numero} ({count} plantas)
                </button>
              )
            })}
          </div>
        </div>
      )}

      {display.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-12 text-center">
          <p className="text-slate-400">
            {showDeleted ? "No hay plantas eliminadas" : "No hay plantas registradas."}
          </p>
          {!showDeleted && rowId && (
            <button
              onClick={() => { setMode("create"); setForm({ ...form, latitud: "", longitud: "" }) }}
              className="mt-4 text-emerald-400 hover:text-emerald-300 text-sm transition"
            >
              Crear la primera planta →
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {display.map(plant => (
            <div
              key={plant.id}
              className={`rounded-lg p-3 transition space-y-1 ${
                plant.deleted_at
                  ? "bg-slate-800/50 opacity-50 border border-slate-700/50"
                  : "bg-slate-800 hover:border-slate-600 border border-slate-700"
              }`}
            >
              <div className="flex items-start justify-between">
              <div>
                <p className={`font-medium text-sm ${plant.deleted_at ? "text-slate-500" : "text-white"}`}>{plant.varietal_nombre || "Sin planta"}</p>
                <span className={`text-xs capitalize ${plant.deleted_at ? "text-slate-600" : "text-slate-500"}`}>{plant.varietal_tipo || ""}</span>
              </div>
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  plant.deleted_at ? "bg-slate-700/50 text-slate-600" : "bg-slate-700 text-slate-400"
                }`}>
                  F{plant.row_numero}{plant.posicion_en_fila ? `, P${plant.posicion_en_fila}` : ''}
                </span>
              </div>
              {plant.codigo && <p className={`text-xs ${plant.deleted_at ? "text-slate-600" : "text-slate-500"}`}>Código: {plant.codigo}</p>}
              {plant.deleted_at && <p className="text-xs text-red-400">Eliminada</p>}
              <div className="pt-1 border-t border-slate-700/50 flex gap-1">
                {!plant.deleted_at && (
                  <button
                    onClick={() => navigate(`/plants/${plant.id}`)}
                    className="flex-1 text-xs text-emerald-400 hover:text-emerald-500 transition"
                  >
                    Ver detalle
                  </button>
                )}
                <div className="flex gap-1 ml-auto">
                  {plant.deleted_at && admin && (
                    <button
                      onClick={() => handleRestore(plant.id)}
                      className="text-xs text-amber-400 hover:text-amber-500 transition"
                    >
                      Restaurar
                    </button>
                  )}
                  {!plant.deleted_at && (
                    <button
                      onClick={() => startEdit(plant)}
                      className="text-xs text-blue-400 hover:text-blue-500 transition"
                    >
                      ✏️
                    </button>
                  )}
                  {!plant.deleted_at && canDel && (
                    <button
                      onClick={() => handleDelete(plant.id)}
                      className="text-xs text-red-400 hover:text-red-500 transition"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
