import { Router } from "express"
import { createTask, getTask, getTasks, updateTask, deleteTask, restoreTask, transitionTask } from "../controllers/tasks.controller.js"

const router = Router()

router.post("/createTask", createTask)
router.get("/getTask/:id", getTask)
router.get("/getTasks", getTasks)
router.patch("/updateTask/:id", updateTask)
router.delete("/deleteTask/:id", deleteTask)
router.patch("/restoreTask/:id", restoreTask)
router.post("/transitionTask/:id", transitionTask)

export default router
