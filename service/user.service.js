import User from "../modal/user.modal.js";
import bcrypt from "bcryptjs";
import { sendRegistrationEmail } from "./mail.service.js";
import { updateUser } from "../controller/user.controller.js";

export const register = async (userDto) => {
  try {    
    const existingUser = await User.findOne({ email: userDto.email });

    if (existingUser) {
      return { success: false, message: "User already exists" };
    }

    const user = new User({
      name: userDto.name,
      email: userDto.email,
      contact: userDto.contact,
      role: userDto.role
    });
    user.password = bcrypt.hashSync(userDto.password, 10);
    await user.save();

    sendRegistrationEmail(userDto.email, "User");

    return { success: true , message: "User registered successfully" };
  } catch (error) {
    console.error("Error registering user:", error);
    return { success: false, message: "Error registering user" };
  }
}

export const isExistsUser = async (userId) => {
  try {
    const user = await User.findById(userId);
    console.log(user);
    
    return user !== null;
  } catch (error) {
    console.error("Error checking if user exists:", error);
    return false;
  }
}

export const getUserDetails = async (userId) => {
  try {
    const user = await User.findById(userId);
    return user;
  } catch (error) {
    console.error("Error fetching user details:", error);
    throw error;
  }
}

export const getAllUsers = async () => {
  try {
    const users = await User.find();
    return users;
  } catch (error) {
    console.error("Error fetching all users:", error);
    throw error;
  }
}

export async function loadUsersToPage(skip, limit) {
  try {
      const aggregation = await User.aggregate([
        { $sort: { _id: 1 } },
        { $skip: skip },
        { $limit: limit },
      ]);

      const totalResult = await User.aggregate([
        { $count: "total" },
      ]);

      console.log(aggregation);
      console.log(totalResult);
  } catch (error) {
      console.error("Error loading users to page:", error);
      // throw error;
  }
}

export const deleteUserById = async (userId) => {
  try {
    await User.findByIdAndDelete(userId);
    return { success: true, message: "User deleted successfully" };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { success: false, message: "Error deleting user" };
  }
};

export const update = async (userData) => {
  try {
    const user = await User.findById(userData._id);
    console.log(user);
    
    if (!user) {
      return { success: false, message: "User not found" };
    }
    user.role = userData.role;
    user.email = userData.email;
    await user.save();
    return { success: true, message: "User updated successfully" };
  } catch (error) {
    console.error("Error updating user:", error);
    return { success: false, message: "Error updating user" };
  }
}