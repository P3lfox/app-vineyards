import { pool } from "../db.js"

const ESTADOS = ["pendiente", "en_progreso", "completada"]

const nullIfEmpty = (v) => (v === "" ? null : v)

const SELECT_TASK_BASE = `SELECT t.id, t.descripcion, t.estado, t.fecha_limite, t.plot_id,
                                 t.created_at, t.deleted_at, t.completed_at,
                                 p.nombre AS parcela,
                                 DATE_FORMAT(COALESCE(t.fecha_limite, t.created_at), '%d/%m/%Y') AS fecha
                          FROM tasks t
                          LEFT JOIN plots p ON t.plot_id = p.id`

const SELECT_TASK_WITH_ASSIGNEES = `SELECT t.id, t.descripcion, t.estado, t.fecha_limite, t.plot_id,
                                           t.created_at, t.deleted_at, t.completed_at,
                                           p.nombre AS parcela,
                                           DATE_FORMAT(COALESCE(t.fecha_limite, t.created_at), '%d/%m/%Y') AS fecha,
                                           u.id AS assignee_id, u.nombre AS assignee_nombre,
                                           u.apellido AS assignee_apellido, u.rol AS assignee_rol
                                    FROM tasks t
                                    LEFT JOIN plots p ON t.plot_id = p.id
                                    LEFT JOIN task_assignees ta ON ta.task_id = t.id
                                    LEFT JOIN users u ON ta.user_id = u.id`

const buildTaskFromRow = (row) => {
  const {
    assignee_id, assignee_nombre, assignee_apellido, assignee_rol,
    ...task
  } = row
  return task
}

const mergeAssignees = (tasks) => {
  const assigneesByTask = {}
  for (const t of tasks) {
    if (t.assignee_id !== null) {
      if (!assigneesByTask[t.id]) assigneesByTask[t.id] = []
      assigneesByTask[t.id].push({
        id: t.assignee_id,
        nombre: t.assignee_nombre,
        apellido: t.assignee_apellido,
        rol: t.assignee_rol,
      })
    }
  }
  return assigneesByTask
}

const attachAssignees = (task, assigneesByTask) => ({
  ...task,
  asignados: assigneesByTask[task.id] || [],
})

const validateUsers = async (conn, userIds) => {
  if (!Array.isArray(userIds) || userIds.length === 0) return
  const uniqueIds = [...new Set(userIds)]
  const [rows] = await conn.query(
    "SELECT id FROM users WHERE id IN (?) AND deleted_at IS NULL",
    [uniqueIds]
  )
  const foundIds = new Set(rows.map(r => r.id))
  const missing = uniqueIds.filter(id => !foundIds.has(id))
  if (missing.length > 0) {
    return missing
  }
  return null
}

const bulkInsertAssignees = async (conn, taskId, userIds) => {
  if (!Array.isArray(userIds) || userIds.length === 0) return
  const uniqueIds = [...new Set(userIds)]
  const values = uniqueIds.map(uid => [taskId, uid])
  const placeholders = values.map(() => "(?, ?)").join(", ")
  const flatValues = values.flat()
  await conn.query(
    `INSERT INTO task_assignees (task_id, user_id) VALUES ${placeholders}`,
    flatValues
  )
}

// --- Task State Transition helpers ---

/**
 * Returns true if user is admin OR is assigned to the task.
 */
export const canUserAccessTask = async (conn, taskId, userId, userRole) => {
  if (userRole === "admin") return true
  const [rows] = await conn.query(
    "SELECT 1 FROM task_assignees WHERE task_id = ? AND user_id = ?",
    [taskId, userId]
  )
  return rows.length > 0
}

/**
 * Transition matrix per role.
 * operario: only pendiente → en_progreso
 * enólogo/admin: any transition between valid states
 */
const TRANSITIONS = {
  operario: {
    pendiente: ["en_progreso"],
  },
  enologo: {
    pendiente: ["en_progreso", "completada"],
    en_progreso: ["pendiente", "completada"],
    completada: ["pendiente", "en_progreso"],
  },
  admin: {
    pendiente: ["en_progreso", "completada"],
    en_progreso: ["pendiente", "completada"],
    completada: ["pendiente", "en_progreso"],
  },
}

const reSelectTaskWithAssignees = async (conn, taskId) => {
  const [rows] = await conn.query(
    `${SELECT_TASK_WITH_ASSIGNEES} WHERE t.id = ?`,
    [taskId]
  )
  if (rows.length === 0) return null
  const assigneesByTask = mergeAssignees(rows)
  return attachAssignees(buildTaskFromRow(rows[0]), assigneesByTask)
}

