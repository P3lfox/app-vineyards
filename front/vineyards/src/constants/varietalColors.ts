/**
 * Colores por tipo de varietal para renderizado de grilla y badges.
 */

export const varietalColor: Record<string, string> = {
  tinta: "bg-violet-700 border-violet-600",
  blanca: "bg-lime-500 border-lime-400",
  rosada: "bg-rose-400 border-rose-300",
}

export const varietalBadgeColor: Record<string, string> = {
  tinta: "bg-violet-700/30 text-violet-400",
  blanca: "bg-lime-500/30 text-lime-400",
  rosada: "bg-rose-400/30 text-rose-400",
}

/**
 * Hex equivalents of `varietalColor` for use in canvas/WebGL contexts (Three.js),
 * where Tailwind classes don't apply. Values mirror the Tailwind palette above.
 */
export const varietalHex: Record<string, string> = {
  tinta: "#6d28d9",  // violet-700
  blanca: "#84cc16", // lime-500
  rosada: "#fb7185", // rose-400
}

export const EMPTY_CELL_HEX = "#334155" // slate-700
