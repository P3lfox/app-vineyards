import { pool } from "../db.js"

export const createPlantDisease = async (req, res) => {
  const { plant_id, disease_id, fecha_detectado, notas } = req.body

  try {
    if (!plant_id || !disease_id || !fecha_detectado) {
      return res.status(400).json({ message: "Faltan datos obligatorios" })
    }

    const [result] = await pool.query(
      `INSERT INTO plant_diseases (plant_id, disease_id, fecha_detectado, notas)
       VALUES (?, ?, ?, ?)`,
      [plant_id, disease_id, fecha_detectado, notas || null]
    )

    res.status(201).json({ id: result.insertId })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al registrar enfermedad" })
  }
}

export const getPlantDiseases = async (req, res) => {
  const { plant_id } = req.params

  try {
    const [rows] = await pool.query(
      `SELECT pd.id, pd.fecha_detectado, pd.notas, d.nombre as enfermedad, d.tipo, d.gravedad
       FROM plant_diseases pd
       JOIN diseases d ON pd.disease_id = d.id
       WHERE pd.plant_id = ? AND pd.deleted_at IS NULL
       ORDER BY pd.fecha_detectado DESC`,
      [plant_id]
    )
    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al obtener enfermedades de la planta" })
  }
}

export const updatePlantDisease = async (req, res) => {
  const { id } = req.params
  const { disease_id, fecha_detectado, notas } = req.body

  try {
    await pool.query(
      `UPDATE plant_diseases SET disease_id = ?, fecha_detectado = ?, notas = ? WHERE id = ?`,
      [disease_id, fecha_detectado, notas || null, id]
    )
    res.json({ message: "Enfermedad actualizada" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al actualizar enfermedad" })
  }
}

export const deletePlantDisease = async (req, res) => {
  const { id } = req.params

  try {
    await pool.query(
      `UPDATE plant_diseases SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    )
    res.json({ message: "Enfermedad eliminada" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al eliminar enfermedad" })
  }
}
