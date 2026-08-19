import { pool } from "../db.js"

export const createPlant = async (req, res) => {
  const { vine_row_id, varietal_id, sistema_conduccion, codigo, latitud, longitud, vigor, tutor, fecha_plantacion, metodo_propagacion, observaciones, posicion_en_fila } = req.body

  try {
    if (!vine_row_id || !sistema_conduccion) {
      return res.status(400).json({ message: "Faltan datos obligatorios" })
    }

    const [rowExists] = await pool.query(
      "SELECT id FROM vine_rows WHERE id = ? AND deleted_at IS NULL",
      [vine_row_id]
    )

    if (rowExists.length === 0) {
      return res.status(404).json({ message: "Fila no encontrada" })
    }

    if (varietal_id) {
      const [varietalExists] = await pool.query(
        "SELECT id FROM varietals WHERE id = ? AND deleted_at IS NULL",
        [varietal_id]
      )

      if (varietalExists.length === 0) {
        return res.status(404).json({ message: "Varietal no encontrado" })
      }
    }

    // Auto-assign posicion_en_fila if not provided
    let posEnFila = posicion_en_fila
    if (posEnFila === undefined || posEnFila === null) {
      const [existing] = await pool.query(
        "SELECT COALESCE(MAX(posicion_en_fila), 0) + 1 as next_pos FROM plants WHERE vine_row_id = ? AND deleted_at IS NULL",
        [vine_row_id]
      )
      posEnFila = existing[0].next_pos
    }

    const [result] = await pool.query(
      `INSERT INTO plants (vine_row_id, varietal_id, sistema_conduccion, codigo, latitud, longitud, vigor, tutor, fecha_plantacion, metodo_propagacion, observaciones, posicion_en_fila)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [vine_row_id, varietal_id || null, sistema_conduccion, codigo || null, latitud || null, longitud || null, vigor || null, tutor || false, fecha_plantacion || null, metodo_propagacion || null, observaciones || null, posEnFila]
    )

    res.status(201).json({
      id: result.insertId,
      vine_row_id,
      varietal_id: varietal_id || null,
      sistema_conduccion,
      codigo,
      latitud,
      longitud,
      vigor: vigor || null,
      tutor: tutor || false,
      fecha_plantacion: fecha_plantacion || null,
      metodo_propagacion: metodo_propagacion || null,
      observaciones: observaciones || null,
      posicion_en_fila: posEnFila,
    })
  } catch (error) {
    console.error(error)
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Ya existe una planta con ese código" })
    }
    res.status(500).json({ message: "Error al crear planta" })
  }
}

export const createPlantsBatch = async (req, res) => {
  const { plants } = req.body

  try {
    if (!Array.isArray(plants) || plants.length === 0) {
      return res.status(400).json({ message: "Falta array de plantas" })
    }

    // Group by vine_row_id to auto-assign posicion_en_fila per row
    const plantsByRow = new Map()
    for (const p of plants) {
      const rowId = p.vine_row_id
      if (!plantsByRow.has(rowId)) {
        plantsByRow.set(rowId, [])
      }
      plantsByRow.set(rowId, [...plantsByRow.get(rowId), p])
    }

    // Get current max posicion_en_fila for each row
    const rowIds = Array.from(plantsByRow.keys())
    let nextPosByRow = {}
    if (rowIds.length > 0) {
      const placeholders = rowIds.map(() => "?").join(", ")
      const [existing] = await pool.query(
        `SELECT vine_row_id, COALESCE(MAX(posicion_en_fila), 0) as max_pos FROM plants WHERE vine_row_id IN (${placeholders}) AND deleted_at IS NULL GROUP BY vine_row_id`,
        rowIds
      )
      for (const row of existing) {
        nextPosByRow[row.vine_row_id] = row.max_pos + 1
      }
      // Initialize rows that have no existing plants
      for (const rowId of rowIds) {
        if (nextPosByRow[rowId] === undefined) {
          nextPosByRow[rowId] = 1
        }
      }
    }

    const values = plants.map(p => {
      let posEnFila = p.posicion_en_fila
      if (posEnFila === undefined || posEnFila === null) {
        posEnFila = nextPosByRow[p.vine_row_id] || 1
        nextPosByRow[p.vine_row_id] = posEnFila + 1
      }
      return [
        p.vine_row_id, p.varietal_id || null, p.sistema_conduccion || "espaldera",
        p.codigo || null, p.latitud || null, p.longitud || null,
        p.vigor || null, p.tutor || false, p.fecha_plantacion || null,
        p.metodo_propagacion || null, p.observaciones || null, posEnFila
      ]
    })
    const placeholders = values.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ")
    const flatValues = values.flat()

    await pool.query(
      `INSERT INTO plants (vine_row_id, varietal_id, sistema_conduccion, codigo, latitud, longitud, vigor, tutor, fecha_plantacion, metodo_propagacion, observaciones, posicion_en_fila)
       VALUES ${placeholders}`,
      flatValues
    )

    res.status(201).json({ message: `${plants.length} planta(s) creadas` })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al crear plantas" })
  }
}

export const updatePlant = async (req, res) => {
  const { id } = req.params
  const { varietal_id, sistema_conduccion, codigo, latitud, longitud, vigor, tutor, fecha_plantacion, metodo_propagacion, observaciones, posicion_en_fila } = req.body

  try {
    const fields = []
    const values = []

    if (varietal_id !== undefined) {
      fields.push("varietal_id = ?")
      values.push(varietal_id)
    }
    if (sistema_conduccion !== undefined) {
      fields.push("sistema_conduccion = ?")
      values.push(sistema_conduccion)
    }
    if (codigo !== undefined) {
      fields.push("codigo = ?")
      values.push(codigo)
    }
    if (latitud !== undefined) {
      fields.push("latitud = ?")
      values.push(latitud)
    }
    if (longitud !== undefined) {
      fields.push("longitud = ?")
      values.push(longitud)
    }
    if (vigor !== undefined) {
      fields.push("vigor = ?")
      values.push(vigor)
    }
    if (tutor !== undefined) {
      fields.push("tutor = ?")
      values.push(tutor)
    }
    if (fecha_plantacion !== undefined) {
      fields.push("fecha_plantacion = ?")
      values.push(fecha_plantacion)
    }
    if (metodo_propagacion !== undefined) {
      fields.push("metodo_propagacion = ?")
      values.push(metodo_propagacion)
    }
    if (observaciones !== undefined) {
      fields.push("observaciones = ?")
      values.push(observaciones)
    }
    if (posicion_en_fila !== undefined) {
      fields.push("posicion_en_fila = ?")
      values.push(posicion_en_fila)
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: "No hay campos para actualizar" })
    }

    values.push(id)
    await pool.query(
      `UPDATE plants SET ${fields.join(", ")} WHERE id = ?`,
      values
    )

    res.json({ message: "Planta actualizada" })
  } catch (error) {
    console.error(error)
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Ya existe una planta con ese código" })
    }
    res.status(500).json({ message: "Error al actualizar planta" })
  }
}

export const getPlant = async (req, res) => {
  const { id } = req.params

  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.varietal_id, p.codigo, p.sistema_conduccion, p.latitud, p.longitud,
              p.vine_row_id, p.created_at, p.deleted_at,
              p.vigor, p.tutor, p.fecha_plantacion, p.metodo_propagacion, p.observaciones,
              p.posicion_en_fila,
              v.nombre as varietal_nombre, v.tipo as varietal_tipo,
              vr.numero as row_numero, vr.plot_id
       FROM plants p
       LEFT JOIN varietals v ON p.varietal_id = v.id
       JOIN vine_rows vr ON p.vine_row_id = vr.id
       WHERE p.id = ?`,
      [id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: "Planta no encontrada" })
    }

    res.json(rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al obtener planta" })
  }
}

