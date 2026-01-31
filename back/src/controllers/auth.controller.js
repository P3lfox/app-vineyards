import { pool } from "../db.js"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

export const login = async (req, res) => {
  const { email, password } = req.body

  try {
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE email = ? AND deleted_at IS NULL",
      [email]
    )

    if (rows.length === 0) {
      return res.status(401).json({ message: "Usuario no encontrado" })
    }

    const user = rows[0]
    const valid = await bcrypt.compare(password, user.password_hash)

    if (!valid) {
      return res.status(401).json({ message: "Contraseña incorrecta" })
    }

    const token = jwt.sign(
      { id: user.id, role: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    )

    res.json({
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        rol: user.rol,
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Error en el servidor" })
  }
}
