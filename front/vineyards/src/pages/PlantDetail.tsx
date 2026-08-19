import { useEffect, useState, useRef } from "react"
import { api } from "../services/api"
import { useNavigate, useParams } from "react-router-dom"
import { canDelete } from "../utils/role"

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
  plot_id: number
  vigor: string | null
  tutor: boolean
  fecha_plantacion: string | null
  metodo_propagacion: string | null
  observaciones: string | null
}

type Varietal = { id: number; nombre: string; tipo: string }
type PlantStatus = { id: number; estado_salud: string; crecimiento: string; tutor: boolean; fecha: string; observaciones: string }
type PlantDisease = { id: number; fecha_detectado: string; notas: string; enfermedad: string; tipo: string; gravedad: string }
type PlantTreatment = { id: number; fecha_aplicacion: string; resultado: string; tratamiento: string }
type PlantNote = { id: number; nota: string; fecha: string; nombre: string; apellido: string }
type PlantYield = { id: number; fecha: string; cantidad_racimos: number; racimos_pequenos: number; racimos_medianos: number; racimos_grandes: number; observaciones: string }
type PlantPruning = { id: number; tipo_poda: string; intensidad: string; fecha: string; observaciones: string; nombre: string; apellido: string }
type PlantPropagation = { id: number; metodo: string; portainjerto: string; vivero_origen: string; fecha_plantacion: string }
type Disease = { id: number; nombre: string; tipo: string; gravedad: string }
type Treatment = { id: number; nombre: string }
type IrrigationImpact = { id: number; llegada_agua: string; hubo_cortes: boolean; observaciones: string; created_at: string }

type Tab = "status" | "diseases" | "treatments" | "notes" | "yield" | "prunings" | "irrigation"

const estadoColor: Record<string, string> = {
  excelente: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  bueno: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  regular: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  malo: "bg-red-500/20 text-red-400 border-red-500/30",
}

const gravedadColor: Record<string, string> = {
  leve: "bg-yellow-500/20 text-yellow-400",
  moderada: "bg-orange-500/20 text-orange-400",
  grave: "bg-red-500/20 text-red-400",
  critica: "bg-red-700/20 text-red-500",
}