export const createTask = async (req, res) => {
  const { descripcion, estado, fecha_limite, asignado_a_ids, plot_id } = req.body

  try {
    if (!descripcion?.trim()) {
      return res.status(400).json({ message: "La descripción es obligatoria" })
    }

    if (estado !== undefined && !ESTADOS.includes(estado)) {
      return res.status(400).json({ message: "Estado inválido" })
    }

    const fechaLimite = nullIfEmpty(fecha_limite) ?? null
    const plotId = nullIfEmpty(plot_id) ?? null

    if (plotId !== null) {
      const [plotExists] = await pool.query(
        "SELECT id FROM plots WHERE id = ? AND deleted_at IS NULL",
        [plotId]
      )
      if (plotExists.length === 0) {
        return res.status(404).json({ message: "Parcela no encontrada" })
      }
    }

    // Validate assignees before transaction
    if (asignado_a_ids !== undefined && Array.isArray(asignado_a_ids) && asignado_a_ids.length > 0) {
      const missing = await validateUsers(pool, asignado_a_ids)
      if (missing) {
        return res.status(404).json({ message: `Usuario(s) no encontrado(s): ${missing.join(", ")}` })
      }
    }

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()

      const [result] = await conn.query(
        `INSERT INTO tasks (descripcion, estado, fecha_limite, plot_id)
         VALUES (?, ?, ?, ?)`,
        [descripcion, estado ?? "pendiente", fechaLimite, plotId]
      )

      const taskId = result.insertId

      if (asignado_a_ids !== undefined && Array.isArray(asignado_a_ids)) {
        await bulkInsertAssignees(conn, taskId, asignado_a_ids)
      }

      const task = await reSelectTaskWithAssignees(conn, taskId)
      await conn.commit()
      res.status(201).json(task)
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al crear tarea" })
  }
}

export const getTask = async (req, res) => {
  const { id } = req.params
  const { usuario } = req

  try {
    const filter = usuario?.role === "admin" ? "" : "AND t.deleted_at IS NULL"

    const [rows] = await pool.query(
      `${SELECT_TASK_WITH_ASSIGNEES}
       WHERE t.id = ? ${filter}`,
      [id]
    )

    if (rows.length === 0 || (rows.length === 1 && rows[0].id === null)) {
      return res.status(404).json({ message: "Tarea no encontrada" })
    }

    const assigneesByTask = mergeAssignees(rows)
    const task = attachAssignees(buildTaskFromRow(rows[0]), assigneesByTask)
    res.json(task)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al obtener tarea" })
  }
}

export const getTasks = async (req, res) => {
  const { plot_id, include_deleted } = req.query
  const { usuario } = req

  try {
    // Only admin can request deleted tasks; non-admin always filters them out
    const canSeeDeleted = usuario?.role === "admin" && include_deleted === "1"
    const filter = canSeeDeleted ? "" : "AND t.deleted_at IS NULL"

    // Q1: Fetch tasks
    let query = `${SELECT_TASK_BASE} WHERE 1=1 ${filter}`
    const params = []

    if (plot_id) {
      query += " AND t.plot_id = ?"
      params.push(plot_id)
    }

    query += " ORDER BY t.created_at DESC"

    const [taskRows] = await pool.query(query, params)

    if (taskRows.length === 0) {
      return res.json([])
    }

    // Q2: Fetch assignees for these tasks
    const taskIds = taskRows.map(t => t.id)
    const [assigneeRows] = await pool.query(
      `SELECT ta.task_id, u.id, u.nombre, u.apellido, u.rol
       FROM task_assignees ta
       JOIN users u ON ta.user_id = u.id
       WHERE ta.task_id IN (?)`,
      [taskIds]
    )

    // Merge
    const assigneesByTask = {}
    for (const a of assigneeRows) {
      if (!assigneesByTask[a.task_id]) assigneesByTask[a.task_id] = []
      assigneesByTask[a.task_id].push({
        id: a.id,
        nombre: a.nombre,
        apellido: a.apellido,
        rol: a.rol,
      })
    }

    const result = taskRows.map(t => ({
      ...t,
      asignados: assigneesByTask[t.id] || [],
    }))

    res.json(result)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al obtener tareas" })
  }
}

