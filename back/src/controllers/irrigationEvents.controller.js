import { pool } from "../db.js"

export const createIrrigationEvent = async (req, res) => {
  const { plot_id, fecha, duracion_min, mm_aplicados, presion_media_bar, caudal_l_h, observaciones } = req.body

  try {
    if (!plot_id || !fecha) {
      return res.status(400).json({ message: "Faltan datos obligatorios" })
    }

    const [result] = await pool.query(
      `INSERT INTO irrigation_events (plot_id, fecha, duracion_min, mm_aplicados, presion_media_bar, caudal_l_h, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [plot_id, fecha, duracion_min || null, mm_aplicados || null, presion_media_bar || null, caudal_l_h || null, observaciones || null]
    )

    res.status(201).json({ id: result.insertId })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al crear evento de riego" })
  }
}

export const getIrrigationEvents = async (req, res) => {
  const { plot_id } = req.params

  try {
    const [rows] = await pool.query(
      `SELECT ie.*, p.nombre as plot_nombre, ist.tipo as sistema_tipo
       FROM irrigation_events ie
       JOIN plots p ON ie.plot_id = p.id
       LEFT JOIN irrigation_systems ist ON p.irrigation_system_id = ist.id
       WHERE ie.plot_id = ? AND ie.deleted_at IS NULL
       ORDER BY ie.fecha DESC`,
      [plot_id]
    )
    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al obtener eventos de riego" })
  }
}

export const getAllIrrigationEvents = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ie.*, p.nombre as plot_nombre, ist.tipo as sistema_tipo
       FROM irrigation_events ie
       JOIN plots p ON ie.plot_id = p.id
       LEFT JOIN irrigation_systems ist ON p.irrigation_system_id = ist.id
       WHERE ie.deleted_at IS NULL
       ORDER BY ie.fecha DESC`
    )
    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al obtener eventos de riego" })
  }
}

export const startEvent = async (req, res) => {
  const { id } = req.params

  try {
    await pool.query(
      `UPDATE irrigation_events SET estado = 'in_progress' WHERE id = ?`,
      [id]
    )
    res.json({ message: "Evento iniciado" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al iniciar evento" })
  }
}

export const finishEvent = async (req, res) => {
  const { id } = req.params
  const { coverage, impact } = req.body

  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    // Marcar evento como completado
    await conn.query(
      `UPDATE irrigation_events SET estado = 'completed' WHERE id = ?`,
      [id]
    )

    // Eliminar registros previos de este evento (para permitir re-finalizar)
    await conn.query(`DELETE FROM irrigation_coverage WHERE irrigation_event_id = ?`, [id])
    await conn.query(`DELETE FROM irrigation_event_impact WHERE irrigation_event_id = ?`, [id])

    // Insertar cobertura en batch
    if (coverage && coverage.length > 0) {
      for (const c of coverage) {
        await conn.query(
          `INSERT INTO irrigation_coverage (irrigation_event_id, vine_row_id, cobertura)
           VALUES (?, ?, ?)`,
          [id, c.vine_row_id, c.cobertura]
        )
      }
    }

    // Insertar impacto en batch
    if (impact && impact.length > 0) {
      for (const i of impact) {
        await conn.query(
          `INSERT INTO irrigation_event_impact (irrigation_event_id, plant_id, llegada_agua, hubo_cortes, observaciones)
           VALUES (?, ?, ?, ?, ?)`,
          [id, i.plant_id, i.llegada_agua, i.hubo_cortes || false, i.observaciones || null]
        )
      }
    }

    await conn.commit()
    res.json({ message: "Evento finalizado" })
  } catch (error) {
    await conn.rollback()
    console.error(error)
    res.status(500).json({ message: "Error al finalizar evento" })
  } finally {
    conn.release()
  }
}

export const getIrrigationEvent = async (req, res) => {
  const { id } = req.params

  try {
    const [eventRows] = await pool.query(
      `SELECT ie.*, p.nombre as plot_nombre, ist.tipo as sistema_tipo
       FROM irrigation_events ie
       JOIN plots p ON ie.plot_id = p.id
       LEFT JOIN irrigation_systems ist ON p.irrigation_system_id = ist.id
       WHERE ie.id = ?`,
      [id]
    )

    if (eventRows.length === 0) {
      return res.status(404).json({ message: "Evento no encontrado" })
    }

    const event = eventRows[0]

    const [coverageRows] = await pool.query(
      `SELECT * FROM irrigation_coverage WHERE irrigation_event_id = ? ORDER BY vine_row_id`,
      [id]
    )

    const [impactRows] = await pool.query(
      `SELECT * FROM irrigation_event_impact WHERE irrigation_event_id = ? ORDER BY plant_id`,
      [id]
    )

    res.json({
      ...event,
      coverage: coverageRows,
      impact: impactRows,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al obtener detalle del evento" })
  }
}

export const deleteIrrigationEvent = async (req, res) => {
  const { id } = req.params

  try {
    await pool.query(
      `UPDATE irrigation_events SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    )
    res.json({ message: "Evento de riego eliminado" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al eliminar evento de riego" })
  }
}

export const restoreIrrigationEvent = async (req, res) => {
  const { id } = req.params

  try {
    await pool.query(
      `UPDATE irrigation_events SET deleted_at = NULL WHERE id = ?`,
      [id]
    )
    res.json({ message: "Evento de riego restaurado" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al restaurar evento de riego" })
  }
}
