import { pool } from "../db.js"

export const createVineyard = async (req, res) => {
  const { nombre, ubicacion, varietal_ids } = req.body

  try {
    if (!nombre || !ubicacion) {
      return res.status(400).json({ message: "Faltan datos obligatorios" })
    }

    const [exists] = await pool.query(
      "SELECT nombre FROM vineyards WHERE nombre = ? AND deleted_at IS NULL",
      [nombre]
    )

    if (exists.length > 0) {
      return res.status(409).json({ message: "Ya existe un viñedo con ese nombre" })
    }

    const [result] = await pool.query(
      `INSERT INTO vineyards (nombre, ubicacion) VALUES (?, ?)`,
      [nombre, ubicacion]
    )

    const vineyardId = result.insertId

    if (Array.isArray(varietal_ids) && varietal_ids.length > 0) {
      const values = varietal_ids.map(id => [vineyardId, id])
      const placeholders = values.map(() => "(?, ?)").join(", ")
      const flatValues = values.flat()

      await pool.query(
        `INSERT INTO vineyard_varietals (vineyard_id, varietal_id) VALUES ${placeholders}`,
        flatValues
      )
    }

    res.status(201).json({
      id: vineyardId,
      nombre,
      ubicacion
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al crear viñedo" })
  }
}

export const getVineyard = async (req, res) => {
  const { usuario } = req

  try {
    const filter = usuario?.role === "admin" ? "" : "WHERE deleted_at IS NULL"

    const [vineyards] = await pool.query(`
      SELECT id, nombre, ubicacion, created_at, deleted_at
      FROM vineyards
      ${filter}
      ORDER BY created_at DESC
    `)

    if (vineyards.length === 0) {
      return res.json([])
    }

    const ids = vineyards.map(v => v.id)
    const [varietals] = await pool.query(
      `SELECT vv.vineyard_id, v.id as varietal_id, v.nombre, v.tipo
       FROM vineyard_varietals vv
       JOIN varietals v ON vv.varietal_id = v.id
       WHERE vv.vineyard_id IN (?) AND v.deleted_at IS NULL
       ORDER BY v.nombre`,
      [ids]
    )

    const varietalsByVineyard = {}
    varietals.forEach(v => {
      if (!varietalsByVineyard[v.vineyard_id]) varietalsByVineyard[v.vineyard_id] = []
      varietalsByVineyard[v.vineyard_id].push({ id: v.varietal_id, nombre: v.nombre, tipo: v.tipo })
    })

    const result = vineyards.map(v => ({
      ...v,
      varietales: varietalsByVineyard[v.id] || []
    }))

    res.json(result)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al obtener viñedos" })
  }
}

export const getVineyardById = async (req, res) => {
  const { id } = req.params

  try {
    const [rows] = await pool.query(
      "SELECT id, nombre, ubicacion, created_at FROM vineyards WHERE id = ?",
      [id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: "Viñedo no encontrado" })
    }

    res.json(rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al obtener viñedo" })
  }
}

export const updateVineyard = async (req, res) => {
  const { id } = req.params
  const { nombre, ubicacion } = req.body

  try {
    const fields = []
    const values = []

    if (nombre !== undefined) { fields.push("nombre = ?"); values.push(nombre) }
    if (ubicacion !== undefined) { fields.push("ubicacion = ?"); values.push(ubicacion) }

    if (fields.length === 0) {
      return res.status(400).json({ message: "No hay campos para actualizar" })
    }

    values.push(id)
    await pool.query(`UPDATE vineyards SET ${fields.join(", ")} WHERE id = ?`, values)

    res.json({ message: "Viñedo actualizado" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al actualizar viñedo" })
  }
}

export const deleteVineyard = async (req, res) => {
  const { id } = req.params
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    await conn.query(
      `UPDATE plant_status_history psh
       JOIN plants p ON psh.plant_id = p.id
       JOIN vine_rows vr ON p.vine_row_id = vr.id
       JOIN plots pl ON vr.plot_id = pl.id
       SET psh.deleted_at = NOW()
       WHERE pl.vineyard_id = ? AND psh.deleted_at IS NULL`,
      [id]
    )

    await conn.query(
      `UPDATE plants p
       JOIN vine_rows vr ON p.vine_row_id = vr.id
       JOIN plots pl ON vr.plot_id = pl.id
       SET p.deleted_at = NOW()
       WHERE pl.vineyard_id = ? AND p.deleted_at IS NULL`,
      [id]
    )

    await conn.query(
      `UPDATE vine_rows vr
       JOIN plots pl ON vr.plot_id = pl.id
       SET vr.deleted_at = NOW()
       WHERE pl.vineyard_id = ? AND vr.deleted_at IS NULL`,
      [id]
    )

    await conn.query(
      "UPDATE plots SET deleted_at = NOW() WHERE vineyard_id = ? AND deleted_at IS NULL",
      [id]
    )

    await conn.query(
      "UPDATE vineyards SET deleted_at = NOW() WHERE id = ?",
      [id]
    )

    await conn.commit()
    res.json({ message: "Viñedo eliminado" })
  } catch (error) {
    await conn.rollback()
    console.error(error)
    res.status(500).json({ message: "Error al eliminar viñedo" })
  } finally {
    conn.release()
  }
}

export const restoreVineyard = async (req, res) => {
  const { id } = req.params
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    await conn.query(
      "UPDATE vineyards SET deleted_at = NULL WHERE id = ?",
      [id]
    )

    await conn.query(
      "UPDATE plots SET deleted_at = NULL WHERE vineyard_id = ?",
      [id]
    )

    await conn.query(
      `UPDATE vine_rows vr
       JOIN plots pl ON vr.plot_id = pl.id
       SET vr.deleted_at = NULL
       WHERE pl.vineyard_id = ?`,
      [id]
    )

    await conn.query(
      `UPDATE plants p
       JOIN vine_rows vr ON p.vine_row_id = vr.id
       JOIN plots pl ON vr.plot_id = pl.id
       SET p.deleted_at = NULL
       WHERE pl.vineyard_id = ?`,
      [id]
    )

    await conn.query(
      `UPDATE plant_status_history psh
       JOIN plants p ON psh.plant_id = p.id
       JOIN vine_rows vr ON p.vine_row_id = vr.id
       JOIN plots pl ON vr.plot_id = pl.id
       SET psh.deleted_at = NULL
       WHERE pl.vineyard_id = ?`,
      [id]
    )

    await conn.commit()
    res.json({ message: "Viñedo restaurado" })
  } catch (error) {
    await conn.rollback()
    console.error(error)
    res.status(500).json({ message: "Error al restaurar viñedo" })
  } finally {
    conn.release()
  }
}
