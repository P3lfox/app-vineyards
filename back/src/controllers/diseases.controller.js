import { pool } from "../db.js"

export const createDisease = async (req, res) => {
  const { nombre, tipo, descripcion, gravedad } = req.body

  try {
    if (!nombre || !tipo || !gravedad) {
      return res.status(400).json({ message: "Faltan datos obligatorios" })
    }

    const [result] = await pool.query(
      `INSERT INTO diseases (nombre, tipo, descripcion, gravedad) VALUES (?, ?, ?, ?)`,
      [nombre, tipo, descripcion || null, gravedad]
    )

    res.status(201).json({ id: result.insertId })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al crear enfermedad" })
  }
}

export const getDiseases = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM diseases WHERE deleted_at IS NULL ORDER BY nombre`
    )
    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al obtener enfermedades" })
  }
}

export const updateDisease = async (req, res) => {
  const { id } = req.params
  const { nombre, tipo, descripcion, gravedad } = req.body

  try {
    await pool.query(
      `UPDATE diseases SET nombre = ?, tipo = ?, descripcion = ?, gravedad = ? WHERE id = ?`,
      [nombre, tipo, descripcion || null, gravedad, id]
    )
    res.json({ message: "Enfermedad actualizada" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al actualizar enfermedad" })
  }
}

export const deleteDisease = async (req, res) => {
  const { id } = req.params

  try {
    await pool.query(
      `UPDATE diseases SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    )
    res.json({ message: "Enfermedad eliminada" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al eliminar enfermedad" })
  }
}

export const restoreDisease = async (req, res) => {
  const { id } = req.params

  try {
    await pool.query(
      `UPDATE diseases SET deleted_at = NULL WHERE id = ?`,
      [id]
    )
    res.json({ message: "Enfermedad restaurada" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al restaurar enfermedad" })
  }
}
