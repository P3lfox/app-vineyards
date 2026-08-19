import { pool } from "../db.js"

export const createTreatment = async (req, res) => {
  const { nombre, descripcion } = req.body

  try {
    if (!nombre) {
      return res.status(400).json({ message: "Faltan datos obligatorios" })
    }

    const [result] = await pool.query(
      `INSERT INTO treatments (nombre, descripcion) VALUES (?, ?)`,
      [nombre, descripcion || null]
    )

    res.status(201).json({ id: result.insertId })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al crear tratamiento" })
  }
}

export const getTreatments = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM treatments WHERE deleted_at IS NULL ORDER BY nombre`
    )
    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al obtener tratamientos" })
  }
}

export const updateTreatment = async (req, res) => {
  const { id } = req.params
  const { nombre, descripcion } = req.body

  try {
    await pool.query(
      `UPDATE treatments SET nombre = ?, descripcion = ? WHERE id = ?`,
      [nombre, descripcion || null, id]
    )
    res.json({ message: "Tratamiento actualizado" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al actualizar tratamiento" })
  }
}

export const deleteTreatment = async (req, res) => {
  const { id } = req.params

  try {
    await pool.query(
      `UPDATE treatments SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    )
    res.json({ message: "Tratamiento eliminado" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al eliminar tratamiento" })
  }
}

export const restoreTreatment = async (req, res) => {
  const { id } = req.params

  try {
    await pool.query(
      `UPDATE treatments SET deleted_at = NULL WHERE id = ?`,
      [id]
    )
    res.json({ message: "Tratamiento restaurado" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al restaurar tratamiento" })
  }
}
