import { pool } from "../db.js"

export const createIrrigationCoverageBatch = async (req, res) => {
  const { irrigation_event_id, coverage } = req.body

  try {
    if (!irrigation_event_id || !coverage || !Array.isArray(coverage) || coverage.length === 0) {
      return res.status(400).json({ message: "Faltan datos obligatorios" })
    }

    const conn = await pool.getConnection()

    try {
      await conn.beginTransaction()

      for (const c of coverage) {
        if (!c.vine_row_id || !c.cobertura) {
          await conn.rollback()
          return res.status(400).json({ message: "Cada registro de cobertura requiere vine_row_id y cobertura" })
        }
        await conn.query(
          `INSERT INTO irrigation_coverage (irrigation_event_id, vine_row_id, cobertura)
           VALUES (?, ?, ?)`,
          [irrigation_event_id, c.vine_row_id, c.cobertura]
        )
      }

      await conn.commit()
      res.status(201).json({ message: "Cobertura registrada", count: coverage.length })
    } catch (error) {
      await conn.rollback()
      throw error
    } finally {
      conn.release()
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al registrar cobertura" })
  }
}

export const getIrrigationCoverageByEvent = async (req, res) => {
  const { event_id } = req.params

  try {
    const [rows] = await pool.query(
      `SELECT * FROM irrigation_coverage
       WHERE irrigation_event_id = ?
       ORDER BY vine_row_id`,
      [event_id]
    )
    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al obtener cobertura" })
  }
}
