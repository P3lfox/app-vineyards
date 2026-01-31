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
      `INSERT INTO users (nombre, apellido,dni, email, password_hash, rol)
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
