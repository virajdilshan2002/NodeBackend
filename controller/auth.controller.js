import * as authService from "../service/auth.service.js";
import { LoginDto } from "../dto/user.dto.js";

export async function authenticateUser(req, res) {
    const { email, password } = req.body;
    const loginDto = new LoginDto({ email, password });
    const result = await authService.authenticate(loginDto);
    if (result) {
      res.status(200).send({ message: "User authenticated successfully", result });
    } else {
      res.status(401).send({ error: "Invalid email or password" });
    }
}