import { pool } from "../db.js"

export const createPlantStatus = async (req, res) => {
  const { plant_id, estado_salud, crecimiento, tutor, fecha, observaciones } = req.body

  try {
    if (!plant_id || !estado_salud || !crecimiento || !fecha) {
      return res.status(400).json({ message: "Faltan datos obligatorios" })
    }

    const [result] = await pool.query(
      `INSERT INTO plant_status_history (plant_id, estado_salud, crecimiento, tutor, fecha, observaciones)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [plant_id, estado_salud, crecimiento, tutor || false, fecha, observaciones || null]
    )

    res.status(201).json({ id: result.insertId })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al registrar estado" })
  }
}

export const getPlantStatusHistory = async (req, res) => {
  const { plant_id } = req.params

  try {
    const [rows] = await pool.query(
      `SELECT id, estado_salud, crecimiento, tutor, fecha, observaciones, created_at
       FROM plant_status_history
       WHERE plant_id = ? AND deleted_at IS NULL
       ORDER BY fecha DESC`,
      [plant_id]
    )
    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al obtener historial" })
  }
}

export const updatePlantStatus = async (req, res) => {
  const { plant_id } = req.params
  const { estado_salud, crecimiento, tutor, fecha, observaciones } = req.body

  try {
    if (!estado_salud || !crecimiento || !fecha) {
      return res.status(400).json({ message: "Faltan datos obligatorios" })
    }

    const [result] = await pool.query(
      `INSERT INTO plant_status_history (plant_id, estado_salud, crecimiento, tutor, fecha, observaciones)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [plant_id, estado_salud, crecimiento, tutor || false, fecha, observaciones || null]
    )

    res.status(201).json({ id: result.insertId, message: "Estado actualizado" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al actualizar estado" })
  }
}
