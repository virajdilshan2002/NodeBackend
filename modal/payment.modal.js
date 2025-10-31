import mongoose from "mongoose";
import AutoIncrementFactory from "mongoose-sequence";

const paymentSchema = new mongoose.Schema({
    _id: Number,
    amount: Number,
    status: String,
    userId: { type: Number, ref: "user" }
});

const AutoIncrement = AutoIncrementFactory(mongoose.connection);
paymentSchema.plugin(AutoIncrement, { id: 'payment_counter', inc_field: '_id' });

const Payment = mongoose.model("payment", paymentSchema);
export default Payment;