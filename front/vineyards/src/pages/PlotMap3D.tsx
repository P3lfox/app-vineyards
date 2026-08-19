import { useEffect, useMemo, useState } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, Environment, Html } from "@react-three/drei"
import { api } from "../services/api"
import { useNavigate, useParams } from "react-router-dom"
import { varietalHex, varietalBadgeColor, EMPTY_CELL_HEX } from "../constants/varietalColors"
import { getPlantsForRow, type FormaParcela } from "../lib/plot-grid-utils"

type Plant = {
  id: number
  varietal_nombre: string
  varietal_tipo: string
  row_numero: number
  vine_row_id: number
  posicion_en_fila: number | null
  latitud: number | null
}

type VineRow = {
  id: number
  numero: number
  plant_count: number
}

type Selected = { rowNumero: number; cellIdx: number }

// World-space spacing between plants and rows (arbitrary scene units).
const CELL_GAP = 1.4
const ROW_GAP = 1.6

/** A single vine: trunk + foliage, colored by varietal. Empty cells render a low dark stub. */
function Vine({
  x,
  z,
  plant,
  selected,
  onSelect,
}: {
  x: number
  z: number
  plant: Plant | undefined
  selected: boolean
  onSelect: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const color = plant ? varietalHex[plant.varietal_tipo] || "#94a3b8" : EMPTY_CELL_HEX

  if (!plant) {
    return (
      <mesh position={[x, 0.15, z]}>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial color={color} transparent opacity={0.35} />
      </mesh>
    )
  }

  return (
    <group
      position={[x, 0, z]}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        document.body.style.cursor = "pointer"
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = "auto"
      }}
    >
      {/* trunk */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.8, 8]} />
        <meshStandardMaterial color="#6b4423" />
      </mesh>
      {/* foliage */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <sphereGeometry args={[0.45, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={selected ? 0.6 : hovered ? 0.25 : 0}
          roughness={0.6}
        />
      </mesh>
      {selected && (
        <mesh position={[0, 1.0, 0]}>
          <sphereGeometry args={[0.55, 16, 16]} />
          <meshBasicMaterial color="#ffffff" wireframe />
        </mesh>
      )}
    </group>
  )
}

function Scene({
  rows,
  plants,
  selected,
  onSelect,
  formaParcela,
}: {
  rows: VineRow[]
  plants: Plant[]
  selected: Selected | null
  onSelect: (s: Selected) => void
  formaParcela: FormaParcela
}) {
  // Center the grid on the origin so OrbitControls orbits around the plot center.
  // Use the max actual plant count per row for width calculation.
  const plantsByRow = useMemo(() => {
    const map = new Map<number, Plant[]>()
    for (const row of rows) {
      const rowPlants = getPlantsForRow(plants, row.id)
      map.set(row.id, rowPlants)
    }
    return map
  }, [plants, rows])

  const maxActualPlants = Math.max(
    ...Array.from(plantsByRow.values()).map(p => p.length),
    1
  )
  const width = (maxActualPlants - 1) * CELL_GAP
  const depth = (rows.length - 1) * ROW_GAP
  const offsetX = width / 2
  const offsetZ = depth / 2

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 15, 8]} intensity={1.2} castShadow />
      <Environment preset="sunset" />

      {/* ground plane sized to the plot */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[width + ROW_GAP * 2, depth + ROW_GAP * 2]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      {rows.map((row, rowIdx) => {
        const rowPlants = plantsByRow.get(row.id) || []
        // For terrazas, add offset to even rows
        const rowOffsetX = formaParcela === 'terrazas' && row.numero % 2 === 0 ? CELL_GAP / 2 : 0
        return rowPlants.map((plant, cellIdx) => {
          const x = cellIdx * CELL_GAP + rowOffsetX - offsetX
          const z = rowIdx * ROW_GAP - offsetZ
          const isSelected =
            selected?.rowNumero === row.numero && selected?.cellIdx === cellIdx
          return (
            <Vine
              key={`${row.id}-${plant.id}`}
              x={x}
              z={z}
              plant={plant}
              selected={isSelected}
              onSelect={() => onSelect({ rowNumero: row.numero, cellIdx })}
            />
          )
        })
      })}

      {/* row labels floating at the start of each row */}
      {rows.map((row, rowIdx) => (
        <Html
          key={`label-${row.id}`}
          position={[-offsetX - CELL_GAP, 0.3, rowIdx * ROW_GAP - offsetZ]}
          center
          distanceFactor={12}
        >
          <span className="text-[10px] text-slate-400 whitespace-nowrap select-none">
            F{row.numero}
          </span>
        </Html>
      ))}

      <OrbitControls
        enableDamping
        maxPolarAngle={Math.PI / 2.1}
        minDistance={4}
        maxDistance={60}
      />
    </>
  )
}