export default function PlantDetail() {
  const { plantId } = useParams()
  const navigate = useNavigate()
  const canDel = canDelete()

  const [plant, setPlant] = useState<Plant | null>(null)
  const [varietals, setVarietals] = useState<Varietal[]>([])
  const [activeTab, setActiveTab] = useState<Tab>("status")
  const [loading, setLoading] = useState(true)

  const [statusHistory, setStatusHistory] = useState<PlantStatus[]>([])
  const [diseases, setDiseases] = useState<PlantDisease[]>([])
  const [treatments, setTreatments] = useState<PlantTreatment[]>([])
  const [notes, setNotes] = useState<PlantNote[]>([])
  const [yields, setYields] = useState<PlantYield[]>([])
  const [prunings, setPrunings] = useState<PlantPruning[]>([])
  const [propagation, setPropagation] = useState<PlantPropagation[]>([])
  const [irrigationImpact, setIrrigationImpact] = useState<IrrigationImpact[]>([])

  const [catalogDiseases, setCatalogDiseases] = useState<Disease[]>([])
  const [catalogTreatments, setCatalogTreatments] = useState<Treatment[]>([])

  const [statusForm, setStatusForm] = useState({ estado_salud: "bueno", crecimiento: "mediana", tutor: false, fecha: new Date().toISOString().split("T")[0], observaciones: "" })
  const [diseaseForm, setDiseaseForm] = useState({ disease_id: "", fecha_detectado: new Date().toISOString().split("T")[0], notas: "" })
  const [treatmentForm, setTreatmentForm] = useState({ treatment_id: "", fecha_aplicacion: new Date().toISOString().split("T")[0], resultado: "" })
  const [treatmentSearch, setTreatmentSearch] = useState("")
  const [showTreatmentDropdown, setShowTreatmentDropdown] = useState(false)
  const [noteForm, setNoteForm] = useState({ nota: "" })
  const [yieldForm, setYieldForm] = useState({ fecha: new Date().toISOString().split("T")[0], cantidad_racimos: "", racimos_pequenos: "0", racimos_medianos: "0", racimos_grandes: "0", observaciones: "" })
  const [pruningForm, setPruningForm] = useState({ tipo_poda: "formacion", intensidad: "corta", fecha: new Date().toISOString().split("T")[0], observaciones: "" })
  const [propagationForm, setPropagationForm] = useState({ metodo: "injerto", portainjerto: "", vivero_origen: "", fecha_plantacion: new Date().toISOString().split("T")[0] })
  const [irrigationForm, setIrrigationForm] = useState({ llegada_agua: "media", hubo_cortes: false, observaciones: "" })
  const [diseaseTypeFilter, setDiseaseTypeFilter] = useState("")

  const [showReplaceVarietal, setShowReplaceVarietal] = useState(false)
  const [varietalSearch, setVarietalSearch] = useState("")
  const [showVarietalDropdown, setShowVarietalDropdown] = useState(false)
  const varietalDropdownRef = useRef<HTMLDivElement>(null)
  const treatmentDropdownRef = useRef<HTMLDivElement>(null)

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "status", label: "Estado", icon: "🩺" },
    { key: "diseases", label: "Enfermedades", icon: "🦠" },
    { key: "treatments", label: "Tratamientos", icon: "💊" },
    { key: "notes", label: "Notas", icon: "📝" },
    { key: "yield", label: "Rendimiento", icon: "🍇" },
    { key: "prunings", label: "Podas", icon: "✂️" },
    { key: "irrigation", label: "Riego", icon: "💧" },
  ]

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (treatmentDropdownRef.current && !treatmentDropdownRef.current.contains(e.target as Node)) {
        setShowTreatmentDropdown(false)
      }
      if (varietalDropdownRef.current && !varietalDropdownRef.current.contains(e.target as Node)) {
        setShowVarietalDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  useEffect(() => {
    api.get(`/plants/getPlant/${plantId}`)
      .then(res => {
        setPlant(res.data)
      })
      .catch(() => {})

    api.get("/varietals")
      .then(res => setVarietals(res.data))
      .catch(() => {})

    Promise.all([
      api.get(`/plant-status/getHistory/${plantId}`),
      api.get(`/plant-diseases/getPlantDiseases/${plantId}`),
      api.get(`/plant-treatments/getPlantTreatments/${plantId}`),
      api.get(`/plant-notes/getPlantNotes/${plantId}`),
      api.get(`/plant-yield/getPlantYield/${plantId}`),
      api.get(`/plant-prunings/getPlantPrunings/${plantId}`),
      api.get(`/plant-propagation/getPlantPropagation/${plantId}`),
      api.get(`/irrigation-event-impact/getIrrigationEventImpact/${plantId}`),
      api.get("/diseases/getDiseases"),
      api.get("/treatments/getTreatments"),
    ])
      .then(([status, diseases, treatments, notes, yld, prun, prop, irr, catDis, catTrt]) => {
        setStatusHistory(status.data)
        setDiseases(diseases.data)
        setTreatments(treatments.data)
        setNotes(notes.data)
        setYields(yld.data)
        setPrunings(prun.data)
        setPropagation(prop.data)
        setIrrigationImpact(irr.data)
        setCatalogDiseases(catDis.data)
        setCatalogTreatments(catTrt.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [plantId])

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.patch(`/plants/plantStatus/${plantId}`, statusForm)
      const res = await api.get(`/plant-status/getHistory/${plantId}`)
      setStatusHistory(res.data)
      setStatusForm({ estado_salud: "bueno", crecimiento: "mediana", tutor: false, fecha: new Date().toISOString().split("T")[0], observaciones: "" })
    } catch (err: any) {
      alert(err.response?.data?.message || "Error")
    }
  }

  const handleDiseaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post("/plant-diseases/create", { plant_id: parseInt(plantId!), disease_id: parseInt(diseaseForm.disease_id), fecha_detectado: diseaseForm.fecha_detectado, notas: diseaseForm.notas || null })
      const res = await api.get(`/plant-diseases/getPlantDiseases/${plantId}`)
      setDiseases(res.data)
      setDiseaseForm({ disease_id: "", fecha_detectado: new Date().toISOString().split("T")[0], notas: "" })
    } catch (err: any) {
      alert(err.response?.data?.message || "Error")
    }
  }

  const handleTreatmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post("/plant-treatments/create", { plant_id: parseInt(plantId!), treatment_id: parseInt(treatmentForm.treatment_id), fecha_aplicacion: treatmentForm.fecha_aplicacion, resultado: treatmentForm.resultado || null })
      const res = await api.get(`/plant-treatments/getPlantTreatments/${plantId}`)
      setTreatments(res.data)
      setTreatmentForm({ treatment_id: "", fecha_aplicacion: new Date().toISOString().split("T")[0], resultado: "" })
    } catch (err: any) {
      alert(err.response?.data?.message || "Error")
    }
  }

  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post("/plant-notes/create", { plant_id: parseInt(plantId!), nota: noteForm.nota })
      const res = await api.get(`/plant-notes/getPlantNotes/${plantId}`)
      setNotes(res.data)
      setNoteForm({ nota: "" })
    } catch (err: any) {
      alert(err.response?.data?.message || "Error")
    }
  }

  const handleYieldSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post("/plant-yield/create", { plant_id: parseInt(plantId!), fecha: yieldForm.fecha, cantidad_racimos: parseInt(yieldForm.cantidad_racimos), racimos_pequenos: parseInt(yieldForm.racimos_pequenos), racimos_medianos: parseInt(yieldForm.racimos_medianos), racimos_grandes: parseInt(yieldForm.racimos_grandes), observaciones: yieldForm.observaciones || null })
      const res = await api.get(`/plant-yield/getPlantYield/${plantId}`)
      setYields(res.data)
      setYieldForm({ fecha: new Date().toISOString().split("T")[0], cantidad_racimos: "", racimos_pequenos: "0", racimos_medianos: "0", racimos_grandes: "0", observaciones: "" })
    } catch (err: any) {
      alert(err.response?.data?.message || "Error")
    }
  }

  const handlePruningSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post("/plant-prunings/create", { plant_id: parseInt(plantId!), tipo_poda: pruningForm.tipo_poda, intensidad: pruningForm.intensidad, fecha: pruningForm.fecha, observaciones: pruningForm.observaciones || null })
      const res = await api.get(`/plant-prunings/getPlantPrunings/${plantId}`)
      setPrunings(res.data)
      setPruningForm({ tipo_poda: "formacion", intensidad: "corta", fecha: new Date().toISOString().split("T")[0], observaciones: "" })
    } catch (err: any) {
      alert(err.response?.data?.message || "Error")
    }
  }

  const handlePropagationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post("/plant-propagation/create", { plant_id: parseInt(plantId!), metodo: propagationForm.metodo, portainjerto: propagationForm.portainjerto || null, vivero_origen: propagationForm.vivero_origen || null, fecha_plantacion: propagationForm.fecha_plantacion || null })
      const res = await api.get(`/plant-propagation/getPlantPropagation/${plantId}`)
      setPropagation(res.data)
      setPropagationForm({ metodo: "injerto", portainjerto: "", vivero_origen: "", fecha_plantacion: new Date().toISOString().split("T")[0] })
      setShowReplaceVarietal(false)
    } catch (err: any) {
      alert(err.response?.data?.message || "Error")
    }
  }

  const handleIrrigationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post("/irrigation-event-impact/create", { plant_id: parseInt(plantId!), llegada_agua: irrigationForm.llegada_agua, hubo_cortes: irrigationForm.hubo_cortes, observaciones: irrigationForm.observaciones || null })
      const res = await api.get(`/irrigation-event-impact/getIrrigationEventImpact/${plantId}`)
      setIrrigationImpact(res.data)
      setIrrigationForm({ llegada_agua: "media", hubo_cortes: false, observaciones: "" })
    } catch (err: any) {
      alert(err.response?.data?.message || "Error")
    }
  }

  const handleDeleteDisease = async (id: number) => {
    if (!confirm("¿Eliminar?")) return
    await api.delete(`/plant-diseases/delete/${id}`)
    const res = await api.get(`/plant-diseases/getPlantDiseases/${plantId}`)
    setDiseases(res.data)
  }

  const handleDeleteTreatment = async (id: number) => {
    if (!confirm("¿Eliminar?")) return
    await api.delete(`/plant-treatments/delete/${id}`)
    const res = await api.get(`/plant-treatments/getPlantTreatments/${plantId}`)
    setTreatments(res.data)
  }

  const handleDeleteNote = async (id: number) => {
    if (!confirm("¿Eliminar?")) return
    await api.delete(`/plant-notes/delete/${id}`)
    const res = await api.get(`/plant-notes/getPlantNotes/${plantId}`)
    setNotes(res.data)
  }

  const handleDeleteYield = async (id: number) => {
    if (!confirm("¿Eliminar?")) return
    await api.delete(`/plant-yield/delete/${id}`)
    const res = await api.get(`/plant-yield/getPlantYield/${plantId}`)
    setYields(res.data)
  }

  const handleDeletePruning = async (id: number) => {
    if (!confirm("¿Eliminar?")) return
    await api.delete(`/plant-prunings/delete/${id}`)
    const res = await api.get(`/plant-prunings/getPlantPrunings/${plantId}`)
    setPrunings(res.data)
  }

  const handleDeletePropagation = async (id: number) => {
    if (!confirm("¿Eliminar?")) return
    await api.delete(`/plant-propagation/delete/${id}`)
    const res = await api.get(`/plant-propagation/getPlantPropagation/${plantId}`)
    setPropagation(res.data)
  }

  const handleDeleteIrrigationImpact = async (id: number) => {
    if (!confirm("¿Eliminar?")) return
    await api.delete(`/irrigation-event-impact/delete/${id}`)
    const res = await api.get(`/irrigation-event-impact/getIrrigationEventImpact/${plantId}`)
    setIrrigationImpact(res.data)
  }

  const handleReplaceVarietal = async (newVarietalId: number) => {
    if (!plant) return
    try {
      await api.patch(`/plants/updatePlant/${plant.id}`, { varietal_id: newVarietalId })
      const newVarietal = varietals.find(v => v.id === newVarietalId)
      const updated = { ...plant, varietal_id: newVarietalId, varietal_nombre: newVarietal?.nombre || null, varietal_tipo: newVarietal?.tipo || null }
      setPlant(updated)
      setVarietalSearch("")
      setShowVarietalDropdown(false)
    } catch (err: any) {
      alert(err.response?.data?.message || "Error")
    }
  }

  if (loading) return <div className="w-full p-6 text-slate-300 text-center">Cargando...</div>
  if (!plant) return <div className="w-full p-6 text-red-400 text-center">Planta no encontrada</div>

  return (
    <div className="w-full p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Detalle de Planta 🌱</h1>
          <p className="text-slate-400 text-sm">
            {plant.varietal_nombre || "Sin planta"} · Fila {plant.row_numero}
            {plant.codigo && ` · ${plant.codigo}`}
          </p>
          <div className="flex gap-2 mt-1 flex-wrap">
            {plant.vigor && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-600/30 text-slate-300">{plant.vigor}</span>
            )}
            {plant.tutor && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-600/30 text-slate-300">Con tutor</span>
            )}
            {plant.fecha_plantacion && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-600/30 text-slate-300">{new Date(plant.fecha_plantacion).toLocaleDateString("es-AR")}</span>
            )}
            {plant.metodo_propagacion && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-600/30 text-slate-300 capitalize">{plant.metodo_propagacion}</span>
            )}
          </div>
          {plant.observaciones && (
            <p className="text-xs text-slate-500 mt-1">{plant.observaciones}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowReplaceVarietal(!showReplaceVarietal); setVarietalSearch(""); setShowVarietalDropdown(false) }} className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-4 py-2 rounded-lg text-sm font-medium transition">
            🔄 Reemplazar varietal / Propagación
          </button>
          <button onClick={() => navigate(-1)} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            ← Volver
          </button>
        </div>
      </div>

      {showReplaceVarietal && (
        <div className="bg-slate-800 rounded-xl p-5 space-y-4">
          <div className="space-y-3">
            <h3 className="text-white font-semibold">Cambiar varietal</h3>
            <p className="text-xs text-slate-400">Seleccioná un nuevo varietal para reemplazar el actual</p>
            <div className="relative" ref={varietalDropdownRef}>
              <input
                type="text"
                placeholder="Buscar varietal..."
                value={varietalSearch}
                onChange={e => { setVarietalSearch(e.target.value); setShowVarietalDropdown(true) }}
                onFocus={() => setShowVarietalDropdown(true)}
                className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none text-sm"
              />
              {showVarietalDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-slate-700 rounded-lg shadow-lg border border-slate-600 max-h-48 overflow-auto">
                  {varietals
                    .filter(v => v.nombre.toLowerCase().includes(varietalSearch.toLowerCase()) || v.tipo.toLowerCase().includes(varietalSearch.toLowerCase()))
                    .map(v => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => { handleReplaceVarietal(v.id); setVarietalSearch(""); setShowVarietalDropdown(false) }}
                        className={`w-full text-left px-3 py-2 text-sm transition ${v.id === plant.varietal_id ? "bg-emerald-600/30 text-emerald-400" : "text-white hover:bg-slate-600"}`}
                      >
                        {v.nombre} <span className="text-xs text-slate-400">({v.tipo})</span>
                      </button>
                    ))}
                  {varietals.filter(v => v.nombre.toLowerCase().includes(varietalSearch.toLowerCase()) || v.tipo.toLowerCase().includes(varietalSearch.toLowerCase())).length === 0 && (
                    <p className="px-3 py-2 text-sm text-slate-400">Sin resultados</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-700 pt-4 space-y-3">
            <h3 className="text-white font-semibold">Método de propagación</h3>
            <p className="text-xs text-slate-400">Registrá el método usado (injerto, estaca, etc.)</p>
            <form onSubmit={handlePropagationSubmit} className="space-y-3 max-w-lg">
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
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold py-2 rounded-lg text-sm">Registrar propagación</button>
            </form>
            {propagation.length > 0 && (
              <div className="space-y-2 pt-2">
                <h4 className="text-white font-semibold text-sm">Historial</h4>
                {propagation.map(p => (
                  <div key={p.id} className="bg-slate-700/50 rounded-lg p-3 flex items-start justify-between">
                    <div className="space-y-1">
                      <span className="text-sm text-white capitalize">{p.metodo}</span>
                      {p.portainjerto && <p className="text-xs text-slate-400">Portainjerto: {p.portainjerto}</p>}
                      {p.vivero_origen && <p className="text-xs text-slate-400">Vivero: {p.vivero_origen}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {p.fecha_plantacion && <span className="text-xs text-slate-500">{new Date(p.fecha_plantacion).toLocaleDateString("es-AR")}</span>}
                      {canDel && <button onClick={() => handleDeletePropagation(p.id)} className="text-xs text-red-400 hover:text-red-500">🗑️</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {plant.varietal_id === null && (
        <div className="bg-slate-800 rounded-xl p-5 space-y-3">
          <h3 className="text-white font-semibold">Esta celda no tiene planta registrada</h3>
          <p className="text-sm text-slate-400">Asigná un varietal para comenzar a registrar datos de esta planta.</p>
          <button
            onClick={() => { setShowReplaceVarietal(!showReplaceVarietal); setVarietalSearch(""); setShowVarietalDropdown(false) }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Asignar varietal →
          </button>
        </div>
      )}

      <div className="bg-slate-800 rounded-xl p-2 flex flex-wrap gap-1">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-3 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab.key ? "bg-emerald-600 text-white" : "text-slate-400 hover:bg-slate-700 hover:text-white"}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "status" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-white font-semibold">Registrar nuevo estado</h3>
            <form onSubmit={handleStatusSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <select value={statusForm.estado_salud} onChange={e => setStatusForm({ ...statusForm, estado_salud: e.target.value })} className="p-2.5 rounded-lg bg-slate-700 text-white outline-none text-sm">
                  {["excelente", "bueno", "regular", "malo"].map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                <select value={statusForm.crecimiento} onChange={e => setStatusForm({ ...statusForm, crecimiento: e.target.value })} className="p-2.5 rounded-lg bg-slate-700 text-white outline-none text-sm">
                  {["sin_crecimiento", "pequeña", "mediana", "grande"].map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-slate-300">Tutor</label>
                <input type="checkbox" checked={statusForm.tutor} onChange={e => setStatusForm({ ...statusForm, tutor: e.target.checked })} className="accent-emerald-500 w-4 h-4" />
              </div>
              <input type="date" value={statusForm.fecha} onChange={e => setStatusForm({ ...statusForm, fecha: e.target.value })} required className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none text-sm" />
              <textarea placeholder="Observaciones" value={statusForm.observaciones} onChange={e => setStatusForm({ ...statusForm, observaciones: e.target.value })} rows={2} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none text-sm resize-none" />
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold py-2 rounded-lg text-sm">Registrar estado</button>
            </form>
          </div>
          <div className="bg-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-white font-semibold">Historial de estados</h3>
            {statusHistory.length === 0 ? <p className="text-slate-400 text-sm">Sin registros</p> : (
              <div className="space-y-2">
                {statusHistory.map((s, idx) => (
                  <div key={s.id} className="bg-slate-700/50 rounded-lg p-3 flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {idx === statusHistory.length - 1 && <span className="text-xs bg-emerald-600/30 text-emerald-400 px-1.5 py-0.5 rounded font-medium">Inicial</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${estadoColor[s.estado_salud]}`}>{s.estado_salud}</span>
                        <span className="text-xs text-slate-400 capitalize">{s.crecimiento}</span>
                        {s.tutor && <span className="text-xs bg-slate-600 text-slate-300 px-1.5 py-0.5 rounded">tutor</span>}
                      </div>
                      {s.observaciones && <p className="text-xs text-slate-400">{s.observaciones}</p>}
                    </div>
                    <span className="text-xs text-slate-500 shrink-0 ml-3">{new Date(s.fecha).toLocaleDateString("es-AR")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "diseases" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-white font-semibold">Registrar enfermedad</h3>
            <form onSubmit={handleDiseaseSubmit} className="space-y-3">
              <div className="flex gap-2">
                <select value={diseaseTypeFilter} onChange={e => { setDiseaseTypeFilter(e.target.value); setDiseaseForm({ ...diseaseForm, disease_id: "" }) }} className="flex-1 p-2.5 rounded-lg bg-slate-700 text-white outline-none text-sm">
                  <option value="">Todos los tipos</option>
                  <option value="criptogamica">Criptogámica</option>
                  <option value="plaga">Plaga</option>
                  <option value="virus">Virus</option>
                  <option value="carencia_nutricional">Carencia nutricional</option>
                </select>
              </div>
              <select value={diseaseForm.disease_id} onChange={e => setDiseaseForm({ ...diseaseForm, disease_id: e.target.value })} required className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none text-sm">
                <option value="">Seleccionar enfermedad</option>
                {catalogDiseases
                  .filter(d => !diseaseTypeFilter || d.tipo === diseaseTypeFilter)
                  .map(d => <option key={d.id} value={d.id}>{d.nombre} — {d.gravedad}</option>)}
              </select>
              <input type="date" value={diseaseForm.fecha_detectado} onChange={e => setDiseaseForm({ ...diseaseForm, fecha_detectado: e.target.value })} required className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none text-sm" />
              <textarea placeholder="Notas" value={diseaseForm.notas} onChange={e => setDiseaseForm({ ...diseaseForm, notas: e.target.value })} rows={2} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none text-sm resize-none" />
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold py-2 rounded-lg text-sm">Registrar</button>
            </form>
          </div>
          <div className="bg-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-white font-semibold">Historial</h3>
            {diseases.length === 0 ? <p className="text-slate-400 text-sm">Sin registros</p> : (
              <div className="space-y-2">
                {diseases.map(d => (
                  <div key={d.id} className="bg-slate-700/50 rounded-lg p-3 flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white">{d.enfermedad}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${gravedadColor[d.gravedad]}`}>{d.gravedad}</span>
                      </div>
                      <p className="text-xs text-slate-500">Detectada: {new Date(d.fecha_detectado).toLocaleDateString("es-AR")}</p>
                      {d.notas && <p className="text-xs text-slate-400">{d.notas}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {canDel && <button onClick={() => handleDeleteDisease(d.id)} className="text-xs text-red-400 hover:text-red-500">🗑️</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "treatments" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-white font-semibold">Registrar tratamiento</h3>
            <form onSubmit={handleTreatmentSubmit} className="space-y-3">
              <div className="relative" ref={treatmentDropdownRef}>
                <input
                  type="text"
                  placeholder="Buscar tratamiento..."
                  value={treatmentForm.treatment_id ? catalogTreatments.find(t => t.id === parseInt(treatmentForm.treatment_id))?.nombre || "" : treatmentSearch}
                  onChange={e => {
                    setTreatmentSearch(e.target.value)
                    setTreatmentForm({ ...treatmentForm, treatment_id: "" })
                    setShowTreatmentDropdown(true)
                  }}
                  onFocus={() => setShowTreatmentDropdown(true)}
                  className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none text-sm"
                />
                {showTreatmentDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-slate-700 rounded-lg shadow-lg border border-slate-600 max-h-40 overflow-auto">
                    {catalogTreatments
                      .filter(t => t.nombre.toLowerCase().includes((treatmentForm.treatment_id ? catalogTreatments.find(tt => tt.id === parseInt(treatmentForm.treatment_id))?.nombre || treatmentSearch : treatmentSearch).toLowerCase()))
                      .map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setTreatmentForm({ ...treatmentForm, treatment_id: t.id.toString() })
                            setTreatmentSearch("")
                            setShowTreatmentDropdown(false)
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-white hover:bg-slate-600 transition"
                        >
                          {t.nombre}
                        </button>
                      ))}
                    {catalogTreatments.filter(t => t.nombre.toLowerCase().includes((treatmentForm.treatment_id ? catalogTreatments.find(tt => tt.id === parseInt(treatmentForm.treatment_id))?.nombre || treatmentSearch : treatmentSearch).toLowerCase())).length === 0 && (
                      <p className="px-3 py-2 text-sm text-slate-400">Sin resultados</p>
                    )}
                  </div>
                )}
              </div>
              <input type="date" value={treatmentForm.fecha_aplicacion} onChange={e => setTreatmentForm({ ...treatmentForm, fecha_aplicacion: e.target.value })} required className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none text-sm" />
              <textarea placeholder="Resultado" value={treatmentForm.resultado} onChange={e => setTreatmentForm({ ...treatmentForm, resultado: e.target.value })} rows={2} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none text-sm resize-none" />
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold py-2 rounded-lg text-sm">Registrar</button>
            </form>
          </div>
          <div className="bg-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-white font-semibold">Historial</h3>
            {treatments.length === 0 ? <p className="text-slate-400 text-sm">Sin registros</p> : (
              <div className="space-y-2">
                {treatments.map(t => (
                  <div key={t.id} className="bg-slate-700/50 rounded-lg p-3 flex items-start justify-between">
                    <div className="space-y-1">
                      <span className="text-sm text-white">{t.tratamiento}</span>
                      <p className="text-xs text-slate-500">Aplicado: {new Date(t.fecha_aplicacion).toLocaleDateString("es-AR")}</p>
                      {t.resultado && <p className="text-xs text-slate-400">{t.resultado}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {canDel && <button onClick={() => handleDeleteTreatment(t.id)} className="text-xs text-red-400 hover:text-red-500">🗑️</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "notes" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-white font-semibold">Nueva nota</h3>
            <form onSubmit={handleNoteSubmit} className="space-y-3">
              <textarea placeholder="Escribir nota..." value={noteForm.nota} onChange={e => setNoteForm({ nota: e.target.value })} rows={4} required className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none text-sm resize-none" />
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold py-2 rounded-lg text-sm">Guardar nota</button>
            </form>
          </div>
          <div className="bg-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-white font-semibold">Notas</h3>
            {notes.length === 0 ? <p className="text-slate-400 text-sm">Sin notas</p> : (
              <div className="space-y-2">
                {notes.map(n => (
                  <div key={n.id} className="bg-slate-700/50 rounded-lg p-3 flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-white">{n.nota}</p>
                      <p className="text-xs text-slate-500">{n.nombre} {n.apellido}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-xs text-slate-500">{new Date(n.fecha).toLocaleDateString("es-AR")}</span>
                      {canDel && <button onClick={() => handleDeleteNote(n.id)} className="text-xs text-red-400 hover:text-red-500">🗑️</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "yield" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-white font-semibold">Registrar rendimiento</h3>
            <form onSubmit={handleYieldSubmit} className="space-y-3">
              <input type="date" value={yieldForm.fecha} onChange={e => setYieldForm({ ...yieldForm, fecha: e.target.value })} required className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none text-sm" />
              <input type="number" placeholder="Cantidad de racimos" value={yieldForm.cantidad_racimos} onChange={e => setYieldForm({ ...yieldForm, cantidad_racimos: e.target.value })} required min="0" className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none text-sm" />
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Racimos pequeños</label>
                  <input type="number" placeholder="0" value={yieldForm.racimos_pequenos} onChange={e => setYieldForm({ ...yieldForm, racimos_pequenos: e.target.value })} min="0" className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Racimos medianos</label>
                  <input type="number" placeholder="0" value={yieldForm.racimos_medianos} onChange={e => setYieldForm({ ...yieldForm, racimos_medianos: e.target.value })} min="0" className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Racimos grandes</label>
                  <input type="number" placeholder="0" value={yieldForm.racimos_grandes} onChange={e => setYieldForm({ ...yieldForm, racimos_grandes: e.target.value })} min="0" className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none text-sm" />
                </div>
              </div>
              <textarea placeholder="Observaciones" value={yieldForm.observaciones} onChange={e => setYieldForm({ ...yieldForm, observaciones: e.target.value })} rows={2} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none text-sm resize-none" />
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold py-2 rounded-lg text-sm">Registrar</button>
            </form>
          </div>
          <div className="bg-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-white font-semibold">Historial</h3>
            {yields.length === 0 ? <p className="text-slate-400 text-sm">Sin registros</p> : (
              <div className="space-y-2">
                {yields.map(y => (
                  <div key={y.id} className="bg-slate-700/50 rounded-lg p-3 flex items-start justify-between">
                    <div className="space-y-1">
                      <span className="text-sm text-white">{y.cantidad_racimos} racimos</span>
                      <p className="text-xs text-slate-400">P: {y.racimos_pequenos} · M: {y.racimos_medianos} · G: {y.racimos_grandes}</p>
                      {y.observaciones && <p className="text-xs text-slate-400">{y.observaciones}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-xs text-slate-500">{new Date(y.fecha).toLocaleDateString("es-AR")}</span>
                      {canDel && <button onClick={() => handleDeleteYield(y.id)} className="text-xs text-red-400 hover:text-red-500">🗑️</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "prunings" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-white font-semibold">Registrar poda</h3>
            <form onSubmit={handlePruningSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <select value={pruningForm.tipo_poda} onChange={e => setPruningForm({ ...pruningForm, tipo_poda: e.target.value })} className="p-2.5 rounded-lg bg-slate-700 text-white outline-none text-sm">
                  {["formacion", "mantenimiento", "produccion", "sanitaria", "renovacion"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={pruningForm.intensidad} onChange={e => setPruningForm({ ...pruningForm, intensidad: e.target.value })} className="p-2.5 rounded-lg bg-slate-700 text-white outline-none text-sm">
                  {["corta", "mixta", "larga"].map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <input type="date" value={pruningForm.fecha} onChange={e => setPruningForm({ ...pruningForm, fecha: e.target.value })} required className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none text-sm" />
              <textarea placeholder="Observaciones" value={pruningForm.observaciones} onChange={e => setPruningForm({ ...pruningForm, observaciones: e.target.value })} rows={2} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none text-sm resize-none" />
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold py-2 rounded-lg text-sm">Registrar</button>
            </form>
          </div>
          <div className="bg-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-white font-semibold">Historial</h3>
            {prunings.length === 0 ? <p className="text-slate-400 text-sm">Sin registros</p> : (
              <div className="space-y-2">
                {prunings.map(p => (
                  <div key={p.id} className="bg-slate-700/50 rounded-lg p-3 flex items-start justify-between">
                    <div className="space-y-1">
                      <span className="text-sm text-white capitalize">{p.tipo_poda}</span>
                      <span className="text-xs text-slate-400 ml-2 capitalize">{p.intensidad}</span>
                      {p.nombre && <p className="text-xs text-slate-500">por {p.nombre} {p.apellido}</p>}
                      {p.observaciones && <p className="text-xs text-slate-400">{p.observaciones}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-xs text-slate-500">{new Date(p.fecha).toLocaleDateString("es-AR")}</span>
                      {canDel && <button onClick={() => handleDeletePruning(p.id)} className="text-xs text-red-400 hover:text-red-500">🗑️</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "irrigation" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-white font-semibold">Registrar impacto de riego</h3>
            <form onSubmit={handleIrrigationSubmit} className="space-y-3">
              <select value={irrigationForm.llegada_agua} onChange={e => setIrrigationForm({ ...irrigationForm, llegada_agua: e.target.value })} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none text-sm">
                {["nada", "poco", "media", "mucha"].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <div className="flex items-center gap-3">
                <label className="text-sm text-slate-300">Hubo cortes</label>
                <input type="checkbox" checked={irrigationForm.hubo_cortes} onChange={e => setIrrigationForm({ ...irrigationForm, hubo_cortes: e.target.checked })} className="accent-emerald-500 w-4 h-4" />
              </div>
              <textarea placeholder="Observaciones" value={irrigationForm.observaciones} onChange={e => setIrrigationForm({ ...irrigationForm, observaciones: e.target.value })} rows={2} className="w-full p-2.5 rounded-lg bg-slate-700 text-white outline-none text-sm resize-none" />
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold py-2 rounded-lg text-sm">Registrar</button>
            </form>
          </div>
          <div className="bg-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-white font-semibold">Historial</h3>
            {irrigationImpact.length === 0 ? <p className="text-slate-400 text-sm">Sin registros</p> : (
              <div className="space-y-2">
                {irrigationImpact.map(i => (
                  <div key={i.id} className="bg-slate-700/50 rounded-lg p-3 flex items-start justify-between">
                    <div className="space-y-1">
                      <span className="text-sm text-white capitalize">Llegada: {i.llegada_agua}</span>
                      {i.hubo_cortes && <span className="text-xs bg-red-600/30 text-red-400 px-1.5 py-0.5 rounded ml-2">cortes</span>}
                      {i.observaciones && <p className="text-xs text-slate-400">{i.observaciones}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-xs text-slate-500">{new Date(i.created_at).toLocaleDateString("es-AR")}</span>
                      {canDel && <button onClick={() => handleDeleteIrrigationImpact(i.id)} className="text-xs text-red-400 hover:text-red-500">🗑️</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
