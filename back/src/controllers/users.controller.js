import { pool } from "../db.js"
import bcrypt from "bcrypt"

export const createUser = async (req, res) => {
  const { nombre, apellido, dni, email, password, rol } = req.body

  try {
    if (!email || !password || !rol || !dni) {
      return res.status(400).json({ message: "Faltan datos obligatorios" })
    }

    const [exists] = await pool.query(
      "SELECT id FROM users WHERE email = ? AND deleted_at IS NULL",
      [email]
    )

    if (exists.length > 0) {
      return res.status(409).json({ message: "El usuario ya existe" })
    }

    const password_hash = await bcrypt.hash(password, 10)

    const [result] = await pool.query(
      `INSERT INTO users (nombre, apellido, dni, email, password_hash, rol)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, apellido, dni, email, password_hash, rol]
    )

    res.status(201).json({
      id: result.insertId,
      nombre,
      apellido,
      email,
      rol,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al crear usuario" })
  }
}

export const getUsers = async (req, res) => {
  const { usuario } = req

  try {
    if (usuario?.role === "admin") {
      const [rows] = await pool.query(`
        SELECT id, nombre, apellido, dni, email, rol, created_at, deleted_at
        FROM users
        ORDER BY created_at DESC
      `)
      return res.json(rows)
    }

    const [rows] = await pool.query(
      "SELECT id, nombre, apellido, dni, email, rol, created_at FROM users WHERE id = ?",
      [usuario.id]
    )

    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al obtener usuarios" })
  }
}

export const getMe = async (req, res) => {
  const { usuario } = req

  try {
    const [rows] = await pool.query(
      "SELECT id, nombre, apellido, dni, email, rol, created_at FROM users WHERE id = ?",
      [usuario.id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" })
    }

    res.json(rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al obtener usuario" })
  }
}

export const getUser = async (req, res) => {
  const { id } = req.params

  try {
    const [rows] = await pool.query(
      "SELECT id, nombre, apellido, dni, email, rol, created_at FROM users WHERE id = ?",
      [id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" })
    }

    res.json(rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al obtener usuario" })
  }
}

export const updateUser = async (req, res) => {
  const { id } = req.params
  const { usuario } = req
  const { nombre, apellido, dni, email, rol, password } = req.body

  try {
    if (usuario?.role !== "admin" && usuario?.id !== parseInt(id)) {
      return res.status(403).json({ message: "No tenés permiso para editar este usuario" })
    }

    const fields = []
    const values = []

    if (nombre !== undefined) { fields.push("nombre = ?"); values.push(nombre) }
    if (apellido !== undefined) { fields.push("apellido = ?"); values.push(apellido) }
    if (dni !== undefined) { fields.push("dni = ?"); values.push(dni) }
    if (email !== undefined) { fields.push("email = ?"); values.push(email) }
    if (rol !== undefined && usuario?.role === "admin") { fields.push("rol = ?"); values.push(rol) }
    if (password !== undefined) {
      fields.push("password_hash = ?")
      values.push(await bcrypt.hash(password, 10))
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: "No hay campos para actualizar" })
    }

    values.push(id)
    await pool.query(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values)

    res.json({ message: "Usuario actualizado" })
  } catch (error) {
    console.error(error)
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "El email o DNI ya está en uso" })
    }
    res.status(500).json({ message: "Error al actualizar usuario" })
  }
}

export const deleteUser = async (req, res) => {
  const { id } = req.params
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    await conn.query(
      "UPDATE plant_prunings SET realizada_por = NULL WHERE realizada_por = ?",
      [id]
    )

    await conn.query(
      "UPDATE users SET deleted_at = NOW() WHERE id = ?",
      [id]
    )

    await conn.commit()
    res.json({ message: "Usuario eliminado" })
  } catch (error) {
    await conn.rollback()
    console.error(error)
    res.status(500).json({ message: "Error al eliminar usuario" })
  } finally {
    conn.release()
  }
}

export const getActiveUsers = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, nombre, apellido, rol FROM users WHERE deleted_at IS NULL ORDER BY nombre, apellido"
    )
    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al obtener usuarios activos" })
  }
}

export const restoreUser = async (req, res) => {
  const { id } = req.params

  try {
    await pool.query(
      "UPDATE users SET deleted_at = NULL WHERE id = ?",
      [id]
    )
    res.json({ message: "Usuario restaurado" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al restaurar usuario" })
  }
}
