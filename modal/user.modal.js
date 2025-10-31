import mongoose from "mongoose";
import AutoIncrementFactory from "mongoose-sequence";

const userSchema = new mongoose.Schema({
  _id: Number,
  name: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  contact: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ["ADMIN", "USER", "GUEST"],
    default: "USER"
  }
}, { _id: false });

const AutoIncrement = AutoIncrementFactory(mongoose.connection);
userSchema.plugin(AutoIncrement, { id: 'user_counter', inc_field: '_id' });

const User = mongoose.model('user', userSchema);
export default User;