export const getPlants = async (req, res) => {
  const { vine_row_id, plot_id } = req.query
  const { usuario } = req

  try {
    let query = `
      SELECT p.id, p.varietal_id, p.codigo, p.sistema_conduccion, p.latitud, p.longitud,
             p.vine_row_id, p.created_at, p.deleted_at,
             p.vigor, p.tutor, p.fecha_plantacion, p.metodo_propagacion, p.observaciones,
             p.posicion_en_fila,
             v.nombre as varietal_nombre, v.tipo as varietal_tipo,
             vr.numero as row_numero, vr.plot_id
      FROM plants p
      LEFT JOIN varietals v ON p.varietal_id = v.id
      JOIN vine_rows vr ON p.vine_row_id = vr.id
      WHERE 1=1`

    const filter = usuario?.role === "admin" ? "" : "AND p.deleted_at IS NULL"
    query += ` ${filter}`

    const params = []

    if (vine_row_id) {
      query += " AND p.vine_row_id = ?"
      params.push(vine_row_id)
    }

    if (plot_id) {
      query += " AND vr.plot_id = ?"
      params.push(plot_id)
    }

    query += " ORDER BY vr.numero, p.posicion_en_fila, p.id"

    const [rows] = await pool.query(query, params)
    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al obtener plantas" })
  }
}

