import jwt from "jsonwebtoken"

export const verificarToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1]

  if (!token) {
    return res.status(401).json({ message: "Token no proporcionado" })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.usuario = decoded
    next()
  } catch (err) {
    return res.status(401).json({ message: "Token inválido o expirado" })
  }
}
