import { pool } from "../db.js"

export const createPlantPruning = async (req, res) => {
  const { plant_id, tipo_poda, intensidad, fecha, observaciones } = req.body
  const realizada_por = req.usuario?.id

  try {
    if (!plant_id || !tipo_poda || !intensidad || !fecha) {
      return res.status(400).json({ message: "Faltan datos obligatorios" })
    }

    const [result] = await pool.query(
      `INSERT INTO plant_prunings (plant_id, tipo_poda, intensidad, fecha, observaciones, realizada_por)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [plant_id, tipo_poda, intensidad, fecha, observaciones || null, realizada_por || null]
    )

    res.status(201).json({ id: result.insertId })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al registrar poda" })
  }
}

export const getPlantPrunings = async (req, res) => {
  const { plant_id } = req.params

  try {
    const [rows] = await pool.query(
      `SELECT pp.id, pp.tipo_poda, pp.intensidad, pp.fecha, pp.observaciones, u.nombre, u.apellido
       FROM plant_prunings pp
       LEFT JOIN users u ON pp.realizada_por = u.id
       WHERE pp.plant_id = ? AND pp.deleted_at IS NULL
       ORDER BY pp.fecha DESC`,
      [plant_id]
    )
    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al obtener podas" })
  }
}

export const updatePlantPruning = async (req, res) => {
  const { id } = req.params
  const { tipo_poda, intensidad, fecha, observaciones } = req.body

  try {
    await pool.query(
      `UPDATE plant_prunings SET tipo_poda = ?, intensidad = ?, fecha = ?, observaciones = ? WHERE id = ?`,
      [tipo_poda, intensidad, fecha, observaciones || null, id]
    )
    res.json({ message: "Poda actualizada" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al actualizar poda" })
  }
}

export const deletePlantPruning = async (req, res) => {
  const { id } = req.params

  try {
    await pool.query(
      `UPDATE plant_prunings SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    )
    res.json({ message: "Poda eliminada" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al eliminar poda" })
  }
}

export const getPlantsForPruning = async (req, res) => {
  const { plot_id, campania } = req.query
  const { usuario } = req

  try {
    if (!plot_id) {
      return res.status(400).json({ message: "Falta plot_id" })
    }

    const campaniaNum = campania ? parseInt(campania, 10) : new Date().getFullYear()
    const deletedFilter = usuario?.role === "admin" ? "" : "AND p.deleted_at IS NULL AND vr.deleted_at IS NULL"

    const [rows] = await pool.query(
      `SELECT 
        p.id as plant_id,
        p.codigo,
        p.vine_row_id,
        vr.id as row_id,
        vr.numero as row_numero,
        v.nombre as varietal_nombre,
        v.tipo as varietal_tipo,
        pl.nombre as parcela_nombre,
        CASE WHEN EXISTS (
          SELECT 1 FROM plant_prunings pp 
          WHERE pp.plant_id = p.id AND pp.deleted_at IS NULL AND YEAR(pp.fecha) = ?
        ) THEN 1 ELSE 0 END as ya_podada
      FROM plants p
      JOIN vine_rows vr ON p.vine_row_id = vr.id
      JOIN plots pl ON vr.plot_id = pl.id
      JOIN varietals v ON p.varietal_id = v.id
      WHERE vr.plot_id = ? ${deletedFilter}
      ORDER BY vr.numero ASC, p.id ASC`,
      [campaniaNum, plot_id]
    )

    // Group by row
    const rowsMap = new Map()
    for (const plant of rows) {
      if (!rowsMap.has(plant.row_id)) {
        rowsMap.set(plant.row_id, {
          row_id: plant.row_id,
          row_numero: plant.row_numero,
          parcela_nombre: plant.parcela_nombre,
          plants: []
        })
      }
      rowsMap.get(plant.row_id).plants.push({
        plant_id: plant.plant_id,
        codigo: plant.codigo,
        varietal_nombre: plant.varietal_nombre,
        varietal_tipo: plant.varietal_tipo,
        ya_podada: plant.ya_podada === 1
      })
    }

    res.json({
      parcela_nombre: rows.length > 0 ? rows[0].parcela_nombre : null,
      rows: Array.from(rowsMap.values())
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al obtener plantas para poda" })
  }
}
