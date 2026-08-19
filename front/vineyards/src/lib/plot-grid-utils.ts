/**
 * Shared utilities for per-row plant grid rendering across all map components.
 * Replaces the uniform maxPlantsInRow approach with shape-aware per-row rendering.
 */

export type FormaParcela = 'rectangular' | 'trapezoidal' | 'abanicado' | 'terrazas' | 'irregular'

export interface PlantWithPosition {
  id: number
  vine_row_id: number
  posicion_en_fila: number | null
  [key: string]: unknown
}

/**
 * Alignment strategy per plot shape.
 * - rectangular: left-aligned (flex-start)
 * - trapezoidal/abanicado: centered
 * - terrazas: staggered even/odd rows via marginLeft
 * - irregular: left-aligned
 */
export function getAlignment(formaParcela: FormaParcela | undefined | null): {
  justifyContent: string
  marginLeft?: number
} {
  const shape = formaParcela || 'rectangular'
  switch (shape) {
    case 'trapezoidal':
    case 'abanicado':
      return { justifyContent: 'center' }
    case 'terrazas':
      return { justifyContent: 'flex-start' }
    default:
      return { justifyContent: 'flex-start' }
  }
}

/**
 * Returns the marginLeft stagger offset for terrazas shape.
 * Even rows get an offset, odd rows get 0.
 */
export function getTerrazasStagger(rowNumero: number): number {
  return rowNumero % 2 === 0 ? 12 : 0
}

/**
 * Filters and sorts plants for a specific row.
 * Uses posicion_en_fila when available, falls back to id.
 */
export function getPlantsForRow<T extends PlantWithPosition>(
  plants: T[],
  rowId: number
): T[] {
  return plants
    .filter(p => p.vine_row_id === rowId)
    .sort((a, b) => {
      const posA = a.posicion_en_fila ?? a.id
      const posB = b.posicion_en_fila ?? b.id
      return posA - posB
    })
}

/**
 * Computes per-row cell count for progress calculation.
 * Returns the actual plant count per row (not maxPlantsInRow).
 */
export function getRowPlantCounts<T extends PlantWithPosition>(
  plants: T[],
  rowIds: number[]
): Map<number, number> {
  const counts = new Map<number, number>()
  for (const id of rowIds) {
    counts.set(id, plants.filter(p => p.vine_row_id === id).length)
  }
  return counts
}
