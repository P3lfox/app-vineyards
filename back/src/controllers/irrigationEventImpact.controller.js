import { pool } from "../db.js"

export const createIrrigationEventImpactBatch = async (req, res) => {
  const { irrigation_event_id, impact } = req.body

  try {
    if (!irrigation_event_id || !impact || !Array.isArray(impact) || impact.length === 0) {
      return res.status(400).json({ message: "Faltan datos obligatorios" })
    }

    const conn = await pool.getConnection()

    try {
      await conn.beginTransaction()

      for (const i of impact) {
        if (!i.plant_id || i.llegada_agua === undefined) {
          await conn.rollback()
          return res.status(400).json({ message: "Cada registro de impacto requiere plant_id y llegada_agua" })
        }
        await conn.query(
          `INSERT INTO irrigation_event_impact (irrigation_event_id, plant_id, llegada_agua, hubo_cortes, observaciones)
           VALUES (?, ?, ?, ?, ?)`,
          [irrigation_event_id, i.plant_id, i.llegada_agua, i.hubo_cortes || false, i.observaciones || null]
        )
      }

      await conn.commit()
      res.status(201).json({ message: "Impacto registrado", count: impact.length })
    } catch (error) {
      await conn.rollback()
      throw error
    } finally {
      conn.release()
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al registrar impacto" })
  }
}

export const getIrrigationEventImpactByEvent = async (req, res) => {
  const { event_id } = req.params

  try {
    const [rows] = await pool.query(
      `SELECT * FROM irrigation_event_impact
       WHERE irrigation_event_id = ?
       ORDER BY plant_id`,
      [event_id]
    )
    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al obtener impactos" })
  }
}
