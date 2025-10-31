import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  lastOrderId: { type: Number, default: 0 }
});

const Counter = mongoose.model("counter", counterSchema);
export default Counter;
