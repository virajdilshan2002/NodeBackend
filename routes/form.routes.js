import { Router } from "express";
import { saveItems } from "../controller/form.controller.js";

const formRouter = Router();
formRouter.post("/save-items", saveItems);

export default formRouter;