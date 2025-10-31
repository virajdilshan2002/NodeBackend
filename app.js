import dotenv from "dotenv";
import express from 'express'
import cors from "cors";
import { Server } from "socket.io";
import { createClient } from "redis";
import DBConnection from "./db/db.js";

import userRoutes from "./routes/user.routes.js";
import authRoutes from "./routes/auth.routes.js";
import orderRoutes from "./routes/order.routes.js";
import formRoutes from "./routes/form.routes.js";

import User from "./modal/user.modal.js";
import Payment from "./modal/payment.modal.js";
import path from "path";
import { loadUsersToPage } from "./service/user.service.js";


dotenv.config();
const port = process.env.PORT || 3000;
const app = express();

//EJS Setup
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

await DBConnection();

app.use(cors({ origin: "*" }));
app.use(express.json())
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/order", orderRoutes);
app.use("/api/v1/form", formRoutes);

export const io = new Server(4000, {
  cors: {
    origin: "*",
  }
});

const redisPub  = createClient();
const redisSub  = createClient();

await redisPub.connect();
await redisSub.connect();

await redisSub.subscribe("chat", (message) => {
  const data = JSON.parse(message);
  io.to(data.room).emit("chat_message", data);
});

io.on("connection", (socket) => {
  console.log("user connected:", socket.id);

  socket.on("join_room", (room) => {
    socket.join(room);
    console.log(`${socket.id} joined room ${room}`);
  });

  socket.on("send_message", (data) => {
    console.log('message recevied -', data);
    
    redisPub.publish("chat", JSON.stringify(data));
  });

socket.on('get_users', async ({ page, limit, filters }) => {
  try {
    const skip = (page - 1) * limit;
    const query = {};

    if (filters?.name?.value?.trim()) {
      query.name = { $regex: filters.name.value, $options: 'i' };
    }
    if (filters?.email?.value?.trim()) {
      query.email = { $regex: filters.email.value, $options: 'i' };
    }
    if (filters?.contact?.value?.trim()) {
      query.contact = { $regex: filters.contact.value, $options: 'i' };
    }
    if (filters?.role?.value?.trim()) {
      query.role = { $regex: filters.role.value, $options: 'i' };
    }

    const users = await User.find(query).skip(skip).limit(limit);
    const totalRecords = await User.countDocuments(query);

    socket.emit('users_page', { users, totalRecords });
  } catch (err) {
    socket.emit('users_error', { message: err.message });
  }
});

  socket.on("disconnect", () => console.log("user disconnected"));
});

app.post('/api/payment', async (req, res) => {
  const { amount, userId } = req.body;

  const payment = await Payment.create({ amount, status: 'SUCCESS', userId });

  res.render('receipt', { payment });
});

app.listen(port, () => {
  console.log(`server running on port ${port}`)
});