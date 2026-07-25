import { useEffect, useState } from "react"
import { api } from "../services/api"
import { varietalBadgeColor } from "../constants/varietalColors"

type Plant = {
  id: number
  codigo?: string | null
  varietal_nombre: string
  varietal_tipo: string
  row_numero?: number
  parcela_id?: number
}

type Disease = {
  id: number
  nombre: string
  tipo: string
  descripcion: string | null
  gravedad: string
}

type Treatment = {
  id: number
  nombre: string
  descripcion: string | null
}

type PlantDisease = {
  id: number
  fecha_detectado: string
  notas: string | null
  enfermedad: string
  tipo: string
  gravedad: string
}

type PlantTreatment = {
  id: number
  fecha_aplicacion: string
  resultado: string | null
  tratamiento: string
}

const gravedadColor: Record<string, string> = {
  leve: "bg-yellow-500/20 text-yellow-400",
  moderada: "bg-orange-500/20 text-orange-400",
  grave: "bg-red-500/20 text-red-400",
  critica: "bg-red-700/20 text-red-500",
}

interface PlantHealthModalProps {
  plant: Plant
  mode: "disease" | "treatment"
  diseases: Disease[]
  treatments: Treatment[]
  onClose: () => void
  onNavigate: (path: string) => void
  onCatalogOpen: () => void
}

