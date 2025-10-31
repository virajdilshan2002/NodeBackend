import { UserjoiSchema } from "../dto/user.dto.js";
import * as userService from "../service/user.service.js";

export async function registerUser(req, res) {
  try {
    const { error, value } = UserjoiSchema.validate(req.body);
    if (error) {
      return res.status(400).json(error.details[0].message);
    }
    
    const result = await userService.register(value);

    if (result.success) {
      return res.status(201).json({ message: "User registered successfully" });
    } else {
      return res.status(500).json({ error: result.message });
    }

  } catch (err) {
    console.error("Error in registerUser:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getAll(req, res) {
  try {
    const users = await userService.getAllUsers();
    return res.status(200).json(users);
  } catch (err) {
    console.error("Error in getAll:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteUser(req, res) {
  const userId = req.params.id;
  
  const result = await userService.deleteUserById(userId);
  
  if (result.success) {
    return res.status(200).json({ message: result.message });
  } else {
    return res.status(500).json({ error: result.message });
  }
}

export async function updateUser(req, res) {
  const userData = req.body;  

  const result = await userService.update(userData);

  if (result.success) {
    return res.status(200).json({ message: result.message });
  } else {
    return res.status(500).json({ error: result.message });
  }
}
