import { pool } from "../db.js"

export const createPlantTreatment = async (req, res) => {
  const { plant_id, treatment_id, fecha_aplicacion, resultado } = req.body

  try {
    if (!plant_id || !treatment_id || !fecha_aplicacion) {
      return res.status(400).json({ message: "Faltan datos obligatorios" })
    }

    const [result] = await pool.query(
      `INSERT INTO plant_treatments (plant_id, treatment_id, fecha_aplicacion, resultado)
       VALUES (?, ?, ?, ?)`,
      [plant_id, treatment_id, fecha_aplicacion, resultado || null]
    )

    res.status(201).json({ id: result.insertId })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al registrar tratamiento" })
  }
}

export const getPlantTreatments = async (req, res) => {
  const { plant_id } = req.params

  try {
    const [rows] = await pool.query(
      `SELECT pt.id, pt.fecha_aplicacion, pt.resultado, t.nombre as tratamiento
       FROM plant_treatments pt
       JOIN treatments t ON pt.treatment_id = t.id
       WHERE pt.plant_id = ? AND pt.deleted_at IS NULL
       ORDER BY pt.fecha_aplicacion DESC`,
      [plant_id]
    )
    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al obtener tratamientos de la planta" })
  }
}

export const updatePlantTreatment = async (req, res) => {
  const { id } = req.params
  const { treatment_id, fecha_aplicacion, resultado } = req.body

  try {
    await pool.query(
      `UPDATE plant_treatments SET treatment_id = ?, fecha_aplicacion = ?, resultado = ? WHERE id = ?`,
      [treatment_id, fecha_aplicacion, resultado || null, id]
    )
    res.json({ message: "Tratamiento actualizado" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al actualizar tratamiento" })
  }
}

export const deletePlantTreatment = async (req, res) => {
  const { id } = req.params

  try {
    await pool.query(
      `UPDATE plant_treatments SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    )
    res.json({ message: "Tratamiento eliminado" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al eliminar tratamiento" })
  }
}
