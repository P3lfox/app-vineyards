import axios from "axios"

export const api = axios.create({
  baseURL: "/api",
})

// Adjunta el token JWT en cada request automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Si el back responde 401, manda al login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token")
      localStorage.removeItem("role")
      localStorage.removeItem("userId")
      window.location.href = "/login"
    }
    return Promise.reject(error)
  }
)
