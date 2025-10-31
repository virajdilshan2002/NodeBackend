import { Router } from "express";
import { authenticateUser } from "../controller/auth.controller.js";

const authRouter = Router();
authRouter.post("/login", authenticateUser);

export default authRouter;