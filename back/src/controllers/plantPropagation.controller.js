import { pool } from "../db.js"

export const createPlantPropagation = async (req, res) => {
  const { plant_id, metodo, portainjerto, vivero_origen, fecha_plantacion } = req.body

  try {
    if (!plant_id || !metodo) {
      return res.status(400).json({ message: "Faltan datos obligatorios" })
    }

    const [result] = await pool.query(
      `INSERT INTO plant_propagation (plant_id, metodo, portainjerto, vivero_origen, fecha_plantacion)
       VALUES (?, ?, ?, ?, ?)`,
      [plant_id, metodo, portainjerto || null, vivero_origen || null, fecha_plantacion || null]
    )

    res.status(201).json({ id: result.insertId })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al registrar propagación" })
  }
}

export const getPlantPropagation = async (req, res) => {
  const { plant_id } = req.params

  try {
    const [rows] = await pool.query(
      `SELECT * FROM plant_propagation
       WHERE plant_id = ? AND deleted_at IS NULL
       ORDER BY fecha_plantacion DESC`,
      [plant_id]
    )
    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al obtener propagación" })
  }
}

export const updatePlantPropagation = async (req, res) => {
  const { id } = req.params
  const { metodo, portainjerto, vivero_origen, fecha_plantacion } = req.body

  try {
    await pool.query(
      `UPDATE plant_propagation SET metodo = ?, portainjerto = ?, vivero_origen = ?, fecha_plantacion = ? WHERE id = ?`,
      [metodo, portainjerto || null, vivero_origen || null, fecha_plantacion || null, id]
    )
    res.json({ message: "Propagación actualizada" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al actualizar propagación" })
  }
}

export const deletePlantPropagation = async (req, res) => {
  const { id } = req.params

  try {
    await pool.query(
      `UPDATE plant_propagation SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    )
    res.json({ message: "Propagación eliminada" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al eliminar propagación" })
  }
}
