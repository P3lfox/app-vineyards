import { pool } from "../db.js"
import { harvestWeights } from "../constants/harvestWeights.js"

export const createPlantYield = async (req, res) => {
  const { plant_id, fecha, cantidad_racimos, racimos_pequenos, racimos_medianos, racimos_grandes, observaciones } = req.body

  try {
    if (!plant_id || !fecha || cantidad_racimos === undefined) {
      return res.status(400).json({ message: "Faltan datos obligatorios" })
    }

    const [result] = await pool.query(
      `INSERT INTO plant_yield (plant_id, fecha, cantidad_racimos, racimos_pequenos, racimos_medianos, racimos_grandes, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [plant_id, fecha, cantidad_racimos, racimos_pequenos || 0, racimos_medianos || 0, racimos_grandes || 0, observaciones || null]
    )

    res.status(201).json({ id: result.insertId })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al registrar cosecha" })
  }
}

export const getPlantYield = async (req, res) => {
  const { plant_id } = req.params

  try {
    const [rows] = await pool.query(
      `SELECT * FROM plant_yield
       WHERE plant_id = ? AND deleted_at IS NULL
       ORDER BY fecha DESC`,
      [plant_id]
    )
    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al obtener cosechas" })
  }
}

export const updatePlantYield = async (req, res) => {
  const { id } = req.params
  const { fecha, cantidad_racimos, racimos_pequenos, racimos_medianos, racimos_grandes, observaciones } = req.body

  try {
    await pool.query(
      `UPDATE plant_yield SET fecha = ?, cantidad_racimos = ?, racimos_pequenos = ?, racimos_medianos = ?, racimos_grandes = ?, observaciones = ? WHERE id = ?`,
      [fecha, cantidad_racimos, racimos_pequenos || 0, racimos_medianos || 0, racimos_grandes || 0, observaciones || null, id]
    )
    res.json({ message: "Cosecha actualizada" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al actualizar cosecha" })
  }
}

export const deletePlantYield = async (req, res) => {
  const { id } = req.params

  try {
    await pool.query(
      `UPDATE plant_yield SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    )
    res.json({ message: "Cosecha eliminada" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al eliminar cosecha" })
  }
}

export const getHarvestEstimate = async (req, res) => {
  const { usuario } = req
  const { vineyard_id, plot_id, fecha_desde, fecha_hasta } = req.query

  try {
    if (!vineyard_id && !plot_id) {
      return res.status(400).json({ message: "Se requiere vineyard_id o plot_id" })
    }

    // NOTE: Soft-delete filtering is applied directly in JOIN conditions for all roles.
    // This aggregation traverses the full hierarchy (vineyard → plot → row → plant → yield),
    // so deleted records at any level must always be excluded to maintain data integrity.
    // Vineyard scoping by user role is not enforced because the users table has no
    // vineyard_id column. All users must explicitly pass vineyard_id or plot_id.

    const dateParts = []
    const dateParams = []
    if (fecha_desde) {
      dateParts.push("py.fecha >= ?")
      dateParams.push(fecha_desde)
    }
    if (fecha_hasta) {
      dateParts.push("py.fecha <= ?")
      dateParams.push(fecha_hasta)
    }
    const dateFilter = dateParts.length > 0 ? `AND ${dateParts.join(" AND ")}` : ""

    const vineyardFilter = vineyard_id ? "AND v.id = ?" : ""
    const plotFilter = plot_id ? "AND pl.id = ?" : ""

    // Params must match SQL placeholder order: vineyard → plot → dates
    const query1Params = []
    if (vineyard_id) query1Params.push(vineyard_id)
    if (plot_id) query1Params.push(plot_id)
    query1Params.push(...dateParams)

    // Query 2 has no date filter, only vineyard/plot
    const query2Params = []
    if (vineyard_id) query2Params.push(vineyard_id)
    if (plot_id) query2Params.push(plot_id)

    // Query 1: Get aggregated data per vineyard/plot/varietal
    const [yieldData] = await pool.query(
      `SELECT
        v.id AS vineyard_id,
        v.nombre AS vineyard_nombre,
        pl.id AS plot_id,
        pl.nombre AS plot_nombre,
        var.tipo AS varietal_tipo,
        var.nombre AS varietal_nombre,
        COUNT(DISTINCT p.id) AS plantas_con_datos,
        SUM(py.cantidad_racimos) AS total_racimos
       FROM plant_yield py
       JOIN plants p ON py.plant_id = p.id AND p.deleted_at IS NULL
       JOIN vine_rows vr ON p.vine_row_id = vr.id AND vr.deleted_at IS NULL
       JOIN plots pl ON vr.plot_id = pl.id AND pl.deleted_at IS NULL
       JOIN vineyards v ON pl.vineyard_id = v.id AND v.deleted_at IS NULL
       JOIN varietals var ON p.varietal_id = var.id AND var.deleted_at IS NULL
        WHERE 1=1
          ${vineyardFilter}
          ${plotFilter}
          ${dateFilter}
          AND py.deleted_at IS NULL
        GROUP BY v.id, pl.id, var.tipo, var.nombre
       ORDER BY v.id, pl.id, var.tipo`,
      query1Params
    )

    // Query 2: Get total plants count per plot (for coverage calculation)
    const [totalPlantsData] = await pool.query(
      `SELECT
        v.id AS vineyard_id,
        pl.id AS plot_id,
        COUNT(p.id) AS total_plantas
       FROM plots pl
       JOIN vineyards v ON pl.vineyard_id = v.id
       LEFT JOIN vine_rows vr ON vr.plot_id = pl.id AND vr.deleted_at IS NULL
       LEFT JOIN plants p ON p.vine_row_id = vr.id AND p.deleted_at IS NULL
       WHERE pl.deleted_at IS NULL
         AND v.deleted_at IS NULL
         ${vineyardFilter}
         ${plotFilter}
       GROUP BY v.id, pl.id`,
      query2Params
    )

    // Build hierarchical response
    const totalPlantsMap = {}
    for (const row of totalPlantsData) {
      const key = `${row.vineyard_id}-${row.plot_id}`
      totalPlantsMap[key] = row.total_plantas
    }

    const vineyardsMap = {}
    let globalRacimos = 0
    let globalKg = 0
    let globalPlantasConDatos = 0
    let globalTotalPlantas = 0

    for (const row of yieldData) {
      const vid = row.vineyard_id
      const pid = row.plot_id
      const weight = harvestWeights[row.varietal_tipo] || 0.15
      const kgEstimados = row.total_racimos * weight

      if (!vineyardsMap[vid]) {
        vineyardsMap[vid] = {
          vineyard_id: vid,
          vineyard_nombre: row.vineyard_nombre,
          plots: {},
        }
      }

      if (!vineyardsMap[vid].plots[pid]) {
        const plotKey = `${vid}-${pid}`
        const totalPlantas = totalPlantsMap[plotKey] || 0
        vineyardsMap[vid].plots[pid] = {
          plot_id: pid,
          plot_nombre: row.plot_nombre,
          varietal_breakdown: [],
          total_racimos: 0,
          kg_estimados: 0,
          plantas_con_datos: 0,
          total_plantas: totalPlantas,
          cobertura_pct: 0,
        }
      }

      const plot = vineyardsMap[vid].plots[pid]
      plot.varietal_breakdown.push({
        varietal_nombre: row.varietal_nombre,
        varietal_tipo: row.varietal_tipo,
        racimos: row.total_racimos,
        kg_estimados: parseFloat(kgEstimados.toFixed(2)),
      })
      plot.total_racimos += row.total_racimos
      plot.kg_estimados += kgEstimados
      plot.plantas_con_datos += row.plantas_con_datos

      globalRacimos += row.total_racimos
      globalKg += kgEstimados
      globalPlantasConDatos += row.plantas_con_datos
    }

    // Calculate coverage and finalize plots
    const vineyards = Object.values(vineyardsMap).map(v => {
      const plots = Object.values(v.plots).map(p => {
        p.cobertura_pct = p.total_plantas > 0
          ? parseFloat(((p.plantas_con_datos / p.total_plantas) * 100).toFixed(1))
          : 0
        p.kg_estimados = parseFloat(p.kg_estimados.toFixed(2))
        globalTotalPlantas += p.total_plantas
        return p
      })
      return { ...v, plots }
    })

    const coberturaGlobal = globalTotalPlantas > 0
      ? parseFloat(((globalPlantasConDatos / globalTotalPlantas) * 100).toFixed(1))
      : 0

    res.json({
      vineyards,
      totals: {
        total_racimos: globalRacimos,
        kg_estimados: parseFloat(globalKg.toFixed(2)),
        total_plantas: globalTotalPlantas,
        plantas_con_datos: globalPlantasConDatos,
        cobertura_pct: coberturaGlobal,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al obtener estimación de cosecha" })
  }
}
