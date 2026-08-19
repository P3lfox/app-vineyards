import { pool } from "../db.js"

export const getAllVarietals = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, nombre, descripcion, origen, tipo FROM varietals WHERE deleted_at IS NULL ORDER BY nombre"
    )
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Error al obtener varietales" })
  }
}

export const getVineyardVarietals = async (req, res) => {
  const { vineyardId } = req.params
  try {
    const [rows] = await pool.query(
      `SELECT v.id, v.nombre, v.descripcion, v.origen, v.tipo
       FROM varietals v
       JOIN vineyard_varietals vv ON v.id = vv.varietal_id
       WHERE vv.vineyard_id = ? AND v.deleted_at IS NULL
       ORDER BY v.nombre`,
      [vineyardId]
    )
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Error al obtener varietales del viñedo" })
  }
}

export const addVineyardVarietal = async (req, res) => {
  const { vineyardId } = req.params
  const { varietal_id } = req.body

  try {
    if (!varietal_id) {
      return res.status(400).json({ message: "Falta varietal_id" })
    }

    const [exists] = await pool.query(
      "SELECT id FROM vineyard_varietals WHERE vineyard_id = ? AND varietal_id = ?",
      [vineyardId, varietal_id]
    )

    if (exists.length > 0) {
      return res.status(409).json({ message: "Este varietal ya está asociado al viñedo" })
    }

    await pool.query(
      "INSERT INTO vineyard_varietals (vineyard_id, varietal_id) VALUES (?, ?)",
      [vineyardId, varietal_id]
    )

    res.status(201).json({ message: "Varietal asociado correctamente" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Error al asociar varietal" })
  }
}

export const addVineyardVarietals = async (req, res) => {
  const { vineyardId } = req.params
  const { varietal_ids } = req.body

  try {
    if (!Array.isArray(varietal_ids) || varietal_ids.length === 0) {
      return res.status(400).json({ message: "Falta varietal_ids (array)" })
    }

    const values = varietal_ids.map(id => [vineyardId, id])
    const placeholders = values.map(() => "(?, ?)").join(", ")
    const flatValues = values.flat()

    await pool.query(
      `INSERT IGNORE INTO vineyard_varietals (vineyard_id, varietal_id) VALUES ${placeholders}`,
      flatValues
    )

    res.status(201).json({ message: `${varietal_ids.length} varietal(es) asociado(s)` })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Error al asociar varietales" })
  }
}

export const removeVineyardVarietal = async (req, res) => {
  const { vineyardId, varietalId } = req.params

  try {
    await pool.query(
      "DELETE FROM vineyard_varietals WHERE vineyard_id = ? AND varietal_id = ?",
      [vineyardId, varietalId]
    )
    res.json({ message: "Varietal desasociado" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Error al desasociar varietal" })
  }
}
