import Order from "../modal/order.modal.js";
import mongoose from "mongoose";
import { getUserDetails, isExistsUser } from "./user.service.js";
import { sendOrderConfirmationEmail } from "./mail.service.js";
import { generateOrderPDF } from "./pdf.service.js";

export const createOrder = async (orderDto) => {
    try {
        const order = new Order({
            item: orderDto.item,
            price: orderDto.price,
            userId: orderDto.userId
        });
        
        const user = await getUserDetails(orderDto.userId);

        if (user) {
            await order.save();
            const pdfPath = await generateOrderPDF(order, user);
            // await sendOrderConfirmationEmail(user.email, pdfPath);
            return order;
        } else {
            throw new Error("User does not exist");
        }
    } catch (error) {
        console.error("Error creating order:", error);
        throw error;
    }
}

export const getAllOrdersByPopulateUserId = async () => {
    try {
        const orders =  await Order.find().populate('userId');
        console.log(JSON.stringify(orders));
        return orders;
    } catch (error) {
        console.error("Error fetching orders with user details:", error);
        throw error;
    }
}

export const TotalRevenue = async (userId) => {
    const data = await Order.aggregate([
        {
            $match: { userId: new mongoose.Types.ObjectId(userId) }
        },
        {
            $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: "$price" }
            }
        }
    ]);
    return data;
}

export const getAll = async () => {
    try {
        const orders = await Order.find();
        return orders;
    } catch (error) {
        console.error("Error fetching all orders:", error);
        throw error;
    }
}

export const deleteOrderById = async (orderId) => {
    try {
        await Order.findByIdAndDelete(orderId);
        return { success: true, message: "Order deleted successfully" };
    } catch (error) {
        console.error("Error deleting order:", error);
        return { success: false, message: "Error deleting order" };
    }
}