export default function PlantHealthModal({
  plant,
  mode,
  diseases,
  treatments,
  onClose,
  onNavigate,
  onCatalogOpen,
}: PlantHealthModalProps) {
  const isDiseaseMode = mode === "disease"

  const [history, setHistory] = useState<PlantDisease[] | PlantTreatment[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [quickForm, setQuickForm] = useState<Record<string, string>>(
    isDiseaseMode
      ? { disease_id: "", fecha_detectado: new Date().toISOString().split("T")[0], notas: "" }
      : { treatment_id: "", fecha_aplicacion: new Date().toISOString().split("T")[0], resultado: "" }
  )
  const [submitting, setSubmitting] = useState(false)

  const catalogItems = isDiseaseMode ? diseases : treatments
  const historyUrl = isDiseaseMode
    ? `/plant-diseases/getPlantDiseases/${plant.id}`
    : `/plant-treatments/getPlantTreatments/${plant.id}`
  const createUrl = isDiseaseMode ? "/plant-diseases/create" : "/plant-treatments/create"

  const singular = isDiseaseMode ? "enfermedad" : "tratamiento"
  const dateField = isDiseaseMode ? "fecha_detectado" : "fecha_aplicacion"
  const catalogField = isDiseaseMode ? "disease_id" : "treatment_id"
  const notesField = isDiseaseMode ? "notas" : "resultado"
  const notesLabel = isDiseaseMode ? "Notas" : "Resultado"
  const noneHistory = isDiseaseMode
    ? "No hay enfermedades registradas para esta planta."
    : "No hay tratamientos registrados para esta planta."

  useEffect(() => {
    setLoadingHistory(true)
    api.get(historyUrl)
      .then(res => setHistory(res.data))
      .catch(() => {})
      .finally(() => setLoadingHistory(false))
  }, [plant.id, historyUrl])

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickForm[catalogField]) return

    setSubmitting(true)
    try {
      await api.post(createUrl, {
        plant_id: plant.id,
        [catalogField]: parseInt(quickForm[catalogField]),
        [dateField]: quickForm[dateField],
        [notesField]: quickForm[notesField] || null,
      })
      // Refresh history
      const res = await api.get(historyUrl)
      setHistory(res.data)
      // Reset form
      setQuickForm(
        isDiseaseMode
          ? { disease_id: "", fecha_detectado: new Date().toISOString().split("T")[0], notas: "" }
          : { treatment_id: "", fecha_aplicacion: new Date().toISOString().split("T")[0], resultado: "" }
      )
    } catch {
      alert(`Error al registrar ${singular}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
        <div
          className="bg-slate-800 rounded-xl max-w-lg w-full mx-4 max-h-[90vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-700 flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-lg font-bold text-white">
                {plant.codigo || `Planta #${plant.id}`}
              </h3>
              <p className="text-slate-400 text-sm">
                {plant.varietal_nombre}
                {plant.row_numero !== undefined && ` · Fila ${plant.row_numero}`}
              </p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition text-xl">✕</button>
          </div>

          {/* Varietal badge */}
          <div className="px-4 pt-3 shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded capitalize ${
              varietalBadgeColor[plant.varietal_tipo] || "bg-slate-600/30 text-slate-400"
            }`}>
              {plant.varietal_tipo}
            </span>
          </div>

          {/* Quick-add form */}
          <form onSubmit={handleQuickAdd} className="px-4 pt-3 pb-2 shrink-0 space-y-2">
            <h4 className="text-sm font-semibold text-white">
              Registrar {isDiseaseMode ? "enfermedad" : "tratamiento"}
            </h4>
            <div className="flex gap-2">
              <select
                value={quickForm[catalogField]}
                onChange={e => setQuickForm({ ...quickForm, [catalogField]: e.target.value })}
                required
                className="flex-1 p-2 rounded-lg bg-slate-700 text-white outline-none text-sm"
              >
                <option value="">Seleccionar {isDiseaseMode ? "enfermedad" : "tratamiento"}</option>
                {catalogItems
                  .filter((item: Disease | Treatment) => !("deleted_at" in item && item.deleted_at))
                  .map((item: Disease | Treatment) => (
                    <option key={item.id} value={item.id}>{item.nombre}</option>
                  ))}
              </select>
            </div>
            <div className="flex gap-2">
              <input
                type="date"
                value={quickForm[dateField]}
                onChange={e => setQuickForm({ ...quickForm, [dateField]: e.target.value })}
                required
                className="flex-1 p-2 rounded-lg bg-slate-700 text-white outline-none text-sm"
              />
              <input
                type="text"
                placeholder={notesLabel}
                value={quickForm[notesField]}
                onChange={e => setQuickForm({ ...quickForm, [notesField]: e.target.value })}
                className="flex-1 p-2 rounded-lg bg-slate-700 text-white outline-none text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting || !quickForm[catalogField]}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition"
              >
                {submitting ? "Guardando..." : `Guardar ${singular}`}
              </button>
              <button
                type="button"
                onClick={onCatalogOpen}
                className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition"
              >
                Ver catalogo
              </button>
              <button
                type="button"
                onClick={() => onNavigate(`/plants/${plant.id}`)}
                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
              >
                Ver detalle
              </button>
            </div>
          </form>

          {/* History list */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
            <h4 className="text-sm font-semibold text-white mb-2">
              Historial de {isDiseaseMode ? "enfermedades" : "tratamientos"}
            </h4>
            {loadingHistory ? (
              <p className="text-slate-400 text-sm text-center py-4">Cargando...</p>
            ) : history.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">{noneHistory}</p>
            ) : (
              <div className="space-y-2">
                {history.map((item: PlantDisease | PlantTreatment) => {
                  if (isDiseaseMode) {
                    const d = item as PlantDisease
                    return (
                      <div key={d.id} className="bg-slate-700/50 rounded-lg p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm font-medium">{d.enfermedad}</span>
                          <span className={`text-xs px-2 py-0.5 rounded capitalize ${gravedadColor[d.gravedad]}`}>
                            {d.gravedad}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{d.fecha_detectado}</p>
                        {d.notas && <p className="text-xs text-slate-300">{d.notas}</p>}
                      </div>
                    )
                  }
                  const t = item as PlantTreatment
                  return (
                    <div key={t.id} className="bg-slate-700/50 rounded-lg p-3 space-y-1">
                      <span className="text-white text-sm font-medium">{t.tratamiento}</span>
                      <p className="text-xs text-slate-400">{t.fecha_aplicacion}</p>
                      {t.resultado && <p className="text-xs text-slate-300">{t.resultado}</p>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