export const deletePlant = async (req, res) => {
  const { id } = req.params
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    await conn.query(
      "UPDATE plant_status_history SET deleted_at = NOW() WHERE plant_id = ? AND deleted_at IS NULL",
      [id]
    )
    await conn.query(
      "UPDATE plant_diseases SET deleted_at = NOW() WHERE plant_id = ? AND deleted_at IS NULL",
      [id]
    )
    await conn.query(
      "UPDATE plant_treatments SET deleted_at = NOW() WHERE plant_id = ? AND deleted_at IS NULL",
      [id]
    )
    await conn.query(
      "UPDATE plant_notes SET deleted_at = NOW() WHERE plant_id = ? AND deleted_at IS NULL",
      [id]
    )
    await conn.query(
      "UPDATE plant_yield SET deleted_at = NOW() WHERE plant_id = ? AND deleted_at IS NULL",
      [id]
    )
    await conn.query(
      "UPDATE plant_prunings SET deleted_at = NOW() WHERE plant_id = ? AND deleted_at IS NULL",
      [id]
    )
    await conn.query(
      "UPDATE plant_propagation SET deleted_at = NOW() WHERE plant_id = ? AND deleted_at IS NULL",
      [id]
    )

    await conn.query(
      "UPDATE plants SET deleted_at = NOW() WHERE id = ?",
      [id]
    )

    await conn.commit()
    res.json({ message: "Planta eliminada" })
  } catch (error) {
    await conn.rollback()
    console.error(error)
    res.status(500).json({ message: "Error al eliminar planta" })
  } finally {
    conn.release()
  }
}

export const restorePlant = async (req, res) => {
  const { id } = req.params
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    await conn.query(
      "UPDATE plants SET deleted_at = NULL WHERE id = ?",
      [id]
    )

    await conn.query(
      "UPDATE plant_status_history SET deleted_at = NULL WHERE plant_id = ?",
      [id]
    )
    await conn.query(
      "UPDATE plant_diseases SET deleted_at = NULL WHERE plant_id = ?",
      [id]
    )
    await conn.query(
      "UPDATE plant_treatments SET deleted_at = NULL WHERE plant_id = ?",
      [id]
    )
    await conn.query(
      "UPDATE plant_notes SET deleted_at = NULL WHERE plant_id = ?",
      [id]
    )
    await conn.query(
      "UPDATE plant_yield SET deleted_at = NULL WHERE plant_id = ?",
      [id]
    )
    await conn.query(
      "UPDATE plant_prunings SET deleted_at = NULL WHERE plant_id = ?",
      [id]
    )
    await conn.query(
      "UPDATE plant_propagation SET deleted_at = NULL WHERE plant_id = ?",
      [id]
    )

    await conn.commit()
    res.json({ message: "Planta restaurada" })
  } catch (error) {
    await conn.rollback()
    console.error(error)
    res.status(500).json({ message: "Error al restaurar planta" })
  } finally {
    conn.release()
  }
}
