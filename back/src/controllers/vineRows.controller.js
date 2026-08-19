import { pool } from "../db.js"

export const createVineRow = async (req, res) => {
  const { plot_id, numero, longitud_m, num_plantas_esperadas } = req.body

  try {
    if (!plot_id || numero === undefined) {
      return res.status(400).json({ message: "Faltan datos obligatorios" })
    }

    const [plotExists] = await pool.query(
      "SELECT id FROM plots WHERE id = ? AND deleted_at IS NULL",
      [plot_id]
    )

    if (plotExists.length === 0) {
      return res.status(404).json({ message: "Parcela no encontrada" })
    }

    const [result] = await pool.query(
      `INSERT INTO vine_rows (plot_id, numero, longitud_m, num_plantas_esperadas) VALUES (?, ?, ?, ?)`,
      [plot_id, numero, longitud_m || null, num_plantas_esperadas || null]
    )

    res.status(201).json({
      id: result.insertId,
      plot_id,
      numero,
      longitud_m: longitud_m || null,
      num_plantas_esperadas: num_plantas_esperadas || null,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al crear fila" })
  }
}

export const getVineRows = async (req, res) => {
  const { plot_id } = req.query
  const { usuario } = req

  try {
    if (!plot_id) {
      return res.status(400).json({ message: "Falta plot_id" })
    }

    const filter = usuario?.role === "admin" ? "" : "AND vr.deleted_at IS NULL"

    const [rows] = await pool.query(
      `SELECT vr.id, vr.numero, vr.plot_id, vr.created_at, vr.deleted_at,
              vr.longitud_m, vr.num_plantas_esperadas,
              COUNT(p.id) as plant_count
       FROM vine_rows vr
       LEFT JOIN plants p ON p.vine_row_id = vr.id AND p.deleted_at IS NULL
       WHERE vr.plot_id = ? ${filter}
       GROUP BY vr.id
       ORDER BY vr.numero`,
      [plot_id]
    )

    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al obtener filas" })
  }
}

export const updateVineRow = async (req, res) => {
  const { id } = req.params
  const { numero, longitud_m, num_plantas_esperadas } = req.body

  try {
    const fields = []
    const values = []

    if (numero !== undefined) { fields.push("numero = ?"); values.push(numero) }
    if (longitud_m !== undefined) { fields.push("longitud_m = ?"); values.push(longitud_m || null) }
    if (num_plantas_esperadas !== undefined) { fields.push("num_plantas_esperadas = ?"); values.push(num_plantas_esperadas || null) }

    if (fields.length === 0) {
      return res.status(400).json({ message: "No hay campos para actualizar" })
    }

    values.push(id)
    await pool.query(
      `UPDATE vine_rows SET ${fields.join(", ")} WHERE id = ?`,
      values
    )

    res.json({ message: "Fila actualizada" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al actualizar fila" })
  }
}

export const deleteVineRow = async (req, res) => {
  const { id } = req.params
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    await conn.query(
      `UPDATE plant_status_history psh
       JOIN plants p ON psh.plant_id = p.id
       SET psh.deleted_at = NOW()
       WHERE p.vine_row_id = ? AND psh.deleted_at IS NULL`,
      [id]
    )

    await conn.query(
      "UPDATE plants SET deleted_at = NOW() WHERE vine_row_id = ? AND deleted_at IS NULL",
      [id]
    )

    await conn.query(
      "UPDATE vine_rows SET deleted_at = NOW() WHERE id = ?",
      [id]
    )

    await conn.commit()
    res.json({ message: "Fila eliminada" })
  } catch (error) {
    await conn.rollback()
    console.error(error)
    res.status(500).json({ message: "Error al eliminar fila" })
  } finally {
    conn.release()
  }
}

export const restoreVineRow = async (req, res) => {
  const { id } = req.params
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    await conn.query(
      "UPDATE vine_rows SET deleted_at = NULL WHERE id = ?",
      [id]
    )

    await conn.query(
      "UPDATE plants SET deleted_at = NULL WHERE vine_row_id = ?",
      [id]
    )

    await conn.query(
      `UPDATE plant_status_history psh
       JOIN plants p ON psh.plant_id = p.id
       SET psh.deleted_at = NULL
       WHERE p.vine_row_id = ?`,
      [id]
    )

    await conn.commit()
    res.json({ message: "Fila restaurada" })
  } catch (error) {
    await conn.rollback()
    console.error(error)
    res.status(500).json({ message: "Error al restaurar fila" })
  } finally {
    conn.release()
  }
}
