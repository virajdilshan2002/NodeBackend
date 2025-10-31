import mongoose from "mongoose";
import Counter from "./counter.modal.js";

const orderSchema = new mongoose.Schema({
  _id: Number,
  orderId: String,
  item: String,
  price: Number,
  userId: { type: Number, ref: "user" },
  createdAt: { type: Date, default: Date.now }
});

orderSchema.pre("save", async function (next) {
  if (this.isNew && !this.orderId) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { key: "order" },
        { $inc: { lastOrderId: 1 } },
        { new: true, upsert: true }
      );

      this._id = counter.lastOrderId;
      this.orderId = `OD${counter.lastOrderId}`;
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

const Order = mongoose.model("order", orderSchema);
export default Order;