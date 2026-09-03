import { pool } from "../db.js"

// Valida los campos geográficos de una parcela.
// Acepta undefined (campo no enviado) y null (limpiar el campo).
// Devuelve un mensaje de error en español, o null si todo es válido.
const validarCamposGeo = (campos) => {
  const { latitud, longitud, altitud, orientacion_norte_grados, orientacion_hileras } = campos

  if (latitud !== undefined && latitud !== null) {
    const n = Number(latitud)
    if (Number.isNaN(n) || n < -90 || n > 90) {
      return "La latitud debe ser un número entre -90 y 90"
    }
  }
  if (longitud !== undefined && longitud !== null) {
    const n = Number(longitud)
    if (Number.isNaN(n) || n < -180 || n > 180) {
      return "La longitud debe ser un número entre -180 y 180"
    }
  }
  if (altitud !== undefined && altitud !== null) {
    const n = Number(altitud)
    if (Number.isNaN(n)) {
      return "La altitud debe ser un número"
    }
  }
  if (orientacion_norte_grados !== undefined && orientacion_norte_grados !== null) {
    const n = Number(orientacion_norte_grados)
    if (!Number.isInteger(n) || n < 0 || n > 359) {
      return "La orientación del norte debe ser un entero entre 0 y 359"
    }
  }
  if (orientacion_hileras !== undefined && orientacion_hileras !== null) {
    if (typeof orientacion_hileras !== "string" || orientacion_hileras.length === 0 || orientacion_hileras.length > 10) {
      return "La orientación de las hileras debe ser un texto de hasta 10 caracteres"
    }
  }
  return null
}

export const createPlot = async (req, res) => {
  const { vineyard_id, nombre, area_m2, irrigation_system_id, forma_parcela, terreno,
          latitud, longitud, altitud, orientacion_norte_grados, orientacion_hileras } = req.body

  try {
    if (!vineyard_id || !nombre) {
      return res.status(400).json({ message: "Faltan datos obligatorios" })
    }

    const errorGeo = validarCamposGeo(req.body)
    if (errorGeo) {
      return res.status(400).json({ message: errorGeo })
    }

    const [vineyardExists] = await pool.query(
      "SELECT id FROM vineyards WHERE id = ? AND deleted_at IS NULL",
      [vineyard_id]
    )

    if (vineyardExists.length === 0) {
      return res.status(404).json({ message: "Viñedo no encontrado" })
    }

    const [result] = await pool.query(
      `INSERT INTO plots (vineyard_id, nombre, area_m2, irrigation_system_id, forma_parcela, terreno,
                          latitud, longitud, altitud, orientacion_norte_grados, orientacion_hileras)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [vineyard_id, nombre, area_m2, irrigation_system_id || null, forma_parcela || 'rectangular', terreno || 'plano',
       latitud ?? null, longitud ?? null, altitud ?? null, orientacion_norte_grados ?? null, orientacion_hileras ?? null]
    )

    res.status(201).json({
      id: result.insertId,
      vineyard_id,
      nombre,
      area_m2,
      irrigation_system_id: irrigation_system_id || null,
      forma_parcela: forma_parcela || 'rectangular',
      terreno: terreno || 'plano',
      latitud: latitud ?? null,
      longitud: longitud ?? null,
      altitud: altitud ?? null,
      orientacion_norte_grados: orientacion_norte_grados ?? null,
      orientacion_hileras: orientacion_hileras ?? null,
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
              p.latitud, p.longitud, p.altitud, p.orientacion_norte_grados, p.orientacion_hileras,
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
                        p.latitud, p.longitud, p.altitud, p.orientacion_norte_grados, p.orientacion_hileras,
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
  const { nombre, area_m2, irrigation_system_id, forma_parcela, terreno,
          latitud, longitud, altitud, orientacion_norte_grados, orientacion_hileras } = req.body

  try {
    const errorGeo = validarCamposGeo(req.body)
    if (errorGeo) {
      return res.status(400).json({ message: errorGeo })
    }

    const fields = []
    const values = []

    if (nombre !== undefined) { fields.push("nombre = ?"); values.push(nombre) }
    if (area_m2 !== undefined) { fields.push("area_m2 = ?"); values.push(area_m2) }
    if (irrigation_system_id !== undefined) { fields.push("irrigation_system_id = ?"); values.push(irrigation_system_id || null) }
    if (forma_parcela !== undefined) { fields.push("forma_parcela = ?"); values.push(forma_parcela) }
    if (terreno !== undefined) { fields.push("terreno = ?"); values.push(terreno) }
    if (latitud !== undefined) { fields.push("latitud = ?"); values.push(latitud) }
    if (longitud !== undefined) { fields.push("longitud = ?"); values.push(longitud) }
    if (altitud !== undefined) { fields.push("altitud = ?"); values.push(altitud) }
    if (orientacion_norte_grados !== undefined) { fields.push("orientacion_norte_grados = ?"); values.push(orientacion_norte_grados) }
    if (orientacion_hileras !== undefined) { fields.push("orientacion_hileras = ?"); values.push(orientacion_hileras) }

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

export const getPlotGeo = async (req, res) => {
  const { id } = req.params

  try {
    const [rows] = await pool.query(
      `SELECT p.nombre, p.area_m2, p.latitud, p.longitud, p.altitud,
              p.orientacion_norte_grados, p.orientacion_hileras
       FROM plots p
       WHERE p.id = ?`,
      [id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: "Parcela no encontrada" })
    }

    res.json(rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al obtener datos geográficos" })
  }
}

export const updatePlotGeo = async (req, res) => {
  const { id } = req.params
  const { usuario } = req
  const { latitud, longitud, altitud, orientacion_norte_grados, orientacion_hileras } = req.body

  try {
    // Solo admin y enólogo pueden editar datos geográficos
    if (usuario?.role !== "admin" && usuario?.role !== "enologo") {
      return res.status(403).json({ message: "No tienes permiso para editar datos geográficos" })
    }

    const errorGeo = validarCamposGeo(req.body)
    if (errorGeo) {
      return res.status(400).json({ message: errorGeo })
    }

    const [rows] = await pool.query("SELECT id FROM plots WHERE id = ?", [id])
    if (rows.length === 0) {
      return res.status(404).json({ message: "Parcela no encontrada" })
    }

    const fields = []
    const values = []

    // null limpia el campo; undefined significa "no actualizar"
    if (latitud !== undefined) { fields.push("latitud = ?"); values.push(latitud) }
    if (longitud !== undefined) { fields.push("longitud = ?"); values.push(longitud) }
    if (altitud !== undefined) { fields.push("altitud = ?"); values.push(altitud) }
    if (orientacion_norte_grados !== undefined) { fields.push("orientacion_norte_grados = ?"); values.push(orientacion_norte_grados) }
    if (orientacion_hileras !== undefined) { fields.push("orientacion_hileras = ?"); values.push(orientacion_hileras) }

    if (fields.length === 0) {
      return res.status(400).json({ message: "No hay campos para actualizar" })
    }

    values.push(id)
    await pool.query(`UPDATE plots SET ${fields.join(", ")} WHERE id = ?`, values)

    res.json({ message: "Datos geográficos actualizados" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al actualizar datos geográficos" })
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
