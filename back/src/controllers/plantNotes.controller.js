import { pool } from "../db.js"

export const createPlantNote = async (req, res) => {
  const { plant_id, nota } = req.body
  const user_id = req.usuario?.id

  try {
    if (!plant_id || !nota) {
      return res.status(400).json({ message: "Faltan datos obligatorios" })
    }

    const [result] = await pool.query(
      `INSERT INTO plant_notes (plant_id, user_id, nota) VALUES (?, ?, ?)`,
      [plant_id, user_id || null, nota]
    )

    res.status(201).json({ id: result.insertId })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al crear nota" })
  }
}

export const getPlantNotes = async (req, res) => {
  const { plant_id } = req.params

  try {
    const [rows] = await pool.query(
      `SELECT pn.id, pn.nota, pn.fecha, u.nombre, u.apellido
       FROM plant_notes pn
       LEFT JOIN users u ON pn.user_id = u.id
       WHERE pn.plant_id = ? AND pn.deleted_at IS NULL
       ORDER BY pn.fecha DESC`,
      [plant_id]
    )
    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al obtener notas" })
  }
}

export const updatePlantNote = async (req, res) => {
  const { id } = req.params
  const { nota } = req.body

  try {
    await pool.query(
      `UPDATE plant_notes SET nota = ? WHERE id = ?`,
      [nota, id]
    )
    res.json({ message: "Nota actualizada" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al actualizar nota" })
  }
}

export const deletePlantNote = async (req, res) => {
  const { id } = req.params

  try {
    await pool.query(
      `UPDATE plant_notes SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    )
    res.json({ message: "Nota eliminada" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al eliminar nota" })
  }
}
