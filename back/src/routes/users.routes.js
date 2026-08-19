import { Router } from "express"
import { createUser, getUsers, getMe, getUser, updateUser, deleteUser, restoreUser, getActiveUsers } from "../controllers/users.controller.js"

const router = Router()

router.post("/createUser", createUser)
router.get("/getUsers", getUsers)
router.get("/active", getActiveUsers)
router.get("/me", getMe)
router.get("/getUser/:id", getUser)
router.patch("/updateUser/:id", updateUser)
router.delete("/deleteUser/:id", deleteUser)
router.patch("/restoreUser/:id", restoreUser)

export default router