export const updateTask = async (req, res) => {
  const { id } = req.params
  const { descripcion, estado, fecha_limite, asignado_a_ids, plot_id } = req.body
  const { usuario } = req

  try {
    const [taskExists] = await pool.query(
      "SELECT id, estado FROM tasks WHERE id = ? AND deleted_at IS NULL",
      [id]
    )

    if (taskExists.length === 0) {
      return res.status(404).json({ message: "Tarea no encontrada" })
    }

    if (estado !== undefined && !ESTADOS.includes(estado)) {
      return res.status(400).json({ message: "Estado inválido" })
    }

    // Ownership guard: non-admin must be assigned to the task
    if (usuario?.role !== "admin") {
      const conn = await pool.getConnection()
      try {
        const hasAccess = await canUserAccessTask(conn, id, usuario.id, usuario.role)
        if (!hasAccess) {
          return res.status(403).json({ message: "No tienes permiso para modificar esta tarea" })
        }
      } finally {
        conn.release()
      }
    }

    // Validate assignees before transaction
    if (asignado_a_ids !== undefined && Array.isArray(asignado_a_ids)) {
      if (asignado_a_ids.length > 0) {
        const missing = await validateUsers(pool, asignado_a_ids)
        if (missing) {
          return res.status(404).json({ message: `Usuario(s) no encontrado(s): ${missing.join(", ")}` })
        }
      }
    }

    const fields = []
    const values = []

    if (descripcion !== undefined) { fields.push("descripcion = ?"); values.push(descripcion) }
    if (estado !== undefined) {
      fields.push("estado = ?")
      values.push(estado)
      // Set/clear completed_at when estado changes to/from "completada"
      const oldEstado = taskExists[0].estado
      if (estado === "completada" && oldEstado !== "completada") {
        fields.push("completed_at = NOW()")
      } else if (oldEstado === "completada" && estado !== "completada") {
        fields.push("completed_at = NULL")
      }
    }
    if (fecha_limite !== undefined) { fields.push("fecha_limite = ?"); values.push(nullIfEmpty(fecha_limite)) }
    if (plot_id !== undefined) {
      const plotId = nullIfEmpty(plot_id)

      if (plotId !== null && plotId !== undefined) {
        const [plotExists] = await pool.query(
          "SELECT id FROM plots WHERE id = ? AND deleted_at IS NULL",
          [plotId]
        )

        if (plotExists.length === 0) {
          return res.status(404).json({ message: "Parcela no encontrada" })
        }
      }

      fields.push("plot_id = ?")
      values.push(plotId ?? null)
    }

    // If no fields to update AND no assignees to change, reject
    if (fields.length === 0 && asignado_a_ids === undefined) {
      return res.status(400).json({ message: "No hay campos para actualizar" })
    }

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()

      // Update task fields
      if (fields.length > 0) {
        values.push(id)
        await conn.query(`UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`, values)
      }

      // Handle assignees replacement
      if (asignado_a_ids !== undefined) {
        await conn.query("DELETE FROM task_assignees WHERE task_id = ?", [id])
        if (asignado_a_ids.length > 0) {
          await bulkInsertAssignees(conn, id, asignado_a_ids)
        }
      }

      await conn.commit()

      // Re-select with assignees for response
      const task = await reSelectTaskWithAssignees(conn, id)
      res.json(task ?? { message: "Tarea actualizada" })
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al actualizar tarea" })
  }
}

export const deleteTask = async (req, res) => {
  const { id } = req.params
  const { usuario } = req

  try {
    // Ownership guard: non-admin must be assigned to the task
    if (usuario?.role !== "admin") {
      const conn = await pool.getConnection()
      try {
        const hasAccess = await canUserAccessTask(conn, id, usuario.id, usuario.role)
        if (!hasAccess) {
          conn.release()
          return res.status(403).json({ message: "No tienes permiso para eliminar esta tarea" })
        }
      } finally {
        conn.release()
      }
    }

    await pool.query(
      "UPDATE tasks SET deleted_at = NOW() WHERE id = ?",
      [id]
    )

    res.json({ message: "Tarea eliminada" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al eliminar tarea" })
  }
}

export const restoreTask = async (req, res) => {
  const { id } = req.params

  try {
    await pool.query(
      "UPDATE tasks SET deleted_at = NULL WHERE id = ?",
      [id]
    )

    res.json({ message: "Tarea restaurada" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al restaurar tarea" })
  }
}

export const transitionTask = async (req, res) => {
  const { id } = req.params
  const { estado: nuevoEstado } = req.body
  const { usuario } = req

  try {
    if (!nuevoEstado || !ESTADOS.includes(nuevoEstado)) {
      return res.status(400).json({ message: "Estado inválido" })
    }

    // Check task exists and is not soft-deleted
    const [taskRows] = await pool.query(
      "SELECT id, estado FROM tasks WHERE id = ? AND deleted_at IS NULL",
      [id]
    )
    if (taskRows.length === 0) {
      return res.status(404).json({ message: "Tarea no encontrada" })
    }

    const currentEstado = taskRows[0].estado

    // Check user access (admin or assigned)
    const conn = await pool.getConnection()
    try {
      const hasAccess = await canUserAccessTask(conn, id, usuario.id, usuario.role)
      if (!hasAccess) {
        return res.status(403).json({ message: "No tienes permiso para modificar esta tarea" })
      }

      // Validate transition against role matrix
      const roleKey = usuario.role === "enologo" ? "enologo" : usuario.role
      const allowed = TRANSITIONS[roleKey]?.[currentEstado]
      if (!allowed || !allowed.includes(nuevoEstado)) {
        return res.status(400).json({
          message: `Transición no permitida: ${currentEstado} → ${nuevoEstado} para rol ${roleKey}`,
        })
      }

      // Build SET clause
      const setClauses = ["estado = ?"]
      const setValues = [nuevoEstado]

      if (nuevoEstado === "completada") {
        setClauses.push("completed_at = NOW()")
      } else if (currentEstado === "completada") {
        setClauses.push("completed_at = NULL")
      }

      setValues.push(id)
      await conn.query(
        `UPDATE tasks SET ${setClauses.join(", ")} WHERE id = ?`,
        setValues
      )

      const updatedTask = await reSelectTaskWithAssignees(conn, id)
      res.json(updatedTask)
    } finally {
      conn.release()
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al transicionar estado de tarea" })
  }
}
