import {Router} from "express";
import { deleteUser, getAll, registerUser, updateUser } from "../controller/user.controller.js";
import { authenticateToken, authorize } from "../middleware/auth.middleware.js";
import { PERMISSIONS } from "../config/permissions.js";

const userRouter = Router()

userRouter.post("/register", registerUser)
userRouter.get("/all", authenticateToken, authorize(PERMISSIONS.ADMINISTRATE), getAll)
userRouter.put("/update", authenticateToken, authorize(PERMISSIONS.ADMINISTRATE), updateUser)
userRouter.delete("/delete/:id", authenticateToken, authorize(PERMISSIONS.ADMINISTRATE), deleteUser)

export default userRouter;
