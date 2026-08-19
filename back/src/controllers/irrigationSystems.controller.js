import { pool } from "../db.js"

export const getIrrigationSystems = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, tipo, descripcion FROM irrigation_systems ORDER BY id`
    )
    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al obtener sistemas de riego" })
  }
}