export default function PlotMap3D() {
  const { plotId } = useParams()
  const navigate = useNavigate()

  const [rows, setRows] = useState<VineRow[]>([])
  const [plants, setPlants] = useState<Plant[]>([])
  const [formaParcela, setFormaParcela] = useState<FormaParcela>('rectangular')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Selected | null>(null)

  useEffect(() => {
    Promise.all([
      api.get(`/vine-rows/getVineRows?plot_id=${plotId}`),
      api.get(`/plants/getPlants?plot_id=${plotId}`),
      api.get(`/plots/getPlot/${plotId}`),
    ])
      .then(([rowsRes, plantsRes, plotRes]) => {
        setRows(rowsRes.data)
        setPlants(plantsRes.data)
        setFormaParcela((plotRes.data.forma_parcela || 'rectangular') as FormaParcela)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [plotId])

  const getPlantForCell = (rowNumero: number, cellIdx: number) => {
    const row = rows.find(r => r.numero === rowNumero)
    if (!row) return undefined
    const rowPlants = getPlantsForRow(plants, row.id)
    return rowPlants[cellIdx]
  }

  const totalPlants = rows.reduce((sum, r) => sum + r.plant_count, 0)
  const plantedCount = plants.length
  const progress = totalPlants > 0 ? Math.round((plantedCount / totalPlants) * 100) : 0

  if (loading) return <div className="w-full p-6 text-slate-300 text-center">Cargando...</div>

  if (rows.length === 0) {
    return (
      <div className="w-full p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Mapa 3D 🧊</h1>
          <p className="text-slate-400 text-sm">Parcela #{plotId}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-12 text-center">
          <p className="text-slate-400">No hay filas creadas aún.</p>
          <button
            onClick={() => navigate(`/plots/${plotId}/rows`)}
            className="mt-4 text-emerald-400 hover:text-emerald-300 text-sm transition"
          >
            Crear filas →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mapa 3D 🧊</h1>
          <p className="text-slate-400 text-sm">
            Parcela #{plotId} — {rows.length} filas · {plantedCount} plantas cargadas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/plots/${plotId}/map`)}
            className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-lg transition font-medium"
          >
            🗺️ Ver 2D
          </button>
          <div className="text-right">
            <p className="text-xs text-slate-500">Progreso</p>
            <p className="text-lg font-bold text-emerald-400">{progress}%</p>
          </div>
          <div className="w-32 bg-slate-700 rounded-full h-2">
            <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="flex gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: varietalHex.tinta }} /> Tinta</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: varietalHex.blanca }} /> Blanca</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: varietalHex.rosada }} /> Rosada</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: EMPTY_CELL_HEX }} /> Sin planta</span>
        <span className="text-slate-500 ml-auto">Arrastrá para rotar · rueda para zoom</span>
      </div>

      <div className="bg-slate-800 rounded-xl overflow-hidden" style={{ height: "70vh" }}>
        <Canvas shadows camera={{ position: [0, 12, 18], fov: 45 }}>
          <color attach="background" args={["#0f172a"]} />
          <Scene rows={rows} plants={plants} selected={selected} onSelect={setSelected} formaParcela={formaParcela} />
        </Canvas>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div className="bg-slate-800 rounded-xl p-6 max-w-sm w-full mx-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white">
              Fila {selected.rowNumero} — Posición {selected.cellIdx + 1}
            </h3>
            {(() => {
              const plant = getPlantForCell(selected.rowNumero, selected.cellIdx)
              if (!plant) return <p className="text-slate-400 text-sm">Sin planta asignada</p>
              return (
                <div className="space-y-2">
                  <p className="text-white">
                    <span className="text-slate-400">Varietal:</span> {plant.varietal_nombre}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                    varietalBadgeColor[plant.varietal_tipo] || "bg-slate-600/30 text-slate-400"
                  }`}>
                    {plant.varietal_tipo}
                  </span>
                  <button
                    onClick={() => {
                      setSelected(null)
                      navigate(`/plants/${plant.id}`)
                    }}
                    className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-medium transition"
                  >
                    Ver historial y estado
                  </button>
                </div>
              )
            })()}
            <button
              onClick={() => setSelected(null)}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-medium transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
