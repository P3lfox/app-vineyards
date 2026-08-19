import { pool } from "../db.js"

export const createPlot = async (req, res) => {
  const { vineyard_id, nombre, area_m2, irrigation_system_id, forma_parcela, terreno } = req.body

  try {
    if (!vineyard_id || !nombre) {
      return res.status(400).json({ message: "Faltan datos obligatorios" })
    }

    const [vineyardExists] = await pool.query(
      "SELECT id FROM vineyards WHERE id = ? AND deleted_at IS NULL",
      [vineyard_id]
    )

    if (vineyardExists.length === 0) {
      return res.status(404).json({ message: "Viñedo no encontrado" })
    }

    const [result] = await pool.query(
      `INSERT INTO plots (vineyard_id, nombre, area_m2, irrigation_system_id, forma_parcela, terreno)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [vineyard_id, nombre, area_m2, irrigation_system_id || null, forma_parcela || 'rectangular', terreno || 'plano']
    )

    res.status(201).json({
      id: result.insertId,
      vineyard_id,
      nombre,
      area_m2,
      irrigation_system_id: irrigation_system_id || null,
      forma_parcela: forma_parcela || 'rectangular',
      terreno: terreno || 'plano',
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al crear parcela" })
  }
}

export const getPlot = async (req, res) => {
  const { id } = req.params

  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.nombre, p.area_m2, p.vineyard_id, p.irrigation_system_id, p.created_at,
              p.forma_parcela, p.terreno,
              ist.tipo as sistema_tipo
       FROM plots p
       LEFT JOIN irrigation_systems ist ON p.irrigation_system_id = ist.id
       WHERE p.id = ?`,
      [id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: "Parcela no encontrada" })
    }

    res.json(rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al obtener parcela" })
  }
}

export const getPlots = async (req, res) => {
  const { vineyard_id } = req.query
  const { usuario } = req

  try {
    const filter = usuario?.role === "admin" ? "" : "AND p.deleted_at IS NULL"

    let query = `SELECT p.id, p.nombre, p.area_m2, p.vineyard_id, p.irrigation_system_id, p.created_at, p.deleted_at,
                        p.forma_parcela, p.terreno,
                        v.nombre as vineyard_nombre,
                        ist.tipo as sistema_tipo
                 FROM plots p
                 JOIN vineyards v ON p.vineyard_id = v.id
                 LEFT JOIN irrigation_systems ist ON p.irrigation_system_id = ist.id
                 WHERE 1=1 ${filter}`
    const params = []

    if (vineyard_id) {
      query += " AND p.vineyard_id = ?"
      params.push(vineyard_id)
    }

    query += " ORDER BY p.created_at DESC"

    const [rows] = await pool.query(query, params)
    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al obtener parcelas" })
  }
}

export const updatePlot = async (req, res) => {
  const { id } = req.params
  const { nombre, area_m2, irrigation_system_id, forma_parcela, terreno } = req.body

  try {
    const fields = []
    const values = []

    if (nombre !== undefined) { fields.push("nombre = ?"); values.push(nombre) }
    if (area_m2 !== undefined) { fields.push("area_m2 = ?"); values.push(area_m2) }
    if (irrigation_system_id !== undefined) { fields.push("irrigation_system_id = ?"); values.push(irrigation_system_id || null) }
    if (forma_parcela !== undefined) { fields.push("forma_parcela = ?"); values.push(forma_parcela) }
    if (terreno !== undefined) { fields.push("terreno = ?"); values.push(terreno) }

    if (fields.length === 0) {
      return res.status(400).json({ message: "No hay campos para actualizar" })
    }

    values.push(id)
    await pool.query(`UPDATE plots SET ${fields.join(", ")} WHERE id = ?`, values)

    res.json({ message: "Parcela actualizada" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al actualizar parcela" })
  }
}

export const deletePlot = async (req, res) => {
  const { id } = req.params
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    await conn.query(
      `UPDATE plant_status_history psh
       JOIN plants p ON psh.plant_id = p.id
       JOIN vine_rows vr ON p.vine_row_id = vr.id
       SET psh.deleted_at = NOW()
       WHERE vr.plot_id = ? AND psh.deleted_at IS NULL`,
      [id]
    )

    await conn.query(
      `UPDATE plants p
       JOIN vine_rows vr ON p.vine_row_id = vr.id
       SET p.deleted_at = NOW()
       WHERE vr.plot_id = ? AND p.deleted_at IS NULL`,
      [id]
    )

    await conn.query(
      "UPDATE vine_rows SET deleted_at = NOW() WHERE plot_id = ? AND deleted_at IS NULL",
      [id]
    )

    await conn.query(
      "UPDATE plots SET deleted_at = NOW() WHERE id = ?",
      [id]
    )

    await conn.commit()
    res.json({ message: "Parcela eliminada" })
  } catch (error) {
    await conn.rollback()
    console.error(error)
    res.status(500).json({ message: "Error al eliminar parcela" })
  } finally {
    conn.release()
  }
}

export const restorePlot = async (req, res) => {
  const { id } = req.params
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    await conn.query(
      "UPDATE plots SET deleted_at = NULL WHERE id = ?",
      [id]
    )

    await conn.query(
      "UPDATE vine_rows SET deleted_at = NULL WHERE plot_id = ?",
      [id]
    )

    await conn.query(
      `UPDATE plants p
       JOIN vine_rows vr ON p.vine_row_id = vr.id
       SET p.deleted_at = NULL
       WHERE vr.plot_id = ?`,
      [id]
    )

    await conn.query(
      `UPDATE plant_status_history psh
       JOIN plants p ON psh.plant_id = p.id
       JOIN vine_rows vr ON p.vine_row_id = vr.id
       SET psh.deleted_at = NULL
       WHERE vr.plot_id = ?`,
      [id]
    )

    await conn.commit()
    res.json({ message: "Parcela restaurada" })
  } catch (error) {
    await conn.rollback()
    console.error(error)
    res.status(500).json({ message: "Error al restaurar parcela" })
  } finally {
    conn.release()
  }
}
