import * as orderService from "../service/order.service.js";
import { OrderDTO } from "../dto/order.dto.js";
import { getUserDetails } from "../service/user.service.js";

export async function saveOrder(req, res) {
    const { item, price, userId } = req.body;
    const orderDto = new OrderDTO({ item, price, userId });

    try {
        const order = await orderService.createOrder(orderDto);
        res.status(201).send({ message: "Order created successfully", order: new OrderDTO(order) });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
}

export async function getAllOrdersWithUserDetails(req, res) {
    try {
        const orders = await orderService.getAllOrdersByPopulateUserId();
        res.status(200).send(orders.map(order => new OrderDTO(order)));
    } catch (error) {
        res.status(500).send({ error: "Failed to retrieve orders" });
    }
}

export function getOrdersByUserId(req, res) {
  const userId = req.body.userId;

  return new Promise((resolve, reject) => {
    getUserDetails(userId)
      .then(user => {
        if (!user) {
          res.status(404).json({ error: "User not found" });
          return reject(new Error("User not found"));
        }

        orderService.getOrders(user._id)
          .then(orders => {
            res.status(200).json({ orders }); 
            resolve(orders);
          })
          .catch(err => {
            res.status(500).json({ error: err.message });
            reject(err);
          });
      })
      .catch(err => {
        res.status(500).json({ error: err.message });
        reject(err);
      });
  });
}

export async function totalRevenue(req, res) {
    const userId = req.body.userId;
    console.log(userId);
    
    const data = await orderService.TotalRevenue(userId);
    if (data && data.length > 0) {
        res.status(200).send(data[0]);
    } else {
        res.status(200).send({ totalOrders: 0, totalRevenue: 0 });
    }
}

export async function getAll(req, res) {
  try {
    const orders = await orderService.getAll();
    return res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching all orders:", error);
    return res.status(500).json({ error: "Failed to retrieve orders" });
  }
}

export async function deleteOrder(req, res) {
    const orderId = req.params.id;

    console.log(orderId);
    
    try {
        const result = await orderService.deleteOrderById(orderId);
        if (result.success) {
            res.status(200).send({ message: result.message });
        } else {
            res.status(500).send({ error: result.message });
        }
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
}
