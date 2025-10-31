import {Router} from "express";
import { deleteOrder, getAll, getAllOrdersWithUserDetails, getOrdersByUserId, saveOrder, totalRevenue } from "../controller/order.controller.js";
import { authenticateToken, authorize } from "../middleware/auth.middleware.js";
import { PERMISSIONS } from "../config/permissions.js";

const orderRouter = Router()

// orderRouter.post("/all", authenticateToken, authorizeRoles('user', 'admin'), getAllOrdersWithUserDetails)
// orderRouter.post("/save", authenticateToken, authorizeRoles('user', 'admin'), saveOrder)
// orderRouter.get("/revenue", authenticateToken, authorizeRoles('admin'), totalRevenue)

orderRouter.get("/all", authenticateToken, authorize(PERMISSIONS.ADMINISTRATE), getAll)
orderRouter.get("/byUser", authenticateToken, authorize(PERMISSIONS.READ), getOrdersByUserId)
orderRouter.post("/save", authenticateToken, authorize(PERMISSIONS.CREATE), saveOrder)
orderRouter.get("/revenue", authenticateToken, authorize(PERMISSIONS.ADMINISTRATE), totalRevenue)
orderRouter.delete("/delete/:id", authenticateToken, authorize(PERMISSIONS.ADMINISTRATE), deleteOrder)

export default orderRouter;